# brand_routes.py
"""
AnswerScope AI - Brand Profile Routes
Flask blueprint for brand profile endpoints.
Returns JSON only. No HTML templates.
"""

from flask import Blueprint, request, jsonify, session, g
from backend.modules.brand import create_brand_profile, get_brand_profile_by_user
from backend.modules.utils import is_valid_url, parse_competitors

brand_bp = Blueprint('brand_bp', __name__)
ALLOWED_BRAND_CATEGORIES = {"generic", "ecommerce", "saas", "local"}

def _error(message, code, status):
    return jsonify({
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "request_id": g.get("request_id")
        }
    }), status

@brand_bp.route('/api/brand', methods=['POST'])
def save_brand():
    """
    Save a brand profile for a user.
    Expects JSON: {
        "user_id": 1,
        "brand_name": "Example",
        "website_url": "https://example.com",
        "competitors": ["comp1.com", "comp2.com"]
    }
    Returns JSON with brand_profile_id or error.
    """
    data = request.get_json() or request.form
    
    user_id = session.get('user_id')
    if not user_id:
        return _error("Authentication required", "unauthorized", 401)

    # Validate required fields
    required_fields = ['brand_name', 'website_url']
    for field in required_fields:
        if field not in data:
                return _error(f"Missing required field: {field}", "validation_error", 400)
    
    brand_name = data['brand_name'].strip()
    website_url = data['website_url'].strip()

    if not brand_name:
        return _error("Brand name cannot be empty", "validation_error", 400)

    if not is_valid_url(website_url):
        return _error("Invalid website URL", "validation_error", 400)
    
    # Get competitors (optional)
    competitors = parse_competitors(data.get('competitors', []))
    brand_category = (data.get("brand_category") or "generic").strip().lower()
    if brand_category not in ALLOWED_BRAND_CATEGORIES:
        return _error(
            "Invalid brand_category. Allowed: generic, ecommerce, saas, local",
            "validation_error",
            400,
        )
    
    brand_profile_id = create_brand_profile(
        user_id=user_id,
        brand_name=brand_name,
        website_url=website_url,
        competitors=competitors,
        brand_category=brand_category,
    )
    
    if brand_profile_id:
        return jsonify({
            "success": True,
            "brand_profile_id": brand_profile_id,
            "brand_category": brand_category,
            "message": "Brand profile saved successfully"
        })
    else:
        return _error("Failed to save brand profile", "internal_error", 500)

@brand_bp.route('/api/brand/<int:user_id>', methods=['GET'])
def get_brand(user_id):
    """
    Get the latest brand profile for a user.
    Returns brand profile JSON or empty object.
    """
    session_user_id = session.get('user_id')
    if not session_user_id:
        return _error("Authentication required", "unauthorized", 401)

    if int(session_user_id) != int(user_id):
        return _error("Forbidden", "forbidden", 403)

    brand_profile = get_brand_profile_by_user(session_user_id)
    
    if brand_profile:
        # Parse competitors from JSON string back to list
        if brand_profile.get('competitors'):
            import json
            try:
                brand_profile['competitors'] = json.loads(brand_profile['competitors'])
            except:
                brand_profile['competitors'] = []
        brand_profile["brand_category"] = (
            brand_profile.get("brand_category") or "generic"
        ).strip().lower()
        
        return jsonify({
            "success": True,
            "brand_profile": brand_profile
        })
    else:
        return jsonify({
            "success": True,
            "brand_profile": None,
            "message": "No brand profile found for this user"
        })
