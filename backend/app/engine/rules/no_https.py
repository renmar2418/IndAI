"""
Rule: Insecure HTTP Usage
OWASP A02:2021 — Cryptographic Failures
Severity: Medium

Detects HTTP URLs where HTTPS should be used.
"""

import re
from app.engine.security_rule import SecurityRule


class NoHTTPSRule(SecurityRule):
    """Detects usage of insecure HTTP protocol."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-006"
        self._title = "Insecure HTTP Protocol"
        self._description = (
            "Using HTTP instead of HTTPS exposes data in transit to eavesdropping "
            "and man-in-the-middle attacks."
        )
        self._severity = "medium"
        self._owasp_category = "A02:2021 - Cryptographic Failures"

        self._pattern = re.compile(r'http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)')

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue

            match = self._pattern.search(line)
            if match:
                findings.append(
                    self._create_finding(
                        line_number=i,
                        column=match.start() + 1,
                        code_snippet=line,
                        suggested_fix=self.get_fix(line),
                    )
                )
        return findings

    def get_fix(self, code_snippet):
        return re.sub(r'http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)', 'https://', code_snippet).strip()
