"""
Rule: Missing Authentication Check
OWASP A07:2021 — Identification and Authentication Failures
Severity: High
"""

import re
from app.engine.security_rule import SecurityRule


class MissingAuthRule(SecurityRule):
    """Detects routes or endpoints without authentication checks."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-013"
        self._title = "Missing Authentication Check"
        self._description = (
            "Routes handling sensitive operations without authentication decorators "
            "or middleware may allow unauthorized access."
        )
        self._severity = "high"
        self._owasp_category = "A07:2021 - Identification and Authentication Failures"

        self._route_patterns = [
            re.compile(r'@app\.route\s*\(.*(?:POST|PUT|DELETE|PATCH)', re.IGNORECASE),
            re.compile(r'@bp\.route\s*\(.*(?:POST|PUT|DELETE|PATCH)', re.IGNORECASE),
            re.compile(r'router\.\s*(?:post|put|delete|patch)\s*\('),
            re.compile(r'app\.\s*(?:post|put|delete|patch)\s*\('),
        ]

        self._auth_patterns = [
            re.compile(r'@login_required'),
            re.compile(r'@auth_required'),
            re.compile(r'@jwt_required'),
            re.compile(r'@token_required'),
            re.compile(r'isAuthenticated'),
            re.compile(r'requireAuth'),
            re.compile(r'protect'),
            re.compile(r'@requires_auth'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue

            for route_pattern in self._route_patterns:
                if route_pattern.search(line):
                    # Check surrounding lines (5 above) for auth decorators/middleware
                    context_start = max(0, i - 6)
                    context = '\n'.join(lines[context_start:i - 1])
                    has_auth = any(
                        auth_pattern.search(context)
                        for auth_pattern in self._auth_patterns
                    )
                    if not has_auth:
                        findings.append(
                            self._create_finding(
                                line_number=i,
                                column=1,
                                code_snippet=line,
                                suggested_fix=self.get_fix(line),
                                description="This route handles state-changing operations without visible authentication."
                            )
                        )
                    break
        return findings

    def get_fix(self, code_snippet):
        if '@app.route' in code_snippet or '@bp.route' in code_snippet:
            return f"@login_required  # SECURITY: Add authentication check\n{code_snippet.strip()}"
        return f"// SECURITY: Add authentication middleware\nrouter.use(requireAuth);\n{code_snippet.strip()}"
