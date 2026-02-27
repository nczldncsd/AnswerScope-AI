"""
AnswerScope AI - Analysis Routes
Flask blueprint for running analysis pipeline.
Returns JSON only. No HTML templates.
"""

import json
import threading
import uuid

from flask import Blueprint, g, jsonify, request, session

from backend.modules.analysis import (
    capture_screenshot,
    generate_screenshot_path,
    run_analysis_pipeline,
)
from backend.modules.brand import get_brand_profile_by_user
from backend.modules.database import get_db_connection
from backend.modules.logger import get_logger
from backend.modules.utils import is_valid_url

analysis_bp = Blueprint("analysis_bp", __name__)
logger = get_logger(__name__)


def _error(message, code, status):
    return (
        jsonify(
            {
                "success": False,
                "error": {
                    "code": code,
                    "message": message,
                    "request_id": g.get("request_id"),
                },
            }
        ),
        status,
    )


def _parse_brand_competitors(brand_profile):
    raw = brand_profile.get("competitors")
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return []
    return []


def _parse_brand_category(brand_profile):
    category = (brand_profile.get("brand_category") or "generic").strip().lower()
    if category not in {"generic", "ecommerce", "saas", "local"}:
        return "generic"
    return category


def _enrich_response_payload(payload):
    analysis = payload.get("analysis", {}) if isinstance(payload, dict) else {}
    payload["citation_authority"] = payload.get(
        "citation_authority", payload.get("trust_score", 0)
    )
    payload["analysis_language"] = payload.get(
        "analysis_language", analysis.get("language", "en")
    )
    payload["charts"] = payload.get("charts", analysis.get("charts", {}))
    payload["market_intel"] = payload.get(
        "market_intel", analysis.get("market_intel", {})
    )
    payload["gap_analysis"] = payload.get(
        "gap_analysis", analysis.get("gap_analysis", {})
    )
    payload["technical_audit"] = payload.get(
        "technical_audit", analysis.get("technical_audit", [])
    )
    payload["action_plan"] = payload.get(
        "action_plan", analysis.get("action_plan", [])
    )
    payload["recommended_playbook"] = payload.get(
        "recommended_playbook", analysis.get("recommended_playbook", [])
    )
    return payload


def _create_job(user_id, scan_context_id, est_duration_sec):
    job_id = uuid.uuid4().hex
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO analysis_jobs (
            job_id, user_id, scan_context_id, est_duration_sec, status, stage_label, progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (job_id, user_id, scan_context_id, est_duration_sec, "queued", "Queued", 0),
    )
    conn.commit()
    conn.close()
    return job_id


def _update_job(job_id, **fields):
    if not fields:
        return

    allowed = {
        "status",
        "stage_label",
        "progress",
        "screenshot_url",
        "captured_at",
        "dom_loaded_ms",
        "overview_source_type",
        "overview_fetch_mode",
        "extraction_method",
        "error",
        "result_json",
    }

    updates = []
    values = []
    for key, value in fields.items():
        if key in allowed:
            updates.append(f"{key} = ?")
            values.append(value)

    if not updates:
        return

    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.append(job_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE analysis_jobs SET {', '.join(updates)} WHERE job_id = ?",
        values,
    )
    conn.commit()
    conn.close()


def _get_job(job_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analysis_jobs WHERE job_id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def _append_run_event(job_id, event_type, stage_label, details=None, scan_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO scan_run_events (job_id, scan_id, event_type, stage_label, details_json)
        VALUES (?, ?, ?, ?, ?)
        """,
        (job_id, scan_id, event_type, stage_label, json.dumps(details or {})),
    )
    conn.commit()
    conn.close()


def _insert_metric_row(
    cursor,
    scan_id,
    brand_profile_id,
    keyword,
    metric_key,
    metric_value,
    platform,
    competitor_domain=None,
):
    cursor.execute(
        """
        INSERT INTO scan_metrics (
            scan_id, brand_profile_id, keyword, metric_key, metric_value, platform, competitor_domain
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            scan_id,
            brand_profile_id,
            keyword,
            metric_key,
            float(metric_value or 0),
            platform,
            competitor_domain,
        ),
    )


def _persist_scan_artifacts(cursor, scan_id, brand_profile_id, keyword, analysis_result):
    analysis = analysis_result.get("analysis", {})
    scores = analysis.get("scores", {}) if isinstance(analysis, dict) else {}
    visibility = scores.get("visibility", analysis.get("visibility", 0))
    content = scores.get("content", analysis.get("content", 0))
    technical = scores.get("technical", analysis.get("technical", 0))
    visual = scores.get("visual", analysis.get("visual", 0))
    sentiment = analysis.get("sentiment", {}) if isinstance(analysis, dict) else {}
    sentiment_label = str(sentiment.get("label") or "neutral").strip().lower()
    try:
        sentiment_score = float(sentiment.get("score", 0) or 0)
    except Exception:
        sentiment_score = 0.0
    try:
        citation_authority = float(
            analysis_result.get("citation_authority", analysis_result.get("trust_score", 0))
            or 0
        )
    except Exception:
        citation_authority = 0.0

    platform = analysis_result.get("overview_source_type", "google")
    _insert_metric_row(
        cursor,
        scan_id,
        brand_profile_id,
        keyword,
        "visibility_score",
        visibility,
        platform,
    )
    _insert_metric_row(
        cursor,
        scan_id,
        brand_profile_id,
        keyword,
        "content_score",
        content,
        platform,
    )
    _insert_metric_row(
        cursor,
        scan_id,
        brand_profile_id,
        keyword,
        "technical_score",
        technical,
        platform,
    )
    _insert_metric_row(
        cursor,
        scan_id,
        brand_profile_id,
        keyword,
        "visual_score",
        visual,
        platform,
    )
    _insert_metric_row(
        cursor,
        scan_id,
        brand_profile_id,
        keyword,
        "share_of_voice",
        visibility,
        platform,
    )
    _insert_metric_row(
        cursor,
        scan_id,
        brand_profile_id,
        keyword,
        "citation_authority",
        citation_authority,
        platform,
    )
    _insert_metric_row(
        cursor,
        scan_id,
        brand_profile_id,
        keyword,
        "sentiment_score",
        sentiment_score,
        platform,
    )

    competitor_domains = analysis_result.get("competitor_domains", [])
    for domain in competitor_domains:
        _insert_metric_row(
            cursor,
            scan_id,
            brand_profile_id,
            keyword,
            "competitor_presence_score",
            0,
            platform,
            competitor_domain=domain,
        )

    for citation in analysis_result.get("citations", []):
        if not isinstance(citation, dict):
            continue
        cursor.execute(
            """
            INSERT INTO scan_citations (
                scan_id, brand_profile_id, keyword, citation_domain, citation_url, position, source_model
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_id,
                brand_profile_id,
                keyword,
                citation.get("domain"),
                citation.get("url"),
                citation.get("position"),
                platform,
            ),
        )

    brand_mentioned = 1 if float(visibility or 0) > 0 else 0
    cursor.execute(
        """
        INSERT INTO prompt_observations (
            scan_id, brand_profile_id, keyword, prompt_text, platform, brand_mentioned, rank_slot, sentiment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            scan_id,
            brand_profile_id,
            keyword,
            keyword,
            platform,
            brand_mentioned,
            None,
            sentiment_label,
        ),
    )


def save_scan_result(brand_profile_id, keyword, analysis_result, screenshot_url=None):
    """
    Save scan result to database.
    Called after analysis pipeline completes.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        breakdown_json = json.dumps(analysis_result.get("analysis", {}))
        raw_report_json = json.dumps(analysis_result)

        cursor.execute(
            """
            INSERT INTO scan_results (
                brand_profile_id, keyword, las_score, trust_score, breakdown_json, raw_report_json, screenshot_url,
                overview_source_type, overview_fetch_mode, overview_confidence, extraction_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                brand_profile_id,
                keyword,
                analysis_result.get("las_score", 0),
                analysis_result.get("trust_score", 0),
                breakdown_json,
                raw_report_json,
                screenshot_url,
                analysis_result.get("overview_source_type"),
                analysis_result.get("overview_fetch_mode"),
                analysis_result.get("overview_confidence"),
                analysis_result.get("extraction_method"),
            ),
        )
        scan_id = cursor.lastrowid
        _persist_scan_artifacts(cursor, scan_id, brand_profile_id, keyword, analysis_result)
        conn.commit()
        return scan_id
    except Exception:
        logger.exception("Error saving scan result")
        return None
    finally:
        conn.close()


@analysis_bp.route("/api/run-analysis", methods=["POST"])
def run_analysis():
    """
    Run complete analysis pipeline.
    Returns full analysis JSON.
    """
    data = request.get_json() or request.form
    user_id = session.get("user_id")
    if not user_id:
        return _error("Authentication required", "unauthorized", 401)

    required_fields = ["keyword", "url"]
    for field in required_fields:
        if field not in data:
            return _error(f"Missing required field: {field}", "validation_error", 400)

    keyword = data["keyword"].strip()
    url = data["url"].strip()
    if not keyword or len(keyword) > 200:
        return _error("Invalid keyword", "validation_error", 400)
    if not is_valid_url(url):
        return _error("Invalid URL", "validation_error", 400)

    brand_profile = get_brand_profile_by_user(user_id)
    if not brand_profile:
        return _error(
            "No brand profile found for this user. Please create a brand profile first.",
            "not_found",
            404,
        )

    brand_profile_id = brand_profile["id"]
    competitor_domains = _parse_brand_competitors(brand_profile)
    brand_category = _parse_brand_category(brand_profile)
    brand_context = {
        "brand_name": brand_profile.get("brand_name", ""),
        "competitors": competitor_domains,
        "brand_category": brand_category,
    }

    try:
        analysis_result = run_analysis_pipeline(keyword, url, brand_context=brand_context)
        analysis_result["competitor_domains"] = competitor_domains
        analysis_result = _enrich_response_payload(analysis_result)

        scan_id = save_scan_result(brand_profile_id, keyword, analysis_result)
        if not scan_id:
            return _error(
                "Failed to save analysis results to database", "internal_error", 500
            )

        analysis_result["scan_id"] = scan_id
        analysis_result["brand_profile_id"] = brand_profile_id
        analysis_result["success"] = True
        return jsonify(analysis_result)
    except Exception as e:
        return _error(f"Analysis failed: {str(e)}", "internal_error", 500)


@analysis_bp.route("/api/run-analysis-async", methods=["POST"])
def run_analysis_async():
    """
    Run analysis pipeline asynchronously.
    Returns job_id immediately; client can poll status.
    """
    data = request.get_json() or request.form
    user_id = session.get("user_id")
    if not user_id:
        return _error("Authentication required", "unauthorized", 401)

    required_fields = ["keyword", "url"]
    for field in required_fields:
        if field not in data:
            return _error(f"Missing required field: {field}", "validation_error", 400)

    keyword = data["keyword"].strip()
    url = data["url"].strip()
    if not keyword or len(keyword) > 200:
        return _error("Invalid keyword", "validation_error", 400)
    if not is_valid_url(url):
        return _error("Invalid URL", "validation_error", 400)

    brand_profile = get_brand_profile_by_user(user_id)
    if not brand_profile:
        return _error(
            "No brand profile found for this user. Please create a brand profile first.",
            "not_found",
            404,
        )

    brand_profile_id = brand_profile["id"]
    competitor_domains = _parse_brand_competitors(brand_profile)
    brand_category = _parse_brand_category(brand_profile)
    brand_context = {
        "brand_name": brand_profile.get("brand_name", ""),
        "competitors": competitor_domains,
        "brand_category": brand_category,
    }

    screenshot_path, screenshot_url = generate_screenshot_path()
    scan_context_id = uuid.uuid4().hex
    est_duration_sec = 45
    job_id = _create_job(user_id, scan_context_id, est_duration_sec)
    _append_run_event(job_id, "queued", "Queued", {"keyword": keyword, "url": url})

    def _worker():
        persisted_screenshot_url = None
        _update_job(job_id, status="running", stage_label="Initializing", progress=5)
        _append_run_event(job_id, "running", "Initializing")

        _update_job(
            job_id,
            status="capturing_screenshot",
            stage_label="Capturing page snapshot",
            progress=10,
        )
        _append_run_event(job_id, "capturing_screenshot", "Capturing page snapshot")
        shot_result = capture_screenshot(url, screenshot_path)
        if shot_result.get("success"):
            persisted_screenshot_url = screenshot_url
            _update_job(
                job_id,
                status="screenshot_ready",
                stage_label="Snapshot captured",
                progress=30,
                screenshot_url=screenshot_url,
                captured_at=shot_result.get("captured_at"),
                dom_loaded_ms=shot_result.get("dom_loaded_ms"),
            )
            _append_run_event(
                job_id,
                "screenshot_ready",
                "Snapshot captured",
                {
                    "screenshot_url": screenshot_url,
                    "captured_at": shot_result.get("captured_at"),
                    "dom_loaded_ms": shot_result.get("dom_loaded_ms"),
                },
            )
        else:
            _update_job(
                job_id,
                status="screenshot_failed",
                stage_label="Snapshot failed",
                progress=30,
            )
            _append_run_event(job_id, "screenshot_failed", "Snapshot failed")

        _update_job(job_id, status="analyzing", stage_label="Running strategic audit", progress=55)
        _append_run_event(job_id, "analyzing", "Running strategic audit")

        try:
            analysis_result = run_analysis_pipeline(keyword, url, brand_context=brand_context)
            analysis_result["competitor_domains"] = competitor_domains
            analysis_result = _enrich_response_payload(analysis_result)
            scan_id = save_scan_result(
                brand_profile_id,
                keyword,
                analysis_result,
                screenshot_url=persisted_screenshot_url,
            )
            if scan_id:
                analysis_result["scan_id"] = scan_id
                analysis_result["brand_profile_id"] = brand_profile_id
                analysis_result["success"] = True

            _update_job(
                job_id,
                status="completed",
                stage_label="Completed",
                progress=100,
                overview_source_type=analysis_result.get("overview_source_type"),
                overview_fetch_mode=analysis_result.get("overview_fetch_mode"),
                extraction_method=analysis_result.get("extraction_method"),
                result_json=json.dumps(analysis_result),
            )
            _append_run_event(
                job_id,
                "completed",
                "Completed",
                {
                    "overview_source_type": analysis_result.get("overview_source_type"),
                    "overview_fetch_mode": analysis_result.get("overview_fetch_mode"),
                    "extraction_method": analysis_result.get("extraction_method"),
                },
                scan_id=analysis_result.get("scan_id"),
            )
        except Exception as e:
            _update_job(
                job_id,
                status="failed",
                stage_label="Failed",
                progress=100,
                error=str(e),
            )
            _append_run_event(job_id, "failed", "Failed", {"error": str(e)})

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()

    return jsonify(
        {
            "success": True,
            "job_id": job_id,
            "scan_context_id": scan_context_id,
            "est_duration_sec": est_duration_sec,
            "status": "queued",
        }
    )


@analysis_bp.route("/api/analysis-status/<job_id>", methods=["GET"])
def analysis_status(job_id):
    user_id = session.get("user_id")
    if not user_id:
        return _error("Authentication required", "unauthorized", 401)

    job = _get_job(job_id)
    if not job:
        return _error("Job not found", "not_found", 404)
    if int(job.get("user_id", 0)) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    response = {
        "success": True,
        "job_id": job_id,
        "scan_context_id": job.get("scan_context_id"),
        "est_duration_sec": job.get("est_duration_sec"),
        "status": job.get("status"),
        "stage_label": job.get("stage_label"),
        "progress": job.get("progress"),
        "screenshot_url": job.get("screenshot_url"),
        "captured_at": job.get("captured_at"),
        "dom_loaded_ms": job.get("dom_loaded_ms"),
        "overview_source_type": job.get("overview_source_type"),
        "overview_fetch_mode": job.get("overview_fetch_mode"),
        "extraction_method": job.get("extraction_method"),
        "error": job.get("error"),
    }

    if job.get("status") == "completed":
        result_json = job.get("result_json")
        try:
            response["result"] = json.loads(result_json) if result_json else None
        except Exception:
            response["result"] = None

    return jsonify(response)
