# dashboard_routes.py
"""
AnswerScope AI - Dashboard Routes
Flask blueprint for dashboard and history endpoints.
Returns JSON only. No HTML templates.
"""

import json
import os
from datetime import datetime, timedelta
from io import BytesIO

from flask import Blueprint, jsonify, session, g, send_file
from backend.modules.database import get_db_connection

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
except Exception:  # pragma: no cover - optional at runtime
    canvas = None
    A4 = None
    mm = None
    colors = None
    ImageReader = None

dashboard_bp = Blueprint("dashboard_bp", __name__)


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


def _parse_window_days(window):
    mapping = {
        "7d": 7,
        "14d": 14,
        "30d": 30,
        "60d": 60,
        "90d": 90,
    }
    return mapping.get((window or "30d").lower(), 30)


def _require_user():
    user_id = session.get("user_id")
    if not user_id:
        return None, _error("Authentication required", "unauthorized", 401)
    return int(user_id), None


def _latest_brand_profile_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM brand_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        (user_id,),
    )
    row = cursor.fetchone()
    conn.close()
    return row["id"] if row else None


@dashboard_bp.route("/api/dashboard/scan-history/<int:user_id>", methods=["GET"])
def get_scan_history(user_id):
    """
    Get scan history for a user.
    Returns list of recent scans with basic info.
    """
    session_user_id, err = _require_user()
    if err:
        return err
    if int(session_user_id) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    brand_profile_id = _latest_brand_profile_id(user_id)
    if not brand_profile_id:
        return _error("No brand profile found for this user", "not_found", 404)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, keyword, timestamp, las_score, trust_score,
               screenshot_url, overview_source_type, overview_fetch_mode, extraction_method
        FROM scan_results
        WHERE brand_profile_id = ?
        ORDER BY timestamp DESC
        LIMIT 20
        """,
        (brand_profile_id,),
    )
    scans = cursor.fetchall()
    conn.close()

    scan_list = []
    for scan in scans:
        scan_list.append(
            {
                "scan_id": scan["id"],
                "keyword": scan["keyword"],
                "timestamp": scan["timestamp"],
                "las_score": scan["las_score"],
                "trust_score": scan["trust_score"],
                "citation_authority": scan["trust_score"],
                "screenshot_url": scan["screenshot_url"],
                "overview_source_type": scan["overview_source_type"],
                "overview_fetch_mode": scan["overview_fetch_mode"],
                "extraction_method": scan["extraction_method"],
            }
        )

    return jsonify(
        {
            "success": True,
            "total_scans": len(scan_list),
            "scans": scan_list,
        }
    )


@dashboard_bp.route("/api/dashboard/scan-result/<int:scan_id>", methods=["GET"])
def get_scan_result(scan_id):
    """
    Get detailed scan result by ID.
    Returns full analysis data.
    """
    session_user_id, err = _require_user()
    if err:
        return err

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT sr.*
        FROM scan_results sr
        JOIN brand_profiles bp ON bp.id = sr.brand_profile_id
        WHERE sr.id = ? AND bp.user_id = ?
        LIMIT 1
        """,
        (scan_id, session_user_id),
    )
    scan = cursor.fetchone()
    conn.close()

    if not scan:
        return _error("Scan result not found", "not_found", 404)

    breakdown = json.loads(scan["breakdown_json"]) if scan["breakdown_json"] else {}
    raw_report = json.loads(scan["raw_report_json"]) if scan["raw_report_json"] else {}

    return jsonify(
        {
            "success": True,
            "scan_id": scan["id"],
            "brand_profile_id": scan["brand_profile_id"],
            "keyword": scan["keyword"],
            "timestamp": scan["timestamp"],
            "las_score": scan["las_score"],
            "trust_score": scan["trust_score"],
            "citation_authority": scan["trust_score"],
            "screenshot_url": scan["screenshot_url"],
            "overview_source_type": scan["overview_source_type"],
            "overview_fetch_mode": scan["overview_fetch_mode"],
            "overview_confidence": scan["overview_confidence"],
            "extraction_method": scan["extraction_method"],
            "breakdown": breakdown,
            "full_report": raw_report,
        }
    )


@dashboard_bp.route("/api/dashboard/stats/<int:user_id>", methods=["GET"])
def get_user_stats(user_id):
    """
    Get user statistics.
    Returns average scores, total scans, etc.
    """
    session_user_id, err = _require_user()
    if err:
        return err
    if int(session_user_id) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    brand_profile_id = _latest_brand_profile_id(user_id)
    if not brand_profile_id:
        return _error("No brand profile found for this user", "not_found", 404)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT COUNT(*) as total_scans,
               AVG(las_score) as avg_las,
               AVG(trust_score) as avg_trust,
               MAX(timestamp) as last_scan
        FROM scan_results
        WHERE brand_profile_id = ?
        """,
        (brand_profile_id,),
    )
    stats = cursor.fetchone()
    conn.close()

    return jsonify(
        {
            "success": True,
            "stats": {
                "total_scans": stats["total_scans"] or 0,
                "avg_las_score": round(float(stats["avg_las"] or 0), 2),
                "avg_trust_score": round(float(stats["avg_trust"] or 0), 2),
                "avg_citation_authority": round(float(stats["avg_trust"] or 0), 2),
                "last_scan": stats["last_scan"],
            },
        }
    )


@dashboard_bp.route("/api/dashboard/insights/<int:user_id>", methods=["GET"])
def get_dashboard_insights(user_id):
    """
    Surface stored scan artifacts that are not prominent in the default dashboard.
    """
    session_user_id, err = _require_user()
    if err:
        return err
    if int(session_user_id) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    brand_profile_id = _latest_brand_profile_id(user_id)
    if not brand_profile_id:
        return _error("No brand profile found for this user", "not_found", 404)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, keyword, timestamp, screenshot_url, overview_source_type,
               overview_fetch_mode, overview_confidence, extraction_method,
               raw_report_json, breakdown_json
        FROM scan_results
        WHERE brand_profile_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
        """,
        (brand_profile_id,),
    )
    latest_scan = cursor.fetchone()

    if not latest_scan:
        conn.close()
        return jsonify({"success": True, "insights": None})

    scan_id = latest_scan["id"]
    cursor.execute(
        "SELECT COUNT(*) AS total FROM scan_citations WHERE scan_id = ?",
        (scan_id,),
    )
    citation_total = int((cursor.fetchone() or {"total": 0})["total"] or 0)

    cursor.execute(
        "SELECT COUNT(*) AS total FROM prompt_observations WHERE scan_id = ?",
        (scan_id,),
    )
    prompt_total = int((cursor.fetchone() or {"total": 0})["total"] or 0)

    cursor.execute(
        "SELECT COUNT(*) AS total FROM scan_run_events WHERE scan_id = ?",
        (scan_id,),
    )
    event_total = int((cursor.fetchone() or {"total": 0})["total"] or 0)

    cursor.execute(
        "SELECT COUNT(*) AS total FROM scan_metrics WHERE scan_id = ?",
        (scan_id,),
    )
    metric_total = int((cursor.fetchone() or {"total": 0})["total"] or 0)

    cursor.execute(
        """
        SELECT COUNT(DISTINCT competitor_domain) AS total
        FROM scan_metrics
        WHERE scan_id = ? AND competitor_domain IS NOT NULL AND TRIM(competitor_domain) != ''
        """,
        (scan_id,),
    )
    competitor_domain_total = int((cursor.fetchone() or {"total": 0})["total"] or 0)
    conn.close()

    report = json.loads(latest_scan["raw_report_json"]) if latest_scan["raw_report_json"] else {}
    analysis = report.get("analysis", {}) if isinstance(report, dict) else {}

    action_plan = analysis.get("action_plan", []) if isinstance(analysis, dict) else []
    if not isinstance(action_plan, list) or not action_plan:
        action_plan = analysis.get("actions", []) if isinstance(analysis, dict) else []
    technical_audit = analysis.get("technical_audit", []) if isinstance(analysis, dict) else []
    diagnostics = analysis.get("diagnostics", []) if isinstance(analysis, dict) else []
    executive_summary = analysis.get("executive_summary", []) if isinstance(analysis, dict) else []

    return jsonify(
        {
            "success": True,
            "insights": {
                "scan_id": scan_id,
                "keyword": latest_scan["keyword"],
                "timestamp": latest_scan["timestamp"],
                "screenshot_captured": bool(latest_scan["screenshot_url"]),
                "overview_source_type": latest_scan["overview_source_type"],
                "overview_fetch_mode": latest_scan["overview_fetch_mode"],
                "overview_confidence": latest_scan["overview_confidence"],
                "extraction_method": latest_scan["extraction_method"],
                "stored_records": {
                    "scan_metrics": metric_total,
                    "scan_citations": citation_total,
                    "prompt_observations": prompt_total,
                    "scan_run_events": event_total,
                    "competitor_domains": competitor_domain_total,
                },
                "analysis_artifacts": {
                    "action_plan_items": len(action_plan) if isinstance(action_plan, list) else 0,
                    "technical_audit_items": len(technical_audit)
                    if isinstance(technical_audit, list)
                    else 0,
                    "diagnostics_items": len(diagnostics) if isinstance(diagnostics, list) else 0,
                    "executive_summary_items": len(executive_summary)
                    if isinstance(executive_summary, list)
                    else 0,
                },
                "raw_report_present": bool(latest_scan["raw_report_json"]),
                "breakdown_present": bool(latest_scan["breakdown_json"]),
            },
        }
    )


@dashboard_bp.route("/api/dashboard/trends/<int:user_id>", methods=["GET"])
def get_trends(user_id):
    """
    Get trend data for a metric across time.
    Query params:
    - metric: metric_key (default: share_of_voice)
    - window: 7d|14d|30d|60d|90d (default: 30d)
    """
    from flask import request

    session_user_id, err = _require_user()
    if err:
        return err
    if int(session_user_id) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    metric = (request.args.get("metric") or "share_of_voice").strip()
    window = request.args.get("window") or "30d"
    days = _parse_window_days(window)
    start_time = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    brand_profile_id = _latest_brand_profile_id(user_id)
    if not brand_profile_id:
        return _error("No brand profile found for this user", "not_found", 404)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT recorded_at, AVG(metric_value) as value
        FROM scan_metrics
        WHERE brand_profile_id = ?
          AND metric_key = ?
          AND recorded_at >= ?
        GROUP BY recorded_at
        ORDER BY recorded_at ASC
        """,
        (brand_profile_id, metric, start_time),
    )
    points = cursor.fetchall()
    conn.close()

    return jsonify(
        {
            "success": True,
            "metric": metric,
            "window": window,
            "points": [
                {"recorded_at": p["recorded_at"], "value": round(float(p["value"] or 0), 3)}
                for p in points
            ],
        }
    )


@dashboard_bp.route("/api/dashboard/pillar-averages/<int:user_id>", methods=["GET"])
def get_pillar_averages(user_id):
    """
    Return averaged pillar scores across all scans for the user's latest brand profile.
    """
    session_user_id, err = _require_user()
    if err:
        return err
    if int(session_user_id) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    brand_profile_id = _latest_brand_profile_id(user_id)
    if not brand_profile_id:
        return _error("No brand profile found for this user", "not_found", 404)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT metric_key, AVG(metric_value) AS avg_value
        FROM scan_metrics
        WHERE brand_profile_id = ?
          AND metric_key IN ('visibility_score', 'content_score', 'technical_score', 'visual_score')
        GROUP BY metric_key
        """,
        (brand_profile_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    averages = {
        "visibility": 0.0,
        "content": 0.0,
        "technical": 0.0,
        "visual": 0.0,
    }
    mapping = {
        "visibility_score": "visibility",
        "content_score": "content",
        "technical_score": "technical",
        "visual_score": "visual",
    }
    for row in rows:
        key = mapping.get(row["metric_key"])
        if key:
            averages[key] = round(float(row["avg_value"] or 0), 2)

    return jsonify(
        {
            "success": True,
            "pillar_averages": averages,
        }
    )


@dashboard_bp.route("/api/dashboard/citations/<int:user_id>", methods=["GET"])
def get_citations(user_id):
    """
    Get citation authority/share by domain over a time window.
    Query params:
    - window: 7d|14d|30d|60d|90d (default: 30d)
    """
    from flask import request

    session_user_id, err = _require_user()
    if err:
        return err
    if int(session_user_id) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    window = request.args.get("window") or "30d"
    days = _parse_window_days(window)
    start_time = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    brand_profile_id = _latest_brand_profile_id(user_id)
    if not brand_profile_id:
        return _error("No brand profile found for this user", "not_found", 404)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT citation_domain, COUNT(*) as mentions
        FROM scan_citations
        WHERE brand_profile_id = ?
          AND recorded_at >= ?
        GROUP BY citation_domain
        ORDER BY mentions DESC
        LIMIT 50
        """,
        (brand_profile_id, start_time),
    )
    rows = cursor.fetchall()
    conn.close()

    total = sum((r["mentions"] or 0) for r in rows) or 1
    domains = []
    for row in rows:
        mentions = int(row["mentions"] or 0)
        domains.append(
            {
                "domain": row["citation_domain"],
                "mentions": mentions,
                "share_pct": round((mentions / total) * 100.0, 2),
            }
        )

    return jsonify(
        {
            "success": True,
            "window": window,
            "domains": domains,
        }
    )


@dashboard_bp.route("/api/report/<int:scan_id>/pdf", methods=["GET"])
def export_report_pdf(scan_id):
    """
    Export a styled multipage report PDF.
    """
    session_user_id, err = _require_user()
    if err:
        return err

    if canvas is None:
        return _error(
            "PDF export dependency missing. Install reportlab.",
            "dependency_missing",
            500,
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT sr.*, bp.brand_name
        FROM scan_results sr
        JOIN brand_profiles bp ON bp.id = sr.brand_profile_id
        WHERE sr.id = ? AND bp.user_id = ?
        LIMIT 1
        """,
        (scan_id, session_user_id),
    )
    scan = cursor.fetchone()
    if not scan:
        conn.close()
        return _error("Scan result not found", "not_found", 404)

    cursor.execute(
        """
        SELECT citation_domain, COUNT(*) as mentions
        FROM scan_citations
        WHERE scan_id = ?
        GROUP BY citation_domain
        ORDER BY mentions DESC
        LIMIT 5
        """,
        (scan_id,),
    )
    citation_rows = cursor.fetchall()
    conn.close()

    report = json.loads(scan["raw_report_json"]) if scan["raw_report_json"] else {}
    analysis = report.get("analysis", {}) if isinstance(report, dict) else {}
    scores = analysis.get("scores", {}) if isinstance(analysis, dict) else {}
    sentiment = analysis.get("sentiment", {}) if isinstance(analysis, dict) else {}
    market_intel = analysis.get("market_intel", {}) if isinstance(analysis, dict) else {}
    gap_analysis = analysis.get("gap_analysis", {}) if isinstance(analysis, dict) else {}
    technical_audit = analysis.get("technical_audit", []) if isinstance(analysis, dict) else []
    action_plan = analysis.get("action_plan", []) if isinstance(analysis, dict) else []
    if not isinstance(action_plan, list) or not action_plan:
        action_plan = analysis.get("actions", []) if isinstance(analysis, dict) else []
    diagnostics = analysis.get("diagnostics", []) if isinstance(analysis, dict) else []
    executive_summary = analysis.get("executive_summary", []) if isinstance(analysis, dict) else []
    score_weights = analysis.get("score_weights", {}) if isinstance(analysis, dict) else {}
    recommended_playbook = analysis.get("recommended_playbook", []) if isinstance(analysis, dict) else []

    screenshot_path = None
    screenshot_url = scan["screenshot_url"] if "screenshot_url" in scan.keys() else None
    if screenshot_url:
        candidate = str(screenshot_url).lstrip("/")
        if os.path.exists(candidate):
            screenshot_path = candidate

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    left = 16 * mm
    right = 16 * mm
    top_margin = 18 * mm
    bottom_margin = 18 * mm
    section_gap_mm = 2.0
    content_width = width - left - right
    y = height - top_margin
    page_no = 1

    def _num(value, default=0):
        try:
            return int(round(float(value)))
        except Exception:
            return default

    def _text(value, default=""):
        return str(value or default).strip()

    def _list(value):
        if isinstance(value, list):
            return value
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    def _draw_footer():
        pdf.setStrokeColor(colors.HexColor("#E2E8F0"))
        pdf.setLineWidth(0.6)
        pdf.line(left, 11 * mm, width - right, 11 * mm)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.setFont("Helvetica", 8)
        pdf.drawString(left, 7.5 * mm, f"Scan ID: {scan_id}")
        pdf.drawString(left + 35 * mm, 7.5 * mm, f"Keyword: {_text(scan['keyword'])[:50]}")
        pdf.drawRightString(width - right, 7.5 * mm, f"Page {page_no}")

    def _new_page():
        nonlocal y, page_no
        _draw_footer()
        pdf.showPage()
        page_no += 1
        y = height - top_margin

    def _ensure_space(required_mm):
        nonlocal y
        if y - (required_mm * mm) < bottom_margin:
            _new_page()

    def _wrap(text, font_name="Helvetica", font_size=9, max_width=None):
        words = _text(text).split()
        if not words:
            return [""]
        width_limit = max_width or content_width
        lines = []
        line = words[0]
        for word in words[1:]:
            candidate = f"{line} {word}"
            if pdf.stringWidth(candidate, font_name, font_size) <= width_limit:
                line = candidate
            else:
                lines.append(line)
                line = word
        lines.append(line)
        return lines

    def _heading(text, level=1):
        nonlocal y
        _ensure_space(12)
        if level == 1:
            pdf.setFont("Helvetica-Bold", 17)
            y_step = 8 * mm
        else:
            pdf.setFont("Helvetica-Bold", 12.5)
            y_step = 6 * mm
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.drawString(left, y, _text(text))
        y -= y_step

    def _line(text, font="Helvetica", size=9.5, color_hex="#1F2937", space_after_mm=0.7):
        nonlocal y
        _ensure_space(7)
        pdf.setFillColor(colors.HexColor(color_hex))
        pdf.setFont(font, size)
        pdf.drawString(left, y, _text(text))
        y -= 5.4 * mm
        y -= space_after_mm * mm

    def _paragraph(text, bullet=False, font_size=9.3, color_hex="#334155", space_after_mm=1.4):
        nonlocal y
        line_height_mm = 5.2
        bullet_indent = 4.4 * mm if bullet else 0
        text_x = left + bullet_indent
        max_width = content_width - bullet_indent
        lines = _wrap(text, font_name="Helvetica", font_size=font_size, max_width=max_width)
        for idx, entry in enumerate(lines):
            _ensure_space(line_height_mm + space_after_mm)
            pdf.setFillColor(colors.HexColor(color_hex))
            pdf.setFont("Helvetica", font_size)
            if bullet and idx == 0:
                pdf.drawString(left, y, "-")
            pdf.drawString(text_x, y, entry)
            y -= line_height_mm * mm
        y -= space_after_mm * mm

    def _score_bar(label, value, hex_color):
        nonlocal y
        _ensure_space(13.5)
        val = _num(value, default=0)
        pdf.setFillColor(colors.HexColor("#1F2937"))
        pdf.setFont("Helvetica-Bold", 9.2)
        pdf.drawString(left, y, _text(label))
        bar_x = left + 45 * mm
        bar_w = 86 * mm
        bar_h = 4.6 * mm
        pdf.setFillColor(colors.HexColor("#E2E8F0"))
        pdf.roundRect(bar_x, y - 3 * mm, bar_w, bar_h, 1.6, stroke=0, fill=1)
        fill_w = max(0, min(bar_w, (bar_w * val) / 100.0))
        pdf.setFillColor(colors.HexColor(hex_color))
        pdf.roundRect(bar_x, y - 3 * mm, fill_w, bar_h, 1.6, stroke=0, fill=1)
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.setFont("Helvetica-Bold", 9.2)
        pdf.drawRightString(width - right, y, str(val))
        y -= 7.8 * mm

    def _section_box(height_mm=8):
        nonlocal y
        _ensure_space(height_mm + 2)
        top_y = y + 2.2 * mm
        box_h = height_mm * mm
        pdf.setFillColor(colors.HexColor("#F8FAFC"))
        pdf.setStrokeColor(colors.HexColor("#E2E8F0"))
        pdf.roundRect(left, top_y - box_h, content_width, box_h, 4, stroke=1, fill=1)

    def _section_title(title, keep_with_next_mm=14):
        nonlocal y
        if y < (height - top_margin - 1 * mm):
            y -= section_gap_mm * mm
        _ensure_space(10 + keep_with_next_mm)
        _section_box(8.6)
        pdf.setFillColor(colors.HexColor("#1E40AF"))
        pdf.setFont("Helvetica-Bold", 11.3)
        pdf.drawString(left + 3.2 * mm, y - 1.7 * mm, _text(title))
        y -= 9.2 * mm

    vis = _num(scores.get("visibility", analysis.get("visibility", 0)))
    content = _num(scores.get("content", analysis.get("content", 0)))
    technical = _num(scores.get("technical", analysis.get("technical", 0)))
    visual = _num(scores.get("visual", analysis.get("visual", 0)))
    sentiment_label = _text(sentiment.get("label", "Neutral"), default="Neutral")
    sentiment_score = _num(sentiment.get("score", 0))
    citation_authority = _num(report.get("citation_authority", scan["trust_score"]))

    pdf.setFillColor(colors.HexColor("#1D4ED8"))
    pdf.roundRect(left, y - 18 * mm, content_width, 16 * mm, 5, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(left + 4 * mm, y - 7 * mm, "AnswerScope AI Report")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(left + 4 * mm, y - 12 * mm, "Strategic GEO visibility and authority intelligence")
    y -= 22 * mm

    _line(f"Brand: {_text(scan['brand_name'])}", font="Helvetica-Bold", size=10.5, color_hex="#0F172A")
    _line(f"Keyword: {_text(scan['keyword'])}", color_hex="#1F2937")
    _line(f"Generated: {_text(scan['timestamp'])}", color_hex="#475569")
    _line(f"LAS Score: {_num(scan['las_score'])}", font="Helvetica-Bold", size=10.5, color_hex="#0F172A")
    _line(f"Citation Authority: {citation_authority}", font="Helvetica-Bold", size=10.5, color_hex="#0F172A")

    if screenshot_path and ImageReader is not None:
        try:
            img = ImageReader(screenshot_path)
            img_w, img_h = img.getSize()
            max_w = content_width - 6 * mm
            max_h = 62 * mm
            scale = min(max_w / float(img_w), max_h / float(img_h))
            draw_w = img_w * scale
            draw_h = img_h * scale
            required_snapshot_mm = (draw_h / mm) + 9
            _section_title("Captured Page Snapshot", keep_with_next_mm=required_snapshot_mm)
            _ensure_space(required_snapshot_mm)
            pdf.setFillColor(colors.white)
            pdf.setStrokeColor(colors.HexColor("#CBD5E1"))
            pdf.roundRect(left, y - draw_h - 4 * mm, content_width, draw_h + 4 * mm, 4, stroke=1, fill=1)
            pdf.drawImage(
                img,
                left + (content_width - draw_w) / 2,
                y - draw_h - 2 * mm,
                draw_w,
                draw_h,
                preserveAspectRatio=True,
                mask="auto",
            )
            y -= draw_h + 7 * mm
        except Exception:
            _section_title("Captured Page Snapshot", keep_with_next_mm=11)
            _paragraph("Snapshot was captured but could not be embedded.", bullet=True)

    _section_title("Executive Summary", keep_with_next_mm=14)
    summary_lines = _list(executive_summary)
    if summary_lines:
        for item in summary_lines[:4]:
            _paragraph(item, bullet=True)
    else:
        _paragraph("No executive summary was generated in this scan.", bullet=True)

    _section_title("Weighted Score Overview", keep_with_next_mm=23)
    weights_text = (
        f"Weights - Visibility: {score_weights.get('visibility', 40)}%, "
        f"Content: {score_weights.get('content', 30)}%, "
        f"Technical: {score_weights.get('technical', 20)}%, "
        f"Visual: {score_weights.get('visual', 10)}%"
    )
    _paragraph(weights_text, color_hex="#475569")
    _score_bar("Visibility", vis, "#2563EB")
    _score_bar("Content", content, "#0EA5E9")
    _score_bar("Technical", technical, "#2DD4BF")
    _score_bar("Visual", visual, "#8B5CF6")

    _section_title("Sentiment and Technical Checklist", keep_with_next_mm=18)
    _line(
        f"Sentiment: {sentiment_label} ({sentiment_score})",
        font="Helvetica-Bold",
        size=10,
        color_hex="#0F172A",
    )
    audit_rows = _list(technical_audit)
    if audit_rows:
        for row in audit_rows[:8]:
            if isinstance(row, dict):
                check = _text(row.get("check"), default="Check")
                status = _text(row.get("status"), default="warn").upper()
                evidence = _text(row.get("evidence"), default="No evidence provided.")
            else:
                check = _text(row)
                status = "WARN"
                evidence = "No evidence provided."
            status_color = "#2563EB"
            if status == "PASS":
                status_color = "#10B981"
            elif status == "FAIL":
                status_color = "#EF4444"
            elif status == "WARN":
                status_color = "#F59E0B"
            _paragraph(f"[{status}] {check}", bullet=True, color_hex=status_color)
            _paragraph(evidence, color_hex="#475569")
    else:
        _paragraph("No technical checklist items available.", bullet=True)

    _section_title("Market Intel and Gap Analysis", keep_with_next_mm=18)
    if isinstance(market_intel, dict):
        _paragraph(
            f"Top competitor: {_text(market_intel.get('top_competitor_found'), default='Not identified')}",
            bullet=True,
            color_hex="#1F2937",
        )
        _paragraph(
            f"Why they won: {_text(market_intel.get('why_they_won'), default='No competitor reason provided.')}",
            bullet=True,
            color_hex="#1F2937",
        )
        _paragraph(
            f"Threat level: {_text(market_intel.get('competitor_threat_level'), default='Medium')}",
            bullet=True,
            color_hex="#1F2937",
        )

    if isinstance(gap_analysis, dict):
        missing_keywords = _list(gap_analysis.get("missing_keywords"))
        content_gaps = _list(gap_analysis.get("content_gaps"))
    else:
        missing_keywords = []
        content_gaps = []
    _paragraph("Missing Keywords:", bullet=False, color_hex="#0F172A")
    if missing_keywords:
        for kw in missing_keywords[:10]:
            _paragraph(_text(kw), bullet=True, color_hex="#334155")
    else:
        _paragraph("No missing keywords detected.", bullet=True, color_hex="#475569")
    _paragraph("Content Gaps:", bullet=False, color_hex="#0F172A")
    if content_gaps:
        for gap in content_gaps[:10]:
            _paragraph(_text(gap), bullet=True, color_hex="#334155")
    else:
        _paragraph("No major content gaps detected.", bullet=True, color_hex="#475569")

    _section_title("Prioritized Action Plan", keep_with_next_mm=22)
    if action_plan:
        for idx, item in enumerate(action_plan[:10], start=1):
            _ensure_space(18)
            if isinstance(item, dict):
                title = _text(item.get("title") or item.get("action"), default=f"Action {idx}")
                priority = _text(item.get("priority"), default="Medium")
                owner = _text(item.get("owner_hint"), default="SEO Manager")
                metric = _text(item.get("success_metric"), default="Track score uplift")
                why = _text(
                    item.get("why_this_matters"),
                    default="Improves GEO signal quality for AI answers.",
                )
                evidence_ref = _text(
                    item.get("evidence_reference"),
                    default="Derived from search and page evidence in this scan.",
                )
                eta_days = _num(item.get("eta_days", 14), default=14)
                steps = _list(item.get("step_by_step")) or [_text(item.get("action"))]
            else:
                title = _text(item, default=f"Action {idx}")
                priority = "Medium"
                owner = "SEO Manager"
                metric = "Track score uplift"
                why = "Improves GEO signal quality for AI answers."
                evidence_ref = "Derived from search and page evidence in this scan."
                eta_days = 14
                steps = [title]
            _paragraph(
                f"{idx}. {title} [{priority}] Owner: {owner}, ETA: {eta_days} days",
                bullet=False,
                color_hex="#0F172A",
            )
            for step in steps[:5]:
                _paragraph(_text(step), bullet=True, color_hex="#334155")
            _paragraph(f"KPI: {metric}", color_hex="#1F2937")
            _paragraph(f"Why this matters: {why}", color_hex="#1F2937")
            _paragraph(f"Evidence: {evidence_ref}", color_hex="#475569")
            y -= 1 * mm
    else:
        _paragraph("No action plan generated in this scan.", bullet=True)

    if recommended_playbook:
        _section_title("Recommended Playbook", keep_with_next_mm=16)
        for item in recommended_playbook[:6]:
            _ensure_space(12)
            if not isinstance(item, dict):
                _paragraph(_text(item), bullet=True)
                continue
            _paragraph(
                f"{_text(item.get('title'), default='Playbook Item')} "
                f"(Owner: {_text(item.get('owner_hint'), default='SEO Manager')})",
                bullet=True,
                color_hex="#0F172A",
            )
            _paragraph(
                _text(item.get("reason"), default="Improve strategic GEO readiness."),
                color_hex="#475569",
            )

    _section_title("Citation Authority Snapshot", keep_with_next_mm=16)
    if citation_rows:
        total_mentions = sum(int(r["mentions"] or 0) for r in citation_rows) or 1
        for row in citation_rows[:10]:
            mentions = int(row["mentions"] or 0)
            share = round((mentions / total_mentions) * 100.0, 2)
            _paragraph(
                f"{_text(row['citation_domain'], default='unknown')}: {mentions} mentions ({share}%)",
                bullet=True,
                color_hex="#1F2937",
            )
    else:
        _paragraph("No citation data available for this scan.", bullet=True)

    _section_title("Diagnostics", keep_with_next_mm=16)
    diag_rows = _list(diagnostics)
    if diag_rows:
        for row in diag_rows[:10]:
            if isinstance(row, dict):
                finding = _text(row.get("finding"), default="Diagnostic")
                evidence = _text(row.get("evidence"), default="No evidence provided.")
            else:
                finding = _text(row)
                evidence = "No evidence provided."
            _paragraph(finding, bullet=True, color_hex="#0F172A")
            _paragraph(evidence, color_hex="#475569")
    else:
        _paragraph("No diagnostics available for this scan.", bullet=True)

    _draw_footer()
    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"answerscope_report_scan_{scan_id}.pdf",
        mimetype="application/pdf",
    )
