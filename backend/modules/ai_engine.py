# ai_engine.py
"""
AnswerScope AI - AI Engine Module
Handles ALL AI provider logic. No other file should call external AI services.
"""

import json
import os
import re

from bs4 import BeautifulSoup
from dotenv import load_dotenv
from google import genai

from .logger import get_logger

try:
    import trafilatura
except Exception:  # pragma: no cover - optional dependency at runtime
    trafilatura = None

try:
    from readability import Document
except Exception:  # pragma: no cover - optional dependency at runtime
    Document = None

load_dotenv()

logger = get_logger(__name__)

AI_PROVIDER = "GEMINI"
DEV_MODE = False
MAX_CLEAN_TEXT_CHARS = int(os.environ.get("LLM_CLEAN_TEXT_MAX_CHARS", "18000"))

SCORE_WEIGHTS = {
    "visibility": 40,
    "content": 30,
    "technical": 20,
    "visual": 10,
}

BOILERPLATE_PATTERN = re.compile(
    r"menu|nav|breadcrumb|footer|header|sidebar|cookie|banner",
    re.IGNORECASE,
)
NAV_TEXT_PATTERN = re.compile(
    r"home|menu|sign in|login|cart|wishlist|cookie|privacy|terms",
    re.IGNORECASE,
)
BANNED_OUTPUT_TERMS = re.compile(r"\b(mock data|mock|simulation|dummy)\b", re.IGNORECASE)


def _clamp_int(value, default=0, lower=0, upper=100):
    try:
        return max(lower, min(upper, int(round(float(value)))))
    except Exception:
        return default


def _sanitize_text(value, max_len=500):
    if value is None:
        return ""
    text = str(value).strip()
    text = BANNED_OUTPUT_TERMS.sub("live context", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_len]


def _coerce_string_list(value, max_items=12, item_len=220):
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        text = _sanitize_text(item, max_len=item_len)
        if text:
            out.append(text)
        if len(out) >= max_items:
            break
    return out


def _normalize_sentiment(raw_sentiment):
    if isinstance(raw_sentiment, str):
        raw_sentiment = {"label": raw_sentiment, "score": 60}
    if not isinstance(raw_sentiment, dict):
        raw_sentiment = {}

    label = _sanitize_text(raw_sentiment.get("label", "Neutral"), max_len=20).lower()
    if label not in {"positive", "neutral", "negative"}:
        label = "neutral"

    score = _clamp_int(raw_sentiment.get("score", 60), default=60)
    return {
        "label": label.title(),
        "score": score,
    }


def _normalize_market_intel(raw_market, parsed, visibility):
    if not isinstance(raw_market, dict):
        raw_market = {}

    legacy_comp = parsed.get("competitor_analysis", {})
    if not isinstance(legacy_comp, dict):
        legacy_comp = {}

    legacy_wins = _coerce_string_list(legacy_comp.get("wins"), max_items=3, item_len=220)

    top_competitor = _sanitize_text(
        raw_market.get("top_competitor_found")
        or raw_market.get("top_competitor")
        or raw_market.get("competitor")
        or "",
        max_len=120,
    )
    why_they_won = _sanitize_text(
        raw_market.get("why_they_won")
        or raw_market.get("why_winning")
        or (legacy_wins[0] if legacy_wins else ""),
        max_len=320,
    )

    threat = _sanitize_text(raw_market.get("competitor_threat_level", ""), max_len=20).lower()
    if threat not in {"low", "medium", "high"}:
        if visibility >= 70:
            threat = "low"
        elif visibility >= 40:
            threat = "medium"
        else:
            threat = "high"

    return {
        "top_competitor_found": top_competitor or "Not clearly identified",
        "why_they_won": why_they_won or "Insufficient direct competitor evidence in current snapshot.",
        "competitor_threat_level": threat.title(),
    }


def _normalize_gap_analysis(raw_gap, parsed):
    if not isinstance(raw_gap, dict):
        raw_gap = {}

    missing_keywords = _coerce_string_list(
        raw_gap.get("missing_keywords") or parsed.get("keyword_gaps"),
        max_items=10,
        item_len=140,
    )
    content_gaps = _coerce_string_list(
        raw_gap.get("content_gaps") or parsed.get("what_is_missing"),
        max_items=10,
        item_len=220,
    )

    return {
        "missing_keywords": missing_keywords,
        "content_gaps": content_gaps,
    }


def _normalize_technical_audit(raw_audit):
    if not isinstance(raw_audit, list):
        raw_audit = []

    normalized = []
    for item in raw_audit:
        if isinstance(item, dict):
            check = _sanitize_text(item.get("check") or item.get("name") or "", max_len=100)
            status = _sanitize_text(item.get("status") or "warn", max_len=20).lower()
            evidence = _sanitize_text(item.get("evidence") or item.get("reason") or "", max_len=300)
        else:
            check = _sanitize_text(item, max_len=100)
            status = "warn"
            evidence = ""

        if not check:
            continue
        if status not in {"pass", "warn", "fail"}:
            status = "warn"
        normalized.append(
            {
                "check": check,
                "status": status,
                "evidence": evidence or "No explicit evidence provided.",
            }
        )
        if len(normalized) >= 10:
            break

    if not normalized:
        normalized = [
            {
                "check": "Schema.org Product",
                "status": "warn",
                "evidence": "Schema validation requires stronger on-page structured data evidence.",
            },
            {
                "check": "Schema.org Organization",
                "status": "warn",
                "evidence": "Organization-level structured data was not clearly confirmed in extracted content.",
            },
            {
                "check": "Schema.org FAQPage",
                "status": "warn",
                "evidence": "FAQ intent signals were weak in extracted content.",
            },
        ]
    return normalized


def _normalize_action_plan(raw_actions):
    if isinstance(raw_actions, dict):
        raw_actions = [raw_actions]
    if not isinstance(raw_actions, list):
        raw_actions = []

    actions = []
    for idx, item in enumerate(raw_actions, start=1):
        if isinstance(item, dict):
            priority = _sanitize_text(item.get("priority") or "Medium", max_len=20).title()
            if priority not in {"High", "Medium", "Low"}:
                priority = "Medium"

            owner_hint = _sanitize_text(
                item.get("owner_hint") or item.get("owner") or "SEO Manager",
                max_len=40,
            )
            title = _sanitize_text(
                item.get("title") or item.get("action") or f"Action {idx}",
                max_len=140,
            )

            steps = item.get("step_by_step")
            if isinstance(steps, str):
                steps = [steps]
            if not isinstance(steps, list):
                fallback_step = item.get("action") or item.get("description") or title
                steps = [fallback_step]
            step_by_step = _coerce_string_list(steps, max_items=6, item_len=200)

            success_metric = _sanitize_text(
                item.get("success_metric") or "Increase AI citation share for target keyword.",
                max_len=160,
            )
            why_this_matters = _sanitize_text(
                item.get("why_this_matters")
                or item.get("rationale")
                or "Improves evidence alignment with AI answer intent.",
                max_len=220,
            )
            evidence_reference = _sanitize_text(
                item.get("evidence_reference")
                or item.get("evidence")
                or "Derived from search + on-page content comparison.",
                max_len=220,
            )
            eta_days = _clamp_int(item.get("eta_days", 30), default=30, lower=1, upper=180)
        else:
            priority = "Medium"
            owner_hint = "SEO Manager"
            title = f"Action {idx}"
            step_by_step = _coerce_string_list([item], max_items=3, item_len=200)
            success_metric = "Increase AI citation share for target keyword."
            why_this_matters = "Improves evidence alignment with AI answer intent."
            evidence_reference = "Derived from search + on-page content comparison."
            eta_days = 30

        actions.append(
            {
                "priority": priority,
                "owner_hint": owner_hint,
                "title": title,
                "step_by_step": step_by_step or ["Add evidence-backed content for target intent."],
                "success_metric": success_metric,
                "why_this_matters": why_this_matters,
                "evidence_reference": evidence_reference,
                "eta_days": eta_days,
            }
        )
        if len(actions) >= 8:
            break

    if not actions:
        actions = [
            {
                "priority": "Medium",
                "owner_hint": "SEO Manager",
                "title": "Build entity-complete section for target keyword",
                "step_by_step": [
                    "Add a dedicated section covering key entities from AI answers.",
                    "Use list/table formatting for faster model extraction.",
                ],
                "success_metric": "Improved visibility score in next scan.",
                "why_this_matters": "Reduces mismatch between user query intent and page coverage.",
                "evidence_reference": "Current scan indicates weak structured evidence for core entities.",
                "eta_days": 14,
            }
        ]
    return actions


def _build_recommended_playbook(action_plan):
    playbook = []
    for item in action_plan:
        if not isinstance(item, dict):
            continue
        title = _sanitize_text(item.get("title", "Action"), max_len=140)
        reason = _sanitize_text(item.get("why_this_matters", ""), max_len=220)
        owner = _sanitize_text(item.get("owner_hint", "SEO Manager"), max_len=40)
        playbook.append(
            {
                "title": title,
                "owner_hint": owner,
                "reason": reason or "Improves GEO signal quality for AI answers.",
            }
        )
        if len(playbook) >= 5:
            break
    return playbook


def _normalize_diagnostics(raw_diagnostics):
    if not isinstance(raw_diagnostics, list):
        raw_diagnostics = []

    out = []
    for item in raw_diagnostics:
        if isinstance(item, dict):
            finding = _sanitize_text(item.get("finding") or "INFO: Diagnostic", max_len=220)
            evidence = _sanitize_text(item.get("evidence") or "", max_len=320)
        else:
            finding = _sanitize_text(item, max_len=220)
            evidence = ""
        if not finding:
            continue
        if ":" not in finding:
            finding = f"INFO: {finding}"
        out.append({"finding": finding, "evidence": evidence})
        if len(out) >= 10:
            break
    if not out:
        out = [
            {
                "finding": "INFO: Analysis completed with fallback-safe schema.",
                "evidence": "Structured JSON was normalized for dashboard rendering.",
            }
        ]
    return out


def _normalize_executive_summary(raw_summary):
    lines = _coerce_string_list(raw_summary, max_items=4, item_len=220)
    if not lines:
        lines = [
            "Visibility performance is constrained by weak evidence depth in current content.",
            "Primary risk is competitor clarity in AI summaries.",
            "Highest leverage move is structured, entity-complete content blocks.",
            "Expected result is stronger citation eligibility in upcoming scans.",
        ]
    return lines[:4]


def _build_charts(scores, sentiment, action_plan, citation_authority=0):
    visibility = _clamp_int(scores.get("visibility", 0), default=0)
    content = _clamp_int(scores.get("content", 0), default=0)
    technical = _clamp_int(scores.get("technical", 0), default=0)
    visual = _clamp_int(scores.get("visual", 0), default=0)
    authority = _clamp_int(citation_authority, default=0)

    sentiment_label = sentiment.get("label", "Neutral").lower()
    sentiment_score = _clamp_int(sentiment.get("score", 60), default=60)
    if sentiment_label == "positive":
        sentiment_values = [sentiment_score, max(0, 100 - sentiment_score), 0]
    elif sentiment_label == "negative":
        sentiment_values = [0, max(0, 100 - sentiment_score), sentiment_score]
    else:
        remainder = max(0, 100 - sentiment_score)
        left = int(round(remainder / 2.0))
        sentiment_values = [left, sentiment_score, remainder - left]

    priority_counts = {"High": 0, "Medium": 0, "Low": 0}
    for item in action_plan:
        if not isinstance(item, dict):
            continue
        key = _sanitize_text(item.get("priority", "Medium"), max_len=20).title()
        if key in priority_counts:
            priority_counts[key] += 1

    return {
        "pillar_bar": {
            "labels": ["Visibility", "Content", "Technical", "Visual"],
            "values": [visibility, content, technical, visual],
        },
        "sentiment_donut": {
            "labels": ["Positive", "Neutral", "Negative"],
            "values": sentiment_values,
        },
        "priority_stack": {
            "labels": ["High", "Medium", "Low"],
            "values": [
                priority_counts["High"],
                priority_counts["Medium"],
                priority_counts["Low"],
            ],
        },
        "authority_vs_visibility": {
            "labels": ["Citation Authority", "Visibility"],
            "values": [authority, visibility],
        },
    }


def _to_legacy_actions(action_plan):
    legacy = []
    for item in action_plan:
        if not isinstance(item, dict):
            continue
        first_step = ""
        steps = item.get("step_by_step")
        if isinstance(steps, list) and steps:
            first_step = _sanitize_text(steps[0], max_len=220)
        legacy.append(
            {
                "priority": _sanitize_text(item.get("priority", "Medium"), max_len=20),
                "owner_hint": _sanitize_text(item.get("owner_hint", "SEO Manager"), max_len=50),
                "action": first_step or _sanitize_text(item.get("title", "Action"), max_len=220),
                "success_metric": _sanitize_text(
                    item.get("success_metric", "Improve upcoming scan KPIs."),
                    max_len=160,
                ),
                "why_this_matters": _sanitize_text(
                    item.get("why_this_matters", "Improves GEO signal quality."),
                    max_len=220,
                ),
            }
        )
    return legacy


def _default_structured_output(raw_message):
    scores = {
        "visibility": 35,
        "content": 45,
        "technical": 40,
        "visual": 30,
    }
    sentiment = {"label": "Neutral", "score": 62}
    action_plan = _normalize_action_plan([])
    gap_analysis = {
        "missing_keywords": [],
        "content_gaps": [
            "Evidence density for query entities is limited.",
            "AI-facing structure could be improved with concise lists and tables.",
        ],
    }
    market_intel = {
        "top_competitor_found": "Not clearly identified",
        "why_they_won": "Competitor signal strength could not be reliably determined from available context.",
        "competitor_threat_level": "Medium",
    }
    technical_audit = _normalize_technical_audit([])
    diagnostics = [
        {
            "finding": "WARNING: Model output was invalid or unavailable.",
            "evidence": "Fallback-safe structured payload applied.",
        }
    ]
    executive_summary = _normalize_executive_summary([])
    charts = _build_charts(scores, sentiment, action_plan, citation_authority=0)
    playbook = _build_recommended_playbook(action_plan)

    return {
        "visibility": scores["visibility"],
        "content": scores["content"],
        "technical": scores["technical"],
        "visual": scores["visual"],
        "scores": scores,
        "score_weights": dict(SCORE_WEIGHTS),
        "sentiment": sentiment,
        "market_intel": market_intel,
        "gap_analysis": gap_analysis,
        "technical_audit": technical_audit,
        "action_plan": action_plan,
        "recommended_playbook": playbook,
        "charts": charts,
        "executive_summary": executive_summary,
        "language": "en",
        "diagnostics": diagnostics,
        "what_is_working": [],
        "what_is_missing": gap_analysis["content_gaps"],
        "competitor_analysis": {
            "wins": [market_intel["why_they_won"]],
            "losses": [],
        },
        "keyword_gaps": gap_analysis["missing_keywords"],
        "actions": _to_legacy_actions(action_plan),
        "raw": _sanitize_text(raw_message, max_len=5000),
    }


def mock_response():
    """
    Returns deterministic dev response.
    """
    payload = _default_structured_output("Development mode fallback response.")
    payload["what_is_working"] = ["Development mode response active."]
    return payload


def _remove_boilerplate_nodes(soup):
    for element in soup(
        [
            "script",
            "style",
            "svg",
            "footer",
            "nav",
            "noscript",
            "header",
            "aside",
            "form",
        ]
    ):
        element.decompose()

    for element in soup.find_all(True):
        class_attr = " ".join(element.get("class", []))
        id_attr = element.get("id", "")
        combined = f"{class_attr} {id_attr}".strip()
        if combined and BOILERPLATE_PATTERN.search(combined):
            element.decompose()


def _extract_with_trafilatura(raw_html):
    if not trafilatura:
        return None
    try:
        return trafilatura.extract(
            raw_html,
            include_comments=False,
            include_tables=True,
            favor_precision=True,
            output_format="txt",
        )
    except Exception:
        logger.exception("Trafilatura extraction failed")
        return None


def _extract_with_readability(raw_html):
    if not Document:
        return None
    try:
        summary_html = Document(raw_html).summary(html_partial=True)
        soup = BeautifulSoup(summary_html, "html.parser")
        _remove_boilerplate_nodes(soup)
        return soup.get_text(separator="\n", strip=True)
    except Exception:
        logger.exception("Readability extraction failed")
        return None


def _extract_with_bs4(raw_html):
    try:
        soup = BeautifulSoup(raw_html, "html.parser")
        _remove_boilerplate_nodes(soup)

        blocks = []
        if soup.title and soup.title.get_text(strip=True):
            blocks.append(soup.title.get_text(" ", strip=True))

        for tag in soup.find_all(["h1", "h2"]):
            text = tag.get_text(" ", strip=True)
            if text:
                blocks.append(text)

        for tag in soup.find_all(["p", "li"]):
            text = tag.get_text(" ", strip=True)
            if text and len(text) >= 30:
                blocks.append(text)

        if not blocks:
            return soup.get_text(separator="\n", strip=True)
        return "\n".join(blocks)
    except Exception:
        logger.exception("BeautifulSoup extraction failed")
        return None


def _section_score(section_text):
    text = section_text.strip()
    if not text:
        return -10
    if NAV_TEXT_PATTERN.search(text):
        return -5

    score = 0
    text_len = len(text)
    if 50 <= text_len <= 600:
        score += 3
    elif text_len >= 25:
        score += 1

    if text_len <= 90:
        score += 1
    if text.endswith(":"):
        score += 1
    if text.count(" ") < 4:
        score -= 1

    return score


def _prioritize_sections(text, max_chars):
    if not text:
        return ""

    base = text.replace("\r", "\n")
    sections = [s.strip() for s in re.split(r"\n{2,}", base) if s.strip()]
    if len(sections) < 6:
        sections = [s.strip() for s in base.split("\n") if s.strip()]

    scored = []
    for idx, section in enumerate(sections):
        score = _section_score(section)
        scored.append((idx, section, score))

    high_value = [row for row in scored if row[2] >= 3]
    medium_value = [row for row in scored if row[2] == 2]
    low_value = [row for row in scored if row[2] == 1]

    ordered = high_value + medium_value + low_value
    selected = []
    used = 0
    selected_indexes = set()

    for idx, section, _ in ordered:
        section_len = len(section) + 2
        if idx in selected_indexes:
            continue
        if used + section_len > max_chars:
            continue
        selected.append((idx, section))
        selected_indexes.add(idx)
        used += section_len
        if used >= max_chars:
            break

    if used < int(max_chars * 0.65):
        for idx, section, score in scored:
            if idx in selected_indexes or score < 0:
                continue
            section_len = len(section) + 2
            if used + section_len > max_chars:
                continue
            selected.append((idx, section))
            selected_indexes.add(idx)
            used += section_len
            if used >= max_chars:
                break

    selected.sort(key=lambda row: row[0])
    text_out = "\n\n".join(section for _, section in selected)
    return text_out[:max_chars]


def clean_html_for_llm(raw_html):
    """
    Deterministic extraction pipeline:
    trafilatura -> readability-lxml -> BeautifulSoup fallback.
    Returns metadata for observability and downstream status APIs.
    """
    source_char_count = len(raw_html or "")
    if not raw_html:
        return {
            "clean_text": "",
            "extraction_method": "empty",
            "source_char_count": 0,
            "clean_char_count": 0,
        }

    # Prefer highest-fidelity extraction first; progressively degrade to preserve uptime.
    extraction_method = "bs4_fallback"
    extracted_text = None

    for method, extractor in (
        ("trafilatura", _extract_with_trafilatura),
        ("readability", _extract_with_readability),
        ("bs4_fallback", _extract_with_bs4),
    ):
        candidate = extractor(raw_html)
        if candidate and len(candidate.strip()) >= 150:
            extraction_method = method
            extracted_text = candidate
            break
        if candidate and not extracted_text:
            extraction_method = method
            extracted_text = candidate

    extracted_text = extracted_text or raw_html[:5000]
    clean_text = _prioritize_sections(extracted_text, MAX_CLEAN_TEXT_CHARS)
    clean_char_count = len(clean_text)

    return {
        "clean_text": clean_text,
        "extraction_method": extraction_method,
        "source_char_count": source_char_count,
        "clean_char_count": clean_char_count,
    }


def _extract_balanced_json(text):
    start = text.find("{")
    if start < 0:
        return None

    depth = 0
    in_string = False
    escaped = False
    for idx in range(start, len(text)):
        char = text[idx]
        if in_string:
            if escaped:
                escaped = False
                continue
            if char == "\\":
                escaped = True
                continue
            if char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue
        if char == "{":
            depth += 1
            continue
        if char == "}":
            depth -= 1
            if depth == 0:
                return text[start:idx + 1]
    return None


def _try_json_loads(payload):
    if not payload:
        return None

    cleaned = payload.strip()
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    cleaned = cleaned.replace("\u201c", '"').replace("\u201d", '"')
    cleaned = cleaned.replace("\u2018", "'").replace("\u2019", "'")

    candidates = [cleaned]
    balanced = _extract_balanced_json(cleaned)
    if balanced:
        candidates.append(balanced)

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except Exception:
            pass
        try:
            fixed = re.sub(r",\s*([}\]])", r"\1", candidate)
            return json.loads(fixed)
        except Exception:
            pass
    return None


def _extract_json_payload(ai_content):
    return _try_json_loads(ai_content)


def _normalize_ai_payload(parsed, raw_text):
    if not isinstance(parsed, dict):
        return _default_structured_output(raw_text)

    raw_scores = parsed.get("scores", {})
    if not isinstance(raw_scores, dict):
        raw_scores = {}

    visibility = _clamp_int(raw_scores.get("visibility", parsed.get("visibility", 35)), default=35)
    content = _clamp_int(raw_scores.get("content", parsed.get("content", 45)), default=45)
    technical = _clamp_int(raw_scores.get("technical", parsed.get("technical", 40)), default=40)
    visual = _clamp_int(raw_scores.get("visual", parsed.get("visual", 30)), default=30)
    scores = {
        "visibility": visibility,
        "content": content,
        "technical": technical,
        "visual": visual,
    }

    sentiment = _normalize_sentiment(parsed.get("sentiment"))
    market_intel = _normalize_market_intel(parsed.get("market_intel"), parsed, visibility)
    gap_analysis = _normalize_gap_analysis(parsed.get("gap_analysis"), parsed)
    technical_audit = _normalize_technical_audit(parsed.get("technical_audit"))
    action_plan = _normalize_action_plan(parsed.get("action_plan") or parsed.get("actions"))
    diagnostics = _normalize_diagnostics(parsed.get("diagnostics"))
    executive_summary = _normalize_executive_summary(parsed.get("executive_summary"))
    what_is_working = _coerce_string_list(parsed.get("what_is_working"), max_items=8, item_len=220)
    what_is_missing = _coerce_string_list(
        parsed.get("what_is_missing") or gap_analysis.get("content_gaps"),
        max_items=8,
        item_len=220,
    )

    legacy_competitor = parsed.get("competitor_analysis", {})
    if not isinstance(legacy_competitor, dict):
        legacy_competitor = {}

    competitor_wins = _coerce_string_list(legacy_competitor.get("wins"), max_items=5, item_len=220)
    if market_intel["why_they_won"] and not competitor_wins:
        competitor_wins = [market_intel["why_they_won"]]
    competitor_losses = _coerce_string_list(legacy_competitor.get("losses"), max_items=5, item_len=220)

    charts = _build_charts(scores, sentiment, action_plan, citation_authority=0)
    playbook = _build_recommended_playbook(action_plan)
    language = "en"

    # Emit a stable, dashboard-safe contract even when the model response shape drifts.
    payload = {
        "visibility": visibility,
        "content": content,
        "technical": technical,
        "visual": visual,
        "scores": scores,
        "score_weights": dict(SCORE_WEIGHTS),
        "sentiment": sentiment,
        "market_intel": market_intel,
        "gap_analysis": gap_analysis,
        "technical_audit": technical_audit,
        "action_plan": action_plan,
        "recommended_playbook": playbook,
        "charts": charts,
        "executive_summary": executive_summary,
        "language": language,
        "diagnostics": diagnostics,
        "what_is_working": what_is_working,
        "what_is_missing": what_is_missing,
        "competitor_analysis": {
            "wins": competitor_wins,
            "losses": competitor_losses,
        },
        "keyword_gaps": gap_analysis.get("missing_keywords", []),
        "actions": _to_legacy_actions(action_plan),
        "raw": _sanitize_text(raw_text, max_len=5000),
    }
    return payload


def gemini_analysis(prompt):
    """
    Calls Gemini API via Google GenAI SDK.
    Returns strict dashboard-ready JSON and backward-compatible score keys.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    model = os.environ.get("AI_MODEL", "gemini-2.5-pro")

    if not api_key:
        return _default_structured_output(
            "Error: GEMINI_API_KEY/GOOGLE_API_KEY environment variable not set"
        )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents=prompt,
        )
        ai_content = getattr(response, "text", None) or str(response)
        parsed = _extract_json_payload(ai_content)
        return _normalize_ai_payload(parsed, ai_content)
    except Exception:
        logger.exception("Gemini API Exception")
        return _default_structured_output("API Error: Gemini request failed")


def ai_analysis(ai_overview, website_html, brand_context=None):
    """
    Main AI analysis function.
    Combines AI overview and website content, sends to provider.
    """
    if DEV_MODE:
        return mock_response()

    brand_context = brand_context or {}
    if isinstance(ai_overview, dict):
        ai_text = ai_overview.get("text", "")
        overview_source_type = ai_overview.get("source_type", "unknown")
        overview_fetch_mode = ai_overview.get("fetch_mode", "unknown")
        overview_confidence = ai_overview.get("confidence", "low")
    else:
        ai_text = str(ai_overview or "")
        overview_source_type = "unknown"
        overview_fetch_mode = "unknown"
        overview_confidence = "low"

    brand_name = brand_context.get("brand_name", "")
    keyword = brand_context.get("keyword", "")
    brand_category = (brand_context.get("brand_category") or "generic").strip().lower()
    competitors = brand_context.get("competitors", [])
    if not isinstance(competitors, list):
        competitors = []

    cleaned_payload = clean_html_for_llm(website_html)
    cleaned_site_text = cleaned_payload["clean_text"]
    logger.info(
        "Cleaned HTML length: %s chars (down from %s) using %s",
        cleaned_payload["clean_char_count"],
        cleaned_payload["source_char_count"],
        cleaned_payload["extraction_method"],
    )

    prompt = f"""
You are AnswerScope AI's senior GEO analyst.
Return exactly one JSON object and nothing else.

Critical output rules:
- Language: English only.
- No markdown, no code fences, no explanation outside JSON.
- Never use these words in output: mock data, simulation, dummy.
- Keep every line concise for a SaaS dashboard (short, action-focused), but preserve practical guidance.
- Scores must be integers 0-100 and should avoid extreme 0/100 unless evidence is overwhelming.
- Recommendations must be useful: every action requires rationale and evidence reference.

Reasoning policy:
- Use provided search context and website content as primary evidence.
- You may use model knowledge only as inference when evidence is incomplete.
- Any inferred claim must be explicit in diagnostics evidence with confidence label.

Input:
- brand_name: {brand_name}
- keyword: {keyword}
- brand_category: {brand_category}
- known_competitors: {json.dumps(competitors)}
- search_source_type: {overview_source_type}
- search_fetch_mode: {overview_fetch_mode}
- search_confidence: {overview_confidence}
- search_context: {ai_text}
- website_clean_text: {cleaned_site_text}

Return this exact schema (all keys required):
{{
  "scores": {{
    "visibility": 0,
    "content": 0,
    "technical": 0,
    "visual": 0
  }},
  "sentiment": {{
    "label": "Neutral",
    "score": 0
  }},
  "market_intel": {{
    "top_competitor_found": "",
    "why_they_won": "",
    "competitor_threat_level": "Medium"
  }},
  "gap_analysis": {{
    "missing_keywords": [""],
    "content_gaps": [""]
  }},
  "technical_audit": [
    {{
      "check": "",
      "status": "pass",
      "evidence": ""
    }}
  ],
  "action_plan": [
    {{
      "priority": "High",
      "owner_hint": "SEO Manager",
      "title": "",
      "step_by_step": [""],
      "success_metric": "",
      "why_this_matters": "",
      "evidence_reference": "",
      "eta_days": 14
    }}
  ],
  "recommended_playbook": [
    {{
      "title": "",
      "owner_hint": "",
      "reason": ""
    }}
  ],
  "executive_summary": ["", "", "", ""],
  "diagnostics": [
    {{
      "finding": "INFO: ...",
      "evidence": ""
    }}
  ],
  "what_is_working": [""],
  "what_is_missing": [""],
  "competitor_analysis": {{
    "wins": [""],
    "losses": [""]
  }},
  "keyword_gaps": [""]
}}
"""

    result = gemini_analysis(prompt)
    result["extraction"] = cleaned_payload
    result["overview_meta"] = {
        "source_type": overview_source_type,
        "fetch_mode": overview_fetch_mode,
        "confidence": overview_confidence,
    }
    return result
