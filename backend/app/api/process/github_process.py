"""
IndAI — GitHub Process API (Process Layer)
Fetches raw code from public GitHub repositories.
"""

import re
import requests
from flask import Blueprint, jsonify, request
from app.middleware.auth_middleware import login_required

github_process_bp = Blueprint("process_github", __name__)

def convert_to_raw_url(github_url):
    """
    Convert a standard GitHub UI URL to a raw.githubusercontent.com URL.
    Example:
    https://github.com/user/repo/blob/main/app.py ->
    https://raw.githubusercontent.com/user/repo/main/app.py
    """
    # If it's already a raw URL, return as is
    if github_url.startswith("https://raw.githubusercontent.com"):
        return github_url

    # Regex to extract user, repo, branch, and file path
    match = re.match(r"https://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.*)", github_url)
    if not match:
        return None

    user, repo, branch, file_path = match.groups()
    return f"https://raw.githubusercontent.com/{user}/{repo}/{branch}/{file_path}"

@github_process_bp.route("/fetch", methods=["POST"])
@login_required
def fetch_github_code():
    data = request.get_json()
    if not data or "url" not in data:
        return jsonify({"error": "Missing 'url' parameter"}), 400

    url = data["url"].strip()
    raw_url = convert_to_raw_url(url)

    if not raw_url:
        return jsonify({"error": "Invalid GitHub URL format. Use a URL like https://github.com/user/repo/blob/main/file.py"}), 400

    try:
        response = requests.get(raw_url, timeout=10)
        
        if response.status_code == 404:
            return jsonify({"error": "File not found on GitHub. Is the repository private?"}), 404
            
        response.raise_for_status()

        # Try to guess language based on extension
        filename = raw_url.split("/")[-1]
        
        return jsonify({
            "success": True,
            "data": {
                "content": response.text,
                "filename": filename,
                "url": url,
            }
        }), 200

    except requests.Timeout:
        return jsonify({"error": "Request to GitHub timed out"}), 504
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch from GitHub: {str(e)}"}), 500
