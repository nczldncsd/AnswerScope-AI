# auth_routes.py
"""
AnswerScope AI - Authentication Routes
Flask blueprint for user authentication endpoints.
Returns JSON only. No HTML templates.
"""

import os
import uuid

from flask import Blueprint, jsonify, request, session, g
from werkzeug.utils import secure_filename

from backend.modules.auth import (
    create_user,
    verify_user,
    get_user_by_id,
    update_user_profile,
)
from backend.modules.utils import is_valid_email, normalize_email

auth_bp = Blueprint('auth_bp', __name__)
ALLOWED_LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

def _error(message, code, status):
    return jsonify({
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "request_id": g.get("request_id")
        }
    }), status

@auth_bp.route('/api/register', methods=['POST'])
def register():
    """
    Register a new user.
    Expects JSON: {"email": "...", "password": "..."}
    Returns JSON with user_id or error.
    """
    data = request.get_json() or request.form
    
    if not data or 'email' not in data or 'password' not in data:
        return _error("Missing email or password", "validation_error", 400)
    
    email = normalize_email(data.get('email', ''))
    password = data.get('password', '')

    if not is_valid_email(email):
        return _error("Invalid email format", "validation_error", 400)

    if not password or len(password) < 8:
        return _error("Password must be at least 8 characters", "validation_error", 400)
    
    user_id = create_user(email, password)
    
    if user_id:
        # Set user session
        session['user_id'] = user_id
        return jsonify({
            "success": True,
            "user_id": user_id,
            "message": "User registered successfully"
        })
    else:
        return _error("Email already exists", "conflict", 409)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """
    Login existing user.
    Expects JSON: {"email": "...", "password": "..."}
    Returns JSON with user_id or error.
    """
    data = request.get_json() or request.form
    
    if not data or 'email' not in data or 'password' not in data:
        return _error("Missing email or password", "validation_error", 400)
    
    email = normalize_email(data.get('email', ''))
    password = data.get('password', '')

    if not is_valid_email(email):
        return _error("Invalid email format", "validation_error", 400)
    
    user_id = verify_user(email, password)
    
    if user_id:
        # Set user session
        session['user_id'] = user_id
        return jsonify({
            "success": True,
            "user_id": user_id,
            "message": "Login successful"
        })
    else:
        return _error("Invalid email or password", "unauthorized", 401)

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    """
    Logout current user.
    Clears session.
    """
    session.clear()
    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    })


@auth_bp.route('/api/me', methods=['GET'])
def me():
    """
    Return authenticated session identity.
    """
    user_id = session.get('user_id')
    if not user_id:
        return _error("Authentication required", "unauthorized", 401)

    user = get_user_by_id(user_id)
    if not user:
        session.clear()
        return _error("User not found for active session", "unauthorized", 401)

    return jsonify({
        "success": True,
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"] if "name" in user.keys() else None,
        "logo_url": user["logo_url"] if "logo_url" in user.keys() else None,
    })


@auth_bp.route('/api/profile', methods=['GET'])
def profile_get():
    """
    Return authenticated profile details.
    """
    user_id = session.get("user_id")
    if not user_id:
        return _error("Authentication required", "unauthorized", 401)

    user = get_user_by_id(user_id)
    if not user:
        session.clear()
        return _error("User not found for active session", "unauthorized", 401)

    return jsonify({
        "success": True,
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"] if "name" in user.keys() else None,
        "logo_url": user["logo_url"] if "logo_url" in user.keys() else None,
    })


@auth_bp.route('/api/profile', methods=['POST'])
def profile_upsert():
    """
    Update profile name/logo for authenticated user.
    Accepts form-data:
    - name: string (optional)
    - logo: file (optional)
    """
    user_id = session.get("user_id")
    if not user_id:
        return _error("Authentication required", "unauthorized", 401)

    data = request.form if request.form else (request.get_json(silent=True) or {})
    name_value = data.get("name")
    name = name_value.strip() if isinstance(name_value, str) else None

    if name is not None and len(name) == 0:
        name = None
    if name is not None and len(name) > 80:
        return _error("Name must be 80 characters or fewer", "validation_error", 400)

    logo = request.files.get("logo")
    logo_url = None
    if logo and logo.filename:
        safe_name = secure_filename(logo.filename)
        _, extension = os.path.splitext(safe_name.lower())
        if extension not in ALLOWED_LOGO_EXTENSIONS:
            return _error(
                "Invalid logo format. Allowed: png, jpg, jpeg, webp, gif",
                "validation_error",
                400,
            )
        logo_dir = os.path.join("backend", "static", "profile")
        os.makedirs(logo_dir, exist_ok=True)
        file_name = f"user_{user_id}_{uuid.uuid4().hex}{extension}"
        save_path = os.path.join(logo_dir, file_name)
        logo.save(save_path)
        logo_url = f"/static/profile/{file_name}"

    if name is None and logo_url is None:
        return _error("At least one profile field is required", "validation_error", 400)

    update_user_profile(
        user_id=user_id,
        name=name,
        logo_url=logo_url,
    )

    user = get_user_by_id(user_id)
    if not user:
        return _error("Failed to load updated profile", "internal_error", 500)

    return jsonify({
        "success": True,
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"] if "name" in user.keys() else None,
        "logo_url": user["logo_url"] if "logo_url" in user.keys() else None,
        "message": "Profile updated successfully",
    })
