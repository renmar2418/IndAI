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
        if 'password' in code_snippet.lower():
            return 'password = os.getenv("PASSWORD")  # SECURITY: Use environment variable'
        if 'api_key' in code_snippet.lower() or 'apikey' in code_snippet.lower():
            return 'api_key = os.getenv("API_KEY")  # SECURITY: Use environment variable'
        if 'token' in code_snippet.lower() or 'secret' in code_snippet.lower():
            return 'secret = os.getenv("SECRET_KEY")  # SECURITY: Use environment variable'
        return '# SECURITY: Move this secret to environment variables\n# value = os.getenv("SECRET_NAME")'
