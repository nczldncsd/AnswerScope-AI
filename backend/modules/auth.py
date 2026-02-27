"""
AnswerScope AI - Authentication Module
Handles user password hashing and database operations.
No Flask routes. No HTML.
"""

import sqlite3
from werkzeug.security import check_password_hash, generate_password_hash

from .database import get_db_connection


def hash_password(password):
    """
    Hash a password using werkzeug.
    Returns hashed password string.
    """
    return generate_password_hash(password)

def create_user(email, password):
    """
    Create a new user in the database.
    Returns user_id if successful, None if failed.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        hashed_pw = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email, hashed_pw)
        )
        user_id = cursor.lastrowid
        conn.commit()
        return user_id
    except sqlite3.IntegrityError:
        # Email already exists
        return None
    finally:
        conn.close()

def verify_user(email, password):
    """
    Verify user credentials.
    Returns user_id if valid, None if invalid.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, password_hash FROM users WHERE email = ?",
        (email,)
    )
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        return user['id']
    return None


def get_user_by_id(user_id):
    """
    Fetch user identity fields by user_id.
    Returns dict-like row or None.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, name, logo_url FROM users WHERE id = ?",
        (user_id,),
    )
    user = cursor.fetchone()
    conn.close()
    return user


def update_user_profile(user_id, name=None, logo_url=None):
    """
    Update optional user profile fields.
    Returns True when at least one field is updated.
    """
    updates = []
    values = []

    if name is not None:
        updates.append("name = ?")
        values.append(name)
    if logo_url is not None:
        updates.append("logo_url = ?")
        values.append(logo_url)

    if not updates:
        return False

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
        (*values, user_id),
    )
    conn.commit()
    conn.close()
    return True
