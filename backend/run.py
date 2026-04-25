"""
IndAI — Application Entry Point
Run with: python run.py
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Force UTF-8 output on Windows
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")

    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    env_label = "Development" if debug else "Production"

    print(f"""
    ===================================================
    |                                                   |
    |   IndAI - Intelligent Detection AI                |
    |   Code Security Auditing System                   |
    |                                                   |
    |   Server:  http://localhost:{port}                  |
    |   Env:     {env_label:<12s}                        |
    |   Rules:   OWASP Security Rules                |
    |                                                   |
    ===================================================
    """)

    app.run(host="0.0.0.0", port=port, debug=debug)
