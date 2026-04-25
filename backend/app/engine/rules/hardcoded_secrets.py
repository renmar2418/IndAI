"""
Rule: Hardcoded Secrets Detection
OWASP A07:2021 — Identification and Authentication Failures
Severity: High

Detects hardcoded passwords, API keys, tokens, and other secrets
embedded directly in source code.
"""

import re
from app.engine.security_rule import SecurityRule


class HardcodedSecretsRule(SecurityRule):
    """Detects hardcoded credentials and secrets in source code."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-004"
        self._title = "Hardcoded Secret/Credential"
        self._description = (
            "Hardcoded passwords, API keys, and tokens in source code can be exposed "
            "through version control, logs, or decompilation, leading to unauthorized access."
        )
        self._severity = "high"
        self._owasp_category = "A07:2021 - Identification and Authentication Failures"
        self._supported_languages = ["all"]

        self._patterns = [
            # Password assignments
            (re.compile(r'(?:password|passwd|pwd)\s*=\s*["\'][^"\']{3,}["\']', re.IGNORECASE), 'Hardcoded password'),
            # API key assignments
            (re.compile(r'(?:api_key|apikey|api_secret|apisecret)\s*=\s*["\'][^"\']{8,}["\']', re.IGNORECASE), 'Hardcoded API key'),
            # Token assignments
            (re.compile(r'(?:token|secret|secret_key|auth_token|access_token)\s*=\s*["\'][^"\']{8,}["\']', re.IGNORECASE), 'Hardcoded token/secret'),
            # AWS keys
            (re.compile(r'AKIA[0-9A-Z]{16}'), 'AWS Access Key ID'),
            # Generic long hex/base64 strings assigned to sensitive vars
            (re.compile(r'(?:private_key|encryption_key|signing_key)\s*=\s*["\'][^"\']{16,}["\']', re.IGNORECASE), 'Hardcoded encryption key'),
            # Connection strings with credentials
            (re.compile(r'(?:mysql|postgres|mongodb|redis)://\w+:[^@]+@', re.IGNORECASE), 'Database connection string with credentials'),
            # Bearer tokens
            (re.compile(r'["\']Bearer\s+[A-Za-z0-9\-._~+/]+=*["\']'), 'Hardcoded Bearer token'),

            # === Enhanced Patterns (v2) ===
            # GitHub Personal Access Tokens
            (re.compile(r'ghp_[A-Za-z0-9_]{36}'), 'GitHub Personal Access Token'),
            # GitHub OAuth App Tokens
            (re.compile(r'gho_[A-Za-z0-9_]{36}'), 'GitHub OAuth App Token'),
            # Stripe Secret Keys
            (re.compile(r'sk_live_[A-Za-z0-9]{24,}'), 'Stripe Secret Key'),
            # Stripe Publishable Keys (still a risk if hardcoded)
            (re.compile(r'pk_live_[A-Za-z0-9]{24,}'), 'Stripe Publishable Key'),
            # Google Cloud Service Account JSON
            (re.compile(r'"type"\s*:\s*"service_account"'), 'Google Cloud Service Account Key'),
            # Slack Webhook URLs
            (re.compile(r'https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+'), 'Slack Webhook URL'),
            # JWT Tokens (three base64 segments separated by dots)
            (re.compile(r'eyJ[A-Za-z0-9\-_]{10,}\.eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}'), 'Hardcoded JWT Token'),
            # SSH Private Keys
            (re.compile(r'-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----'), 'SSH Private Key'),
            # Generic high-entropy hex strings (40+ chars) assigned to sensitive vars
            (re.compile(r'(?:key|secret|token|credential)\s*=\s*["\'][0-9a-fA-F]{40,}["\']', re.IGNORECASE), 'High-entropy secret value'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue
            # Skip .env example lines
            if 'example' in stripped.lower() or 'placeholder' in stripped.lower():
                continue
            # Skip os.getenv or os.environ patterns
            if 'getenv' in line or 'environ' in line or 'process.env' in line:
                continue

            for pattern, name in self._patterns:
                match = pattern.search(line)
                if match:
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=self.get_fix(line),
                            description=f"Detected {name}. Move secrets to environment variables or a secrets manager."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        snippet_lower = code_snippet.lower()
        if 'password' in snippet_lower:
            return 'password = os.getenv("PASSWORD")  # SECURITY: Use environment variable'
        if 'api_key' in snippet_lower or 'apikey' in snippet_lower:
            return 'api_key = os.getenv("API_KEY")  # SECURITY: Use environment variable'
        if 'ghp_' in code_snippet or 'gho_' in code_snippet:
            return '# SECURITY: Use GitHub Actions secrets or environment variables\n# token = os.getenv("GITHUB_TOKEN")'
        if 'sk_live_' in code_snippet or 'pk_live_' in code_snippet:
            return '# SECURITY: Use environment variables for Stripe keys\n# stripe.api_key = os.getenv("STRIPE_SECRET_KEY")'
        if 'service_account' in snippet_lower:
            return '# SECURITY: Use GOOGLE_APPLICATION_CREDENTIALS env var\n# Do NOT embed service account JSON in source code'
        if 'hooks.slack.com' in snippet_lower:
            return '# SECURITY: Move webhook URL to environment variable\n# webhook_url = os.getenv("SLACK_WEBHOOK_URL")'
        if 'BEGIN' in code_snippet and 'PRIVATE KEY' in code_snippet:
            return '# SECURITY: Never embed private keys in code\n# Load from a file path set via environment variable'
        if 'eyJ' in code_snippet:
            return '# SECURITY: Never hardcode JWT tokens\n# token = generate_jwt(payload, os.getenv("JWT_SECRET"))'
        if 'token' in snippet_lower or 'secret' in snippet_lower:
            return 'secret = os.getenv("SECRET_KEY")  # SECURITY: Use environment variable'
        return '# SECURITY: Move this secret to environment variables\n# value = os.getenv("SECRET_NAME")'
