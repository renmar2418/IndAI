"""
IndAI — Batch Scan Service
Orchestrates background processing of GitHub repositories.
"""

import json
import requests
import os
from flask import current_app
from redis import Redis
from rq import Queue
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability
from app.models.github_connection import GitHubConnection
from app.engine.scanner import Scanner
from app import create_app
from app.extensions import db

# Initialize Redis Queue
redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
redis_conn = Redis.from_url(redis_url)
q = Queue('default', connection=redis_conn)

def enqueue_batch_scan(user_id, repo_name, files):
    """
    Enqueues a batch scan job in Redis and returns the Job ID (which acts as the scan ID).
    """
    # Detect the specific languages from file extensions
    ext_to_lang = {
        'py': 'Python', 'js': 'JavaScript', 'jsx': 'JavaScript', 'ts': 'TypeScript',
        'tsx': 'TypeScript', 'php': 'PHP', 'java': 'Java', 'go': 'Go', 'rb': 'Ruby',
        'c': 'C', 'cpp': 'C++', 'h': 'C', 'cs': 'C#', 'html': 'HTML', 'css': 'CSS'
    }
    detected_langs = set()
    for f in files:
        ext = f.rsplit('.', 1)[-1].lower() if '.' in f else ''
        if ext in ext_to_lang:
            detected_langs.add(ext_to_lang[ext])
    
    language_str = ', '.join(sorted(detected_langs)) if detected_langs else 'Unknown'
    
    # Use repo short name as scan identifier
    repo_short = repo_name.split('/')[-1] if '/' in repo_name else repo_name
    
    scan = Scan.create(
        user_id=user_id, 
        original_code=f"// [GitHub Batch Scan] Repository: {repo_name}\n// Files scanned: {len(files)}\n// Languages: {language_str}",
        language=language_str
    )
    
    job = q.enqueue(_process_batch_scan, scan.id, user_id, repo_name, files, job_timeout=3600)
    
    _update_progress(job.id, {
        "status": "queued",
        "progress": 0,
        "total_files": len(files),
        "current_file": None,
        "scan_id": scan.id
    })
    
    return job.id

def get_scan_status(job_id):
    """
    Retrieves the current status of the batch scan from Redis.
    """
    progress_data = redis_conn.get(f"scan_progress:{job_id}")
    if progress_data:
        return json.loads(progress_data)
    
    # Check if job exists in RQ
    job = q.fetch_job(job_id)
    if job:
        return {
            "status": job.get_status(),
            "progress": 0,
            "scan_id": job.args[0] if job.args else None
        }
        
    return {"status": "not_found"}

def cancel_batch_scan(job_id):
    """
    Flags a job for cancellation so the worker will abort it mid-flight.
    """
    redis_conn.setex(f"scan_cancelled:{job_id}", 86400, "1")
    
    # Try to cancel it in RQ directly in case it hasn't started yet
    try:
        q.fetch_job(job_id).cancel()
    except:
        pass
        
    _update_progress(job_id, {
        "status": "failed",
        "error": "Scan was cancelled by the user",
        "progress": 0,
        "current_file": "Cancelled"
    })
    return True

def _update_progress(job_id, data):
    """Helper to write progress state to Redis."""
    redis_conn.setex(f"scan_progress:{job_id}", 86400, json.dumps(data))  # Expire after 24h

def _process_batch_scan(scan_id, user_id, repo_name, files):
    """
    The background worker function.
    Runs outside of the standard Flask request context, so we must create an app context.
    """
    app = create_app()
    with app.app_context():
        from rq import get_current_job
        job = get_current_job()
        job_id = job.id if job else f"mock_{scan_id}"
        
        # 1. Fetch connection to get access token (optional for public repos)
        conn = GitHubConnection.query.filter_by(user_id=user_id).first()
        access_token = conn.access_token if conn else None
        
        engine = Scanner()
        
        # 2. Iterate through files
        total = len(files)
        all_vulnerabilities = []
        all_corrected_code = []
        highest_severity = 0
        
        _update_progress(job_id, {
            "status": "scanning",
            "progress": 0,
            "total_files": total,
            "current_file": "Initializing...",
            "scan_id": scan_id
        })
        
        import time
        for idx, file_path in enumerate(files):
            # Check for cancellation
            if redis_conn.get(f"scan_cancelled:{job_id}"):
                scan = Scan.find_by_id(scan_id)
                if scan:
                    scan.update(status=Scan.STATUS_FAILED)
                print(f"Job {job_id} was cancelled by user.")
                return

            # Update progress
            progress = int((idx / total) * 100)
            _update_progress(job_id, {
                "status": "scanning",
                "progress": progress,
                "total_files": total,
                "current_file": file_path,
                "scan_id": scan_id
            })
            
            # Fetch raw file content from GitHub
            raw_url = f"https://api.github.com/repos/{repo_name}/contents/{file_path}"
            headers = {
                "Accept": "application/vnd.github.v3.raw"
            }
            if access_token:
                headers["Authorization"] = f"Bearer {access_token}"
            
            try:
                resp = requests.get(raw_url, headers=headers)
                
                # Rate limit handling
                if resp.status_code in [403, 429]:
                    if resp.headers.get("X-RateLimit-Remaining") == "0":
                        reset_time = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
                        sleep_time = max(0, reset_time - int(time.time()))
                        
                        # Abort if we need to sleep for too long
                        if sleep_time > 60:
                            _update_progress(job_id, {"status": "failed", "error": f"GitHub API rate limit exceeded. Reset in {sleep_time}s.", "progress": progress})
                            scan = Scan.find_by_id(scan_id)
                            if scan:
                                scan.update(status=Scan.STATUS_FAILED)
                            db.session.commit()
                            return
                        time.sleep(sleep_time + 1)
                        resp = requests.get(raw_url, headers=headers) # Retry once
                    
                    # File too large for contents API
                    if resp.status_code == 403 and "too large" in resp.text.lower():
                        print(f"Skipping {file_path}: File too large for GitHub API")
                        continue

                if resp.status_code == 200:
                    code_content = resp.text
                    
                    # Extra protection against massive files freezing the scanner (50MB)
                    if len(code_content) > 50000000:
                        print(f"Skipping {file_path}: Exceeds 50MB internal limit")
                        continue
                        
                    # Run AI analysis (determine language roughly from extension)
                    ext = file_path.split('.')[-1].lower() if '.' in file_path else 'javascript'
                    
                    try:
                        report = engine.scan(code_content, language=ext)
                    except ValueError:
                        # Skip files that aren't valid code
                        continue
                    
                    # Save vulnerabilities for this file
                    findings = report.get("findings", [])
                    print(f"  → {file_path}: {len(findings)} findings")
                    
                    for vuln_data in findings:
                        severity = str(vuln_data.get("severity", "low")).lower()
                        # Normalize severity values
                        if severity not in ("critical", "high", "medium", "low", "info"):
                            severity = "medium"
                        
                        severity_score = _calculate_severity_score(severity.capitalize())
                        if severity_score > highest_severity:
                            highest_severity = severity_score
                        
                        # Parse line number from file path
                        line_num = vuln_data.get("line_number", 0)
                        
                        vuln = Vulnerability(
                            scan_id=scan_id,
                            rule_id=vuln_data.get("rule_id", f"github-scan-{file_path}"),
                            severity=severity,
                            title=vuln_data.get("title", "Unknown Vulnerability"),
                            description=vuln_data.get("description", ""),
                            line_number=line_num if isinstance(line_num, int) else 0,
                            column=vuln_data.get("column", 0),
                            code_snippet=vuln_data.get("code_snippet", ""),
                            suggested_fix=vuln_data.get("suggested_fix", ""),
                            owasp_category=vuln_data.get("owasp_category", "")
                        )
                        db.session.add(vuln)
                        all_vulnerabilities.append(vuln)
                    
                    # Also save the corrected code for each file
                    corrected = report.get("corrected_code", "")
                    if corrected and findings:
                        all_corrected_code.append(f"// ── {file_path} ──\n{corrected}")
                    
                    # Commit after each file so vulnerabilities are saved even if later files fail
                    if findings:
                        db.session.commit()
                        
            except Exception as e:
                print(f"Error processing {file_path}: {str(e)}")
                continue
                
        # 3. Finalize Scan
        vuln_count = len(all_vulnerabilities)
        print(f"\n✅ Batch scan complete. Total vulnerabilities found: {vuln_count}")
        
        scan = Scan.find_by_id(scan_id)
        if scan:
            scan.update(
                status=Scan.STATUS_COMPLETED, 
                vulnerability_count=vuln_count,
                corrected_code="\n\n".join(all_corrected_code) if all_corrected_code else None
            )
            db.session.commit()
            
        _update_progress(job_id, {
            "status": "completed",
            "progress": 100,
            "total_files": total,
            "current_file": "Done",
            "scan_id": scan_id,
            "vulnerability_count": vuln_count
        })
        
def _calculate_severity_score(severity):
    """Helper to convert string severity to integer score."""
    mapping = {"Critical": 100, "High": 80, "Medium": 50, "Low": 20, "Info": 5}
    return mapping.get(severity, 0)
