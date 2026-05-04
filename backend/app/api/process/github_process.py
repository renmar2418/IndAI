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

import os
import uuid
from flask import redirect
from app.models.github_connection import GitHubConnection

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://ind-ai-five.vercel.app")

@github_process_bp.route("/connect", methods=["GET"])
def connect_github():
    """Redirect user to GitHub OAuth authorization page."""
    user_id = request.args.get("user_id")
    if not user_id or user_id == "undefined" or user_id == "null":
        return jsonify({"error": "User ID required"}), 400
        
    state = f"{user_id}_{uuid.uuid4().hex}"
    
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&scope=repo"
        f"&state={state}"
    )
    return redirect(auth_url)

@github_process_bp.route("/callback", methods=["GET"])
def github_callback():
    """Handle OAuth callback from GitHub."""
    code = request.args.get("code")
    state = request.args.get("state")
    
    if not code or not state:
        return redirect(f"{FRONTEND_URL}/github?error=missing_auth_params")
        
    try:
        user_id = int(state.split("_")[0])
    except ValueError:
        return redirect(f"{FRONTEND_URL}/github?error=invalid_state")

    # Exchange code for token
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
    }
    
    response = requests.post(token_url, headers=headers, data=data)
    if response.status_code != 200:
        return redirect(f"{FRONTEND_URL}/github?error=token_exchange_failed")
        
    token_data = response.json()
    access_token = token_data.get("access_token")
    
    if not access_token:
        return redirect(f"{FRONTEND_URL}/github?error=no_access_token")
        
    # Get GitHub user info
    user_url = "https://api.github.com/user"
    user_headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
    }
    user_response = requests.get(user_url, headers=user_headers)
    if user_response.status_code != 200:
        return redirect(f"{FRONTEND_URL}/github?error=github_user_fetch_failed")
        
    github_user = user_response.json()
    github_username = github_user.get("login")
    
    # Save connection
    GitHubConnection.upsert(user_id=user_id, github_username=github_username, access_token=access_token)
    
    return redirect(f"{FRONTEND_URL}/github?success=true")

@github_process_bp.route("/repos", methods=["GET"])
@login_required
def get_repos():
    """List repositories for the connected user."""
    from flask import g, request
    user = g.current_user
    conn = GitHubConnection.query.filter_by(user_id=user.id).first()
    if not conn:
        return jsonify({"error": "GitHub not connected"}), 401
        
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)
    if per_page > 100:
        per_page = 100

    repos_url = f"https://api.github.com/user/repos?sort=updated&per_page={per_page}&page={page}"
    headers = {
        "Authorization": f"Bearer {conn.access_token}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    response = requests.get(repos_url, headers=headers)
    
    if response.status_code == 403 and response.headers.get("X-RateLimit-Remaining") == "0":
        return jsonify({"error": "GitHub API rate limit exceeded. Please try again later."}), 429
    elif response.status_code != 200:
        return jsonify({"error": "Failed to fetch repositories"}), response.status_code
        
    has_more = "rel=\"next\"" in response.headers.get("Link", "")
    repos = response.json()
    repo_list = [
        {
            "id": r["id"],
            "name": r["name"],
            "full_name": r["full_name"],
            "private": r["private"],
            "html_url": r["html_url"],
            "description": r["description"],
            "language": r["language"],
            "updated_at": r["updated_at"]
        } for r in repos
    ]
    
    return jsonify({"success": True, "data": repo_list, "pagination": {"page": page, "per_page": per_page, "has_more": has_more}})

@github_process_bp.route("/repos/tree", methods=["GET"])
@login_required
def get_repo_tree():
    """Fetch the full file tree of the repository."""
    from flask import g, request
    repo_full_name = request.args.get("repo")
    if not repo_full_name:
        return jsonify({"error": "Repository name is required"}), 400
        
    user = g.current_user
    conn = GitHubConnection.query.filter_by(user_id=user.id).first()
    
    headers = {"Accept": "application/vnd.github.v3+json"}
    if conn:
        headers["Authorization"] = f"Bearer {conn.access_token}"
    
    # Get the default branch first
    repo_url = f"https://api.github.com/repos/{repo_full_name}"
    
    resp = requests.get(repo_url, headers=headers)
    if resp.status_code == 404:
        return jsonify({"error": "Repository not found or is private."}), 404
    elif resp.status_code == 403 and resp.headers.get("X-RateLimit-Remaining") == "0":
        return jsonify({"error": "GitHub API rate limit exceeded. Please try again later."}), 429
    elif resp.status_code != 200:
        return jsonify({"error": "Failed to fetch repository details"}), resp.status_code
        
    default_branch = resp.json().get("default_branch", "main")
    
    # Get the tree recursively
    tree_url = f"https://api.github.com/repos/{repo_full_name}/git/trees/{default_branch}?recursive=1"
    tree_resp = requests.get(tree_url, headers=headers)
    if tree_resp.status_code == 403 and tree_resp.headers.get("X-RateLimit-Remaining") == "0":
        return jsonify({"error": "GitHub API rate limit exceeded. Please try again later."}), 429
    elif tree_resp.status_code != 200:
        return jsonify({"error": "Failed to fetch repository tree"}), tree_resp.status_code
        
    tree_data = tree_resp.json().get("tree", [])
    truncated = tree_resp.json().get("truncated", False)
    
    # Filter for blob (file) and valid extensions
    valid_extensions = ('.js', '.jsx', '.ts', '.tsx', '.py', '.php', '.java', '.go', '.rb', '.c', '.cpp', '.h', '.cs', '.html', '.css')
    files = []
    
    for item in tree_data:
        if item.get("type") == "blob":
            path = item.get("path", "")
            if path.endswith(valid_extensions) and "node_modules" not in path and "vendor" not in path:
                files.append(path)
                
    return jsonify({"success": True, "files": files, "truncated": truncated})

@github_process_bp.route("/repos/scan", methods=["POST"])
@login_required
def scan_repo():
    """Start batch scan for a repository."""
    from flask import g, request
    from app.services.batch_scan_service import enqueue_batch_scan
    
    repo_full_name = request.args.get("repo")
    if not repo_full_name:
        return jsonify({"error": "Repository name is required"}), 400
        
    user = g.current_user
    data = request.json or {}
    files = data.get("files", [])
    
    if not files:
        return jsonify({"error": "No files provided for scanning"}), 400
        
    # Cap to 50 files to prevent overload
    if len(files) > 50:
        files = files[:50]
        
    job_id = enqueue_batch_scan(user.id, repo_full_name, files)
    
    return jsonify({
        "success": True, 
        "message": f"Scan queued for {len(files)} files.", 
        "scan_id": job_id
    })

@github_process_bp.route("/scans/<scan_id>/status", methods=["GET"])
@login_required
def get_scan_status_route(scan_id):
    """Poll the status of a batch scan."""
    from app.services.batch_scan_service import get_scan_status
    
    status_data = get_scan_status(scan_id)
    return jsonify({"success": True, "data": status_data})

@github_process_bp.route("/scans/<scan_id>", methods=["DELETE"])
@login_required
def cancel_scan_route(scan_id):
    """Cancel an active batch scan."""
    from app.services.batch_scan_service import cancel_batch_scan
    
    try:
        success = cancel_batch_scan(scan_id)
        if success:
            return jsonify({"success": True, "message": "Scan cancelled successfully"})
        return jsonify({"error": "Failed to cancel scan"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
