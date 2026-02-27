"""
AnswerScope AI - Analysis Pipeline Module
Handles the complete analysis pipeline with real API integrations.
"""

import asyncio
import os
import requests
import sys
import time
import uuid
from datetime import datetime, timezone

from playwright.async_api import async_playwright
from dotenv import load_dotenv

from .ai_engine import ai_analysis
from .scoring import calculate_las, calculate_trust_score
from .logger import get_logger

load_dotenv()

logger = get_logger(__name__)

logger.info("Python version: %s", sys.version)
logger.info("Playwright available: True")


def _clean_join(parts):
    cleaned = [p.strip() for p in parts if isinstance(p, str) and p.strip()]
    return " ".join(cleaned).strip()


def _extract_ai_text_blocks(blocks):
    if not isinstance(blocks, list):
        return ""
    snippets = []
    for block in blocks:
        if isinstance(block, dict):
            snippet = block.get("snippet") or block.get("text") or ""
            if snippet:
                snippets.append(str(snippet))
        elif isinstance(block, str):
            snippets.append(block)
    return _clean_join(snippets)


def _extract_ai_text(payload):
    if isinstance(payload, dict):
        direct_text = payload.get("text") or payload.get("snippet") or ""
        if direct_text:
            return str(direct_text).strip()

        block_text = _extract_ai_text_blocks(payload.get("text_blocks", []))
        if block_text:
            return block_text

        sections = payload.get("sections")
        if isinstance(sections, list):
            section_text = _extract_ai_text_blocks(sections)
            if section_text:
                return section_text

    if isinstance(payload, list):
        return _extract_ai_text_blocks(payload)

    return ""


def _extract_citations(payload):
    citations = []
    if not isinstance(payload, dict):
        return citations

    candidates = (
        payload.get("sources")
        or payload.get("references")
        or payload.get("citations")
        or []
    )
    if not isinstance(candidates, list):
        return citations

    for idx, source in enumerate(candidates, start=1):
        if not isinstance(source, dict):
            continue
        url = source.get("link") or source.get("url") or ""
        title = source.get("title") or source.get("source") or ""
        domain = source.get("domain") or source.get("displayed_link") or ""
        if not url and not title and not domain:
            continue
        citations.append(
            {
                "position": idx,
                "url": url,
                "title": title,
                "domain": domain,
            }
        )
    return citations


def _extract_related_questions(data):
    questions = []
    for key in ("related_questions", "people_also_ask"):
        rows = data.get(key) if isinstance(data, dict) else None
        if not isinstance(rows, list):
            continue
        for item in rows[:6]:
            if isinstance(item, dict):
                q = item.get("question") or item.get("title") or item.get("snippet")
            else:
                q = str(item)
            if q:
                questions.append(str(q).strip())
    return [q for q in questions if q]


def _collect_citations_from_rows(rows):
    citations = []
    if not isinstance(rows, list):
        return citations
    for idx, item in enumerate(rows, start=1):
        if not isinstance(item, dict):
            continue
        url = item.get("link") or item.get("url") or item.get("product_link") or ""
        domain = item.get("source") or item.get("domain") or item.get("displayed_link") or ""
        title = item.get("title") or item.get("name") or ""
        if not (url or domain or title):
            continue
        citations.append(
            {
                "position": idx,
                "url": url,
                "title": title,
                "domain": domain,
            }
        )
    return citations


def _extract_ecommerce_signal(data):
    shopping_keys = (
        "shopping_results",
        "inline_shopping_results",
        "shopping_ads",
        "popular_products",
        "products",
    )
    products = []
    for key in shopping_keys:
        rows = data.get(key) if isinstance(data, dict) else None
        if isinstance(rows, list):
            products.extend(rows[:6])

    snippets = []
    for item in products[:8]:
        if not isinstance(item, dict):
            continue
        line = _clean_join(
            [
                str(item.get("title") or item.get("name") or ""),
                str(item.get("price") or ""),
                str(item.get("source") or item.get("merchant") or ""),
                str(item.get("snippet") or ""),
            ]
        )
        if line:
            snippets.append(line)

    if not snippets:
        image_rows = data.get("images_results") if isinstance(data, dict) else None
        if isinstance(image_rows, list):
            for item in image_rows[:6]:
                if not isinstance(item, dict):
                    continue
                text = _clean_join(
                    [
                        str(item.get("title") or ""),
                        str(item.get("source") or ""),
                        str(item.get("snippet") or ""),
                    ]
                )
                if text:
                    snippets.append(text)

    if not snippets:
        return None

    return {
        "text": _clean_join(snippets),
        "source_type": "shopping_graph",
        "fetch_mode": "category_ecommerce",
        "confidence": "medium",
        "citations": _collect_citations_from_rows(products),
        "raw": {"shopping_signals": products[:8]},
    }


def _extract_local_signal(data):
    local_rows = []
    for key in ("local_results", "local_pack", "places", "maps_results"):
        rows = data.get(key) if isinstance(data, dict) else None
        if isinstance(rows, list):
            local_rows.extend(rows[:6])
    if not local_rows:
        return None

    snippets = []
    for item in local_rows[:8]:
        if not isinstance(item, dict):
            continue
        line = _clean_join(
            [
                str(item.get("title") or item.get("name") or ""),
                str(item.get("rating") or ""),
                str(item.get("address") or ""),
                str(item.get("phone") or ""),
                str(item.get("snippet") or ""),
            ]
        )
        if line:
            snippets.append(line)
    if not snippets:
        return None

    return {
        "text": _clean_join(snippets),
        "source_type": "local_pack",
        "fetch_mode": "category_local",
        "confidence": "medium",
        "citations": _collect_citations_from_rows(local_rows),
        "raw": {"local_signals": local_rows[:8]},
    }


def _extract_saas_signal(data):
    questions = _extract_related_questions(data)
    if not questions:
        return None
    return {
        "text": _clean_join(questions),
        "source_type": "related_questions",
        "fetch_mode": "category_saas",
        "confidence": "medium",
        "citations": [],
        "raw": {"related_questions": questions[:6]},
    }


def _clean_fallback_text(keyword):
    return (
        f"Search context unavailable for '{keyword}'. "
        "Proceeding with website-first GEO audit."
    )


def _followup_ai_overview(serpapi_key, keyword, page_token=None, serpapi_link=None):
    try:
        if page_token:
            params = {
                "api_key": serpapi_key,
                "engine": "google_ai_overview",
                "q": keyword,
                "page_token": page_token,
                "gl": "us",
                "hl": "en",
            }
            response = requests.get(
                "https://serpapi.com/search", params=params, timeout=30
            )
            if response.status_code == 200:
                return response.json()
            logger.warning(
                "AI overview page_token follow-up failed: %s %s",
                response.status_code,
                response.text,
            )

        if serpapi_link:
            response = requests.get(serpapi_link, timeout=30)
            if response.status_code == 200:
                return response.json()
            logger.warning(
                "AI overview serpapi_link follow-up failed: %s %s",
                response.status_code,
                response.text,
            )
    except Exception:
        logger.exception("AI overview follow-up request failed")
    return None


def fetch_google_ai_overview(keyword, brand_category="generic"):
    """
    Fetch AI overview from Google using SerpApi.
    Priority:
    1) ai_overview embedded text
    2) ai_overview follow-up via page_token/serpapi_link
    3) answer_box
    4) knowledge_graph
    5) top organic snippet
    """
    # Category-aware fallback keeps downstream prompts useful even without full AI overview support.
    category = (brand_category or "generic").strip().lower()

    if os.environ.get("SERPAPI_MOCK", "").lower() in ("1", "true", "yes"):
        logger.info("SERPAPI_MOCK enabled. Using synthetic search context.")
        return {
            "text": _clean_fallback_text(keyword),
            "source_type": "synthetic",
            "fetch_mode": "synthetic",
            "confidence": "low",
            "citations": [],
            "raw": {},
        }

    serpapi_key = os.environ.get("SERPAPI_KEY")
    logger.info("SerpApi key found: %s", "Yes" if serpapi_key else "No")
    if not serpapi_key:
        logger.warning("Missing SERPAPI_KEY. Using website-first fallback.")
        return {
            "text": _clean_fallback_text(keyword),
            "source_type": "unavailable",
            "fetch_mode": "website_only",
            "confidence": "low",
            "citations": [],
            "raw": {"warning": "SERPAPI_KEY missing"},
        }

    try:
        logger.info("Calling SerpApi for keyword: %s", keyword)
        params = {
            "api_key": serpapi_key,
            "engine": "google",
            "q": keyword,
            "google_domain": "google.com",
            "gl": "us",
            "hl": "en",
            "num": 5,
        }
        response = requests.get("https://serpapi.com/search", params=params, timeout=30)
        if response.status_code != 200:
            logger.error("SerpApi Error %s: %s", response.status_code, response.text)
            return {
                "text": f"AI Overview for '{keyword}': Error fetching data from Google.",
                "source_type": "error",
                "fetch_mode": "none",
                "confidence": "low",
                "citations": [],
                "raw": {},
            }

        data = response.json()

        # Priority 1: Embedded AI Overview text
        ai_data = data.get("ai_overview")
        if isinstance(ai_data, dict):
            if ai_data.get("error"):
                logger.warning("ai_overview.error present: %s", ai_data.get("error"))
            else:
                embedded_text = _extract_ai_text(ai_data)
                if embedded_text:
                    return {
                        "text": embedded_text,
                        "source_type": "ai_overview",
                        "fetch_mode": "embedded",
                        "confidence": "high",
                        "citations": _extract_citations(ai_data),
                        "raw": ai_data,
                    }

                # Priority 2: Follow-up with page_token / serpapi_link
                page_token = ai_data.get("page_token")
                serpapi_link = ai_data.get("serpapi_link")
                if page_token or serpapi_link:
                    follow_data = _followup_ai_overview(
                        serpapi_key,
                        keyword,
                        page_token=page_token,
                        serpapi_link=serpapi_link,
                    )
                    if isinstance(follow_data, dict):
                        follow_ai = (
                            follow_data.get("ai_overview")
                            if isinstance(follow_data.get("ai_overview"), dict)
                            else follow_data
                        )
                        follow_text = _extract_ai_text(follow_ai)
                        if follow_text:
                            return {
                                "text": follow_text,
                                "source_type": "ai_overview",
                                "fetch_mode": "page_token_followup",
                                "confidence": "high",
                                "citations": _extract_citations(follow_ai),
                                "raw": follow_ai,
                            }

        # Category-specific priority branch before generic fallbacks.
        if category == "ecommerce":
            ecommerce_signal = _extract_ecommerce_signal(data)
            if ecommerce_signal:
                return ecommerce_signal
        elif category == "local":
            local_signal = _extract_local_signal(data)
            if local_signal:
                return local_signal
        elif category == "saas":
            saas_signal = _extract_saas_signal(data)
            if saas_signal:
                return saas_signal

        # Priority 3: Answer Box
        answer_box = data.get("answer_box")
        if isinstance(answer_box, dict):
            ab_text = (
                answer_box.get("answer")
                or answer_box.get("snippet")
                or (answer_box.get("snippet_highlighted_words") or [""])[0]
            )
            if ab_text:
                return {
                    "text": str(ab_text).strip(),
                    "source_type": "answer_box",
                    "fetch_mode": "embedded",
                    "confidence": "medium",
                    "citations": _extract_citations(answer_box),
                    "raw": answer_box,
                }

        # Priority 4: Knowledge Graph
        kg = data.get("knowledge_graph")
        if isinstance(kg, dict):
            kg_text = kg.get("description") or ""
            if kg_text:
                return {
                    "text": str(kg_text).strip(),
                    "source_type": "knowledge_graph",
                    "fetch_mode": "embedded",
                    "confidence": "medium",
                    "citations": _extract_citations(kg),
                    "raw": kg,
                }

        # Priority 5: Top Organic Snippet
        organic = data.get("organic_results") or []
        if isinstance(organic, list) and organic:
            first = organic[0] if isinstance(organic[0], dict) else {}
            snippet = first.get("snippet") or ""
            if snippet:
                return {
                    "text": str(snippet).strip(),
                    "source_type": "organic",
                    "fetch_mode": "embedded",
                    "confidence": "low",
                    "citations": _extract_citations(first),
                    "raw": first,
                }

        logger.warning("SerpApi returned no usable overview text.")
        return {
            "text": _clean_fallback_text(keyword),
            "source_type": "none",
            "fetch_mode": "none",
            "confidence": "low",
            "citations": [],
            "raw": data,
        }
    except Exception:
        logger.exception("SerpApi Exception")
        return {
            "text": _clean_fallback_text(keyword),
            "source_type": "error",
            "fetch_mode": "none",
            "confidence": "low",
            "citations": [],
            "raw": {},
        }


async def _scrape_website_async(url):
    """Async function for Playwright scraping."""
    logger.info("Starting Playwright scrape: %s", url)

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-gpu",
                    "--disable-web-security",
                ],
            )

            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/91.0.4472.124 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 720},
                ignore_https_errors=True,
            )

            page = await context.new_page()
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_timeout(2000)
                html = await page.content()
                logger.info("Scraped %s characters", len(html))
                await browser.close()
                return html
            except Exception as nav_error:
                logger.error("Navigation error: %s", nav_error)
                await browser.close()
                return (
                    "<html><body><h1>Navigation Error</h1>"
                    f"<p>{str(nav_error)}</p></body></html>"
                )
        except Exception as e:
            logger.exception("Playwright setup error")
            return f"<html><body><h1>Playwright Error</h1><p>{str(e)}</p></body></html>"


async def _capture_screenshot_async(url, screenshot_path):
    """Capture only a screenshot (no HTML) and return timing metadata."""
    logger.info("Capturing screenshot: %s", url)

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-gpu",
                    "--disable-web-security",
                ],
            )

            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/91.0.4472.124 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 720},
                ignore_https_errors=True,
            )

            page = await context.new_page()
            start = time.perf_counter()
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            dom_loaded_ms = round((time.perf_counter() - start) * 1000.0, 2)
            await page.wait_for_timeout(2000)
            await page.screenshot(path=screenshot_path, full_page=True)
            await browser.close()
            return {
                "success": True,
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "dom_loaded_ms": dom_loaded_ms,
            }
        except Exception:
            logger.exception("Screenshot capture failed")
            return {
                "success": False,
                "captured_at": None,
                "dom_loaded_ms": None,
            }


def scrape_website_content(url):
    """
    Wrapper for async scraping.
    """
    try:
        return asyncio.run(_scrape_website_async(url))
    except Exception as e:
        logger.exception("Async loop error")
        return f"<html><body><h1>Scraping Error</h1><p>{str(e)}</p></body></html>"


def run_analysis_pipeline(keyword, url, brand_context=None):
    """
    Main analysis pipeline.
    """
    logger.info("Starting pipeline for: %s -> %s", keyword, url)

    brand_context = brand_context or {}
    brand_context = dict(brand_context)
    brand_context["keyword"] = keyword

    brand_category = (brand_context.get("brand_category") or "generic").strip().lower()
    # Pipeline contract: search context first, website evidence second, then normalized AI output.
    ai_overview = fetch_google_ai_overview(keyword, brand_category=brand_category)
    html = scrape_website_content(url)

    logger.info("Calling AI engine...")
    ai_result = ai_analysis(ai_overview, html, brand_context=brand_context)

    las_score = calculate_las(ai_result)
    trust_score = calculate_trust_score(
        html,
        citations=ai_overview.get("citations", []),
        technical_audit=ai_result.get("technical_audit", []),
    )
    charts = ai_result.get("charts", {}) if isinstance(ai_result, dict) else {}
    if isinstance(charts, dict):
        av = charts.get("authority_vs_visibility")
        if isinstance(av, dict):
            av["labels"] = ["Citation Authority", "Visibility"]
            av["values"] = [trust_score, ai_result.get("visibility", 0)]

    # Persist extraction metadata so async status/history endpoints can explain result confidence.
    extraction_meta = ai_result.get("extraction", {})
    overview_text = ai_overview.get("text", "")
    return {
        "keyword": keyword,
        "url": url,
        "las_score": las_score,
        "trust_score": trust_score,
        "citation_authority": trust_score,
        "analysis": ai_result,
        "analysis_language": ai_result.get("language", "en"),
        "charts": ai_result.get("charts", {}),
        "market_intel": ai_result.get("market_intel", {}),
        "gap_analysis": ai_result.get("gap_analysis", {}),
        "technical_audit": ai_result.get("technical_audit", []),
        "action_plan": ai_result.get("action_plan", []),
        "recommended_playbook": ai_result.get("recommended_playbook", []),
        "ai_overview_text": overview_text,
        "ai_overview_preview": overview_text[:150] + "...",
        "overview_source_type": ai_overview.get("source_type"),
        "overview_fetch_mode": ai_overview.get("fetch_mode"),
        "overview_confidence": ai_overview.get("confidence"),
        "citations": ai_overview.get("citations", []),
        "extraction_method": extraction_meta.get("extraction_method"),
        "clean_char_count": extraction_meta.get("clean_char_count"),
        "source_char_count": extraction_meta.get("source_char_count"),
        "html_preview": html[:300] + "...",
    }


def generate_screenshot_path():
    """
    Generate a unique screenshot path inside backend/static/screenshots.
    """
    filename = f"snap_{uuid.uuid4().hex}.png"
    folder = os.path.join("backend", "static", "screenshots")
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, filename), f"/static/screenshots/{filename}"


def capture_screenshot(url, screenshot_path):
    """
    Sync wrapper for screenshot capture.
    """
    try:
        return asyncio.run(_capture_screenshot_async(url, screenshot_path))
    except Exception:
        logger.exception("Async loop error (capture screenshot)")
        return {
            "success": False,
            "captured_at": None,
            "dom_loaded_ms": None,
        }
