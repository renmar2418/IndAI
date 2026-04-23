"""
Rule: Python SQL Injection Detection
OWASP A03:2021 — Injection
Severity: High
"""

import re
from app.engine.security_rule import SecurityRule

class PythonSqlInjectionRule(SecurityRule):
    """Detects SQL Injection vulnerabilities in Python DB-API and ORMs."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-PY-003"
        self._title = "Python SQL Injection"
        self._description = (
            "String formatting or concatenation used directly in SQL queries "
            "can allow attackers to manipulate queries and access unauthorized data."
        )
        self._severity = "high"
        self._owasp_category = "A03:2021 - Injection"
        self._supported_languages = ["python"]

        self._patterns = [
            # execute("SELECT * FROM x WHERE id = " + user_input)
            re.compile(r'\bexecute\s*\(\s*["\'].*?(?:SELECT|INSERT|UPDATE|DELETE).*?["\']\s*\+\s*[a-zA-Z_]', re.IGNORECASE),
            # execute(f"SELECT * FROM x WHERE id = {user_input}")
            re.compile(r'\bexecute\s*\(\s*f["\'].*?(?:SELECT|INSERT|UPDATE|DELETE).*?\{.*?\}.*?["\']', re.IGNORECASE),
            # execute("SELECT * FROM x WHERE id = %s" % user_input)
            re.compile(r'\bexecute\s*\(\s*["\'].*?(?:SELECT|INSERT|UPDATE|DELETE).*?["\']\s*%\s*[a-zA-Z_]', re.IGNORECASE),
            # execute("SELECT * FROM x WHERE id = {}".format(user_input))
            re.compile(r'\bexecute\s*\(\s*["\'].*?(?:SELECT|INSERT|UPDATE|DELETE).*?["\']\.format\(', re.IGNORECASE),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#'):
                continue

            for pattern in self._patterns:
                match = pattern.search(line)
                if match:
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=self.get_fix(line),
                            description="Detected unparameterized SQL query. Use parameterized queries (?, %s, or named parameters) instead of string formatting."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        return '# SECURITY: Use parameterized queries to prevent SQL Injection\n# cursor.execute("SELECT * FROM table WHERE id = ?", (user_input,))'
