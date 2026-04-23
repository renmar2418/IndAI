"""
Rule: Open Redirect Detection
OWASP A01:2021 — Broken Access Control
Severity: Medium
"""

import re
from app.engine.security_rule import SecurityRule


class OpenRedirectRule(SecurityRule):
    """Detects potential open redirect vulnerabilities."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-012"
        self._title = "Open Redirect Vulnerability"
        self._description = (
            "Redirecting users based on unvalidated input can be exploited in phishing "
            "attacks to send users to malicious websites."
        )
        self._severity = "medium"
        self._owasp_category = "A01:2021 - Broken Access Control"

        self._patterns = [
            (re.compile(r'redirect\s*\(\s*(?:request\.|req\.)'), 'Redirect with request data'),
            (re.compile(r'res\.redirect\s*\(\s*(?:req\.)'), 'Express redirect with req data'),
            (re.compile(r'window\.location\s*=\s*(?:.*(?:param|query|input|search|hash))'), 'window.location from URL params'),
            (re.compile(r'window\.location\.href\s*='), 'window.location.href assignment'),
            (re.compile(r'location\.replace\s*\('), 'location.replace()'),
            (re.compile(r'header\s*\(\s*["\']Location:', re.IGNORECASE), 'PHP Location header'),
            (re.compile(r'return\s+redirect\s*\(\s*(?:request\.args|request\.form)'), 'Flask redirect with request data'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
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
                            description=f"Detected {name}. Validate redirect URLs against a whitelist."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        return (
            "# SECURITY: Validate redirect URL against an allowlist\n"
            "ALLOWED_HOSTS = ['yourdomain.com', 'app.yourdomain.com']\n"
            "from urllib.parse import urlparse\n"
            "parsed = urlparse(redirect_url)\n"
            "if parsed.netloc not in ALLOWED_HOSTS:\n"
            "    redirect_url = '/'"
        )
