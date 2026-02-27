# scoring.py
"""
AnswerScope AI - Scoring Module
Deterministic scoring logic only. No AI calls, no Flask.
"""

import re
from html.parser import HTMLParser


class MetaTagParser(HTMLParser):
    """Simple parser to count meta tags in HTML."""
    def __init__(self):
        super().__init__()
        self.meta_count = 0
    
    def handle_starttag(self, tag, attrs):
        if tag == 'meta':
            self.meta_count += 1


class SchemaTagParser(HTMLParser):
    """Counts JSON-LD blocks that may contain schema entities."""

    def __init__(self):
        super().__init__()
        self.json_ld_count = 0

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return
        attrs_map = {k.lower(): (v or "") for k, v in attrs}
        if attrs_map.get("type", "").lower() == "application/ld+json":
            self.json_ld_count += 1


def _to_score(value):
    try:
        return max(0.0, min(100.0, float(value)))
    except Exception:
        return 0.0


def calculate_las(ai_result):
    """
    Calculate LAS (LLM Answerability Score) from AI analysis result.
    Returns integer 0-100.
    Weighted formula:
    visibility 40%, content 30%, technical 20%, visual 10%.
    """
    visibility = _to_score(ai_result.get("visibility", 0))
    content = _to_score(ai_result.get("content", 0))
    technical = _to_score(ai_result.get("technical", 0))
    visual = _to_score(ai_result.get("visual", 0))

    las = (
        (visibility * 0.40)
        + (content * 0.30)
        + (technical * 0.20)
        + (visual * 0.10)
    )
    return max(0, min(100, int(round(las))))


def calculate_trust_score(html, citations=None, technical_audit=None):
    """
    Calculate citation authority score.
    Returns integer 0-100.
    Signals:
    - citation count and diversity from AI sources
    - secure/reference signals in page links
    - metadata and schema markup presence
    - technical audit schema pass flags
    """
    score = 0.0
    html = html or ""

    # Reference security signal
    https_pattern = r'https://[^\s"\']+'
    https_matches = re.findall(https_pattern, html, re.IGNORECASE)
    if https_matches:
        score += 20

    # Metadata signal
    parser = MetaTagParser()
    try:
        parser.feed(html)
        score += min(15, parser.meta_count * 2)
    except Exception:
        pass

    # Schema signal from JSON-LD blocks
    schema_parser = SchemaTagParser()
    try:
        schema_parser.feed(html)
        score += min(20, schema_parser.json_ld_count * 8)
    except Exception:
        pass

    # Citation signal from AI overview sources
    citations = citations if isinstance(citations, list) else []
    citation_count = len([c for c in citations if isinstance(c, dict)])
    domains = set()
    for row in citations:
        if not isinstance(row, dict):
            continue
        domain = str(row.get("domain") or "").strip().lower()
        if domain:
            domains.add(domain)
    score += min(30, citation_count * 5)
    score += min(10, len(domains) * 2)

    # Technical audit schema pass bonus
    technical_audit = technical_audit if isinstance(technical_audit, list) else []
    for item in technical_audit:
        if not isinstance(item, dict):
            continue
        check = str(item.get("check") or "").lower()
        status = str(item.get("status") or "").lower()
        if "schema" in check and status in {"pass", "ok", "true"}:
            score += 5

    return max(0, min(100, int(round(score))))
