import os
import logging
import uuid

from flask import Flask, jsonify, request, g
from flask_session import Session
from backend.routes.analysis_routes import analysis_bp
from backend.routes.auth_routes import auth_bp
from backend.routes.brand_routes import brand_bp
from backend.routes.dashboard_routes import dashboard_bp

app = Flask(__name__, static_folder="backend/static", static_url_path="/static")

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s"
)

# Session configuration
# Keep local development friction low, but require FLASK_SECRET_KEY for secure deployments.
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-secret-change-me")
if app.secret_key == "dev-only-secret-change-me":
    app.logger.warning("FLASK_SECRET_KEY is not set. Using insecure development secret.")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True
app.config["SESSION_FILE_DIR"] = os.path.join("backend", "flask_session")
os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)
Session(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(brand_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(dashboard_bp)


# Request ID middleware
@app.before_request
def set_request_id():
    # Preserve client-provided IDs for tracing across frontend and backend logs.
    rid = request.headers.get("X-Request-Id")
    g.request_id = rid or str(uuid.uuid4())


@app.after_request
def add_request_id_header(response):
    if hasattr(g, "request_id"):
        response.headers["X-Request-Id"] = g.request_id
    return response


# Error handlers
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "bad_request",
            "message": "Bad request",
            "request_id": getattr(g, "request_id", None)
        }
    }), 400


@app.errorhandler(401)
def unauthorized(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "unauthorized",
            "message": "Unauthorized",
            "request_id": getattr(g, "request_id", None)
        }
    }), 401


@app.errorhandler(403)
def forbidden(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "forbidden",
            "message": "Forbidden",
            "request_id": getattr(g, "request_id", None)
        }
    }), 403


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "not_found",
            "message": "Endpoint not found",
            "request_id": getattr(g, "request_id", None)
        }
    }), 404


@app.errorhandler(500)
def internal_error(error):
    app.logger.exception("Internal server error")
    return jsonify({
        "success": False,
        "error": {
            "code": "internal_error",
            "message": "Internal server error",
            "request_id": getattr(g, "request_id", None)
        }
    }), 500


if __name__ == "__main__":
    print("=" * 50)
    print("AnswerScope AI Backend Server Starting...")
    print("Endpoints:")
    print("  POST /api/register")
    print("  POST /api/login")
    print("  GET  /api/me")
    print("  GET  /api/profile")
    print("  POST /api/profile")
    print("  POST /api/logout")
    print("  POST /api/brand")
    print("  GET  /api/brand/<user_id>")
    print("  POST /api/run-analysis")
    print("  POST /api/run-analysis-async")
    print("  GET  /api/analysis-status/<job_id>")
    print("  GET  /api/dashboard/scan-history/<user_id>")
    print("  GET  /api/dashboard/scan-result/<scan_id>")
    print("  GET  /api/dashboard/stats/<user_id>")
    print("  GET  /api/dashboard/insights/<user_id>")
    print("  GET  /api/dashboard/pillar-averages/<user_id>")
    print("  GET  /api/dashboard/trends/<user_id>?metric=share_of_voice&window=30d")
    print("  GET  /api/dashboard/citations/<user_id>?window=30d")
    print("  GET  /api/report/<scan_id>/pdf")
    print("=" * 50)
    app.run(debug=True, port=5000, host="0.0.0.0")
