"""
AnswerScope AI - Database Module
Handles SQLite setup and schema initialization.
Follows PRD Table Definitions exactly.
"""

import os
import sqlite3

from .logger import get_logger

logger = get_logger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BACKEND_DIR, "database.db")

def _table_columns(conn, table_name):
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}

def _ensure_column(conn, table_name, column_name, column_type):
    columns = _table_columns(conn, table_name)
    if column_name not in columns:
        cursor = conn.cursor()
        cursor.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
        )

def _create_base_tables(conn):
    cursor = conn.cursor()

    # User Table (PRD Section 10)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            logo_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # BrandProfile Table (PRD Section 10)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS brand_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            brand_name TEXT NOT NULL,
            website_url TEXT NOT NULL,
            competitors TEXT,
            brand_category TEXT DEFAULT 'generic',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # ScanResult Table (report snapshot + metadata)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_profile_id INTEGER NOT NULL,
            keyword TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            las_score REAL,
            trust_score REAL,
            breakdown_json TEXT,
            raw_report_json TEXT,
            screenshot_url TEXT,
            overview_source_type TEXT,
            overview_fetch_mode TEXT,
            overview_confidence TEXT,
            extraction_method TEXT,
            FOREIGN KEY (brand_profile_id) REFERENCES brand_profiles (id)
        )
    ''')

    # Analysis Jobs Table (Async pipeline tracking)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_jobs (
            job_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            scan_context_id TEXT,
            est_duration_sec INTEGER,
            status TEXT NOT NULL,
            stage_label TEXT,
            progress INTEGER NOT NULL DEFAULT 0,
            screenshot_url TEXT,
            captured_at TEXT,
            dom_loaded_ms REAL,
            overview_source_type TEXT,
            overview_fetch_mode TEXT,
            extraction_method TEXT,
            error TEXT,
            result_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Per-job stage/event timeline
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_run_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            scan_id INTEGER,
            event_type TEXT NOT NULL,
            stage_label TEXT,
            details_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES analysis_jobs (job_id),
            FOREIGN KEY (scan_id) REFERENCES scan_results (id)
        )
    ''')

    # Normalized metrics for trend lines and share-of-voice style analysis
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id INTEGER NOT NULL,
            brand_profile_id INTEGER NOT NULL,
            keyword TEXT NOT NULL,
            metric_key TEXT NOT NULL,
            metric_value REAL NOT NULL,
            platform TEXT,
            competitor_domain TEXT,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scan_id) REFERENCES scan_results (id),
            FOREIGN KEY (brand_profile_id) REFERENCES brand_profiles (id)
        )
    ''')

    # Citation-level rows from AI overview providers/models
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_citations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id INTEGER NOT NULL,
            brand_profile_id INTEGER NOT NULL,
            keyword TEXT NOT NULL,
            citation_domain TEXT,
            citation_url TEXT,
            position INTEGER,
            source_model TEXT,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scan_id) REFERENCES scan_results (id),
            FOREIGN KEY (brand_profile_id) REFERENCES brand_profiles (id)
        )
    ''')

    # Prompt-level monitoring observations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prompt_observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id INTEGER NOT NULL,
            brand_profile_id INTEGER NOT NULL,
            keyword TEXT NOT NULL,
            prompt_text TEXT NOT NULL,
            platform TEXT,
            brand_mentioned INTEGER DEFAULT 0,
            rank_slot INTEGER,
            sentiment TEXT,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scan_id) REFERENCES scan_results (id),
            FOREIGN KEY (brand_profile_id) REFERENCES brand_profiles (id)
        )
    ''')

def _ensure_backwards_compatibility(conn):
    # Existing DBs may have older table shapes
    for column_name, column_type in (
        ("name", "TEXT"),
        ("logo_url", "TEXT"),
    ):
        _ensure_column(conn, "users", column_name, column_type)

    for column_name, column_type in (
        ("brand_category", "TEXT DEFAULT 'generic'"),
    ):
        _ensure_column(conn, "brand_profiles", column_name, column_type)
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE brand_profiles
        SET brand_category = 'generic'
        WHERE brand_category IS NULL OR TRIM(brand_category) = ''
        """
    )

    for column_name, column_type in (
        ("screenshot_url", "TEXT"),
        ("overview_source_type", "TEXT"),
        ("overview_fetch_mode", "TEXT"),
        ("overview_confidence", "TEXT"),
        ("extraction_method", "TEXT"),
    ):
        _ensure_column(conn, "scan_results", column_name, column_type)

    for column_name, column_type in (
        ("scan_context_id", "TEXT"),
        ("est_duration_sec", "INTEGER"),
        ("stage_label", "TEXT"),
        ("captured_at", "TEXT"),
        ("dom_loaded_ms", "REAL"),
        ("overview_source_type", "TEXT"),
        ("overview_fetch_mode", "TEXT"),
        ("extraction_method", "TEXT"),
    ):
        _ensure_column(conn, "analysis_jobs", column_name, column_type)

def _create_indexes(conn):
    cursor = conn.cursor()
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_scan_metrics_brand_keyword_time
        ON scan_metrics(brand_profile_id, keyword, recorded_at)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_scan_metrics_scan_metric
        ON scan_metrics(scan_id, metric_key)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_scan_metrics_brand_comp_time
        ON scan_metrics(brand_profile_id, competitor_domain, recorded_at)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_scan_citations_brand_time
        ON scan_citations(brand_profile_id, recorded_at)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_scan_events_job_time
        ON scan_run_events(job_id, created_at)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_prompt_obs_brand_time
        ON prompt_observations(brand_profile_id, recorded_at)
    ''')

def ensure_schema():
    conn = sqlite3.connect(DB_PATH)
    try:
        _create_base_tables(conn)
        _ensure_backwards_compatibility(conn)
        _create_indexes(conn)
        conn.commit()
    finally:
        conn.close()

def init_db():
    """
    Initialize SQLite database with required tables.
    Called once at application startup.
    """
    ensure_schema()
    logger.info("Initialized at %s", DB_PATH)

def get_db_connection():
    """
    Returns a new SQLite connection with row factory.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Access columns by name
    return conn

# Auto-initialize on import
if not os.path.exists(DB_PATH):
    init_db()
else:
    ensure_schema()
