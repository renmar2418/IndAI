"""
Rule: SQL Injection Detection
OWASP A03:2021 — Injection
Severity: Critical

Detects string-concatenated or f-string formatted SQL queries
that are vulnerable to SQL injection attacks.
"""

import re
from app.engine.security_rule import SecurityRule


class SQLInjectionRule(SecurityRule):
    """Detects potential SQL injection vulnerabilities."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-002"
        self._title = "SQL Injection Vulnerability"
        self._description = (
            "SQL queries built with string concatenation or formatting are vulnerable to injection. "
            "An attacker can manipulate queries to access, modify, or delete database records."
        )
        self._severity = "critical"
        self._owasp_category = "A03:2021 - Injection"

        self._patterns = [
            # Python f-string SQL
            (re.compile(r'(execute|query|raw)\s*\(\s*f["\'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)', re.IGNORECASE), 'f-string SQL query'),
            # Python %-formatting SQL
            (re.compile(r'(execute|query|raw)\s*\(\s*["\'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER).*%s', re.IGNORECASE), '%-formatted SQL query'),
            # Python .format() SQL
            (re.compile(r'(execute|query|raw)\s*\(\s*["\'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER).*\.format\s*\(', re.IGNORECASE), '.format() SQL query'),
            # String concatenation with SQL keywords
            (re.compile(r'["\'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s+.*["\']\s*\+', re.IGNORECASE), 'Concatenated SQL query'),
            (re.compile(r'\+\s*["\'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)', re.IGNORECASE), 'Concatenated SQL query'),
            # JavaScript template literal SQL
            (re.compile(r'(execute|query|raw)\s*\(\s*`.*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)', re.IGNORECASE), 'Template literal SQL'),
            # Direct string concat with WHERE
            (re.compile(r'WHERE\s+\w+\s*=\s*["\']?\s*\+', re.IGNORECASE), 'Concatenated WHERE clause'),
            (re.compile(r'WHERE\s+\w+\s*=\s*["\']?\s*\$\{', re.IGNORECASE), 'Interpolated WHERE clause'),
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
                            description=f"Detected {name}. Use parameterized queries or prepared statements instead."
                        )
                    )
                    break  # One finding per line
        return findings

    def get_fix(self, code_snippet):
        return (
            "# SECURITY FIX: Use parameterized queries instead\n"
            "# cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))\n"
            "# Or use an ORM like SQLAlchemy: User.query.filter_by(id=user_id).first()"
        )
