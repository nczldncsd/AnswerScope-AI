# brand.py
"""
AnswerScope AI - Brand Profile Module
Handles brand profile database operations.
No Flask routes. No AI logic. No scraping.
"""

import json

from .database import get_db_connection
from .logger import get_logger

logger = get_logger(__name__)


def create_brand_profile(user_id, brand_name, website_url, competitors, brand_category="generic"):
    """
    Create a new brand profile for a user.
    competitors: list of competitor URLs (will be stored as JSON string)
    Returns brand_profile_id if successful, None if failed.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Convert competitors list to JSON string
        competitors_json = json.dumps(competitors) if competitors else "[]"
        
        category = (brand_category or "generic").strip().lower()
        cursor.execute(
            """
            INSERT INTO brand_profiles (user_id, brand_name, website_url, competitors, brand_category)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, brand_name, website_url, competitors_json, category)
        )
        
        brand_profile_id = cursor.lastrowid
        conn.commit()
        return brand_profile_id
    except Exception as e:
        logger.exception("Error creating brand profile")
        return None
    finally:
        conn.close()

def get_brand_profile_by_user(user_id):
    """
    Get the latest brand profile for a user.
    Returns brand profile as dict or None if not found.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        """SELECT * FROM brand_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1""",
        (user_id,)
    )
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        # Convert sqlite3.Row to dict
        return dict(row)
    return None

def get_brand_profile_by_id(brand_profile_id):
    """
    Get brand profile by ID.
    Returns brand profile as dict or None if not found.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM brand_profiles WHERE id = ?",
        (brand_profile_id,)
    )
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None
