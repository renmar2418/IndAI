"""
Rule: ReDoS (Regular Expression Denial of Service) Detection
OWASP A03:2021 — Injection
Severity: Medium
"""

import re
from app.engine.security_rule import SecurityRule


class InsecureRegexRule(SecurityRule):
    """Detects potentially vulnerable regular expressions."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-014"
        self._title = "Insecure Regular Expression (ReDoS)"
        self._description = (
            "Regular expressions with nested quantifiers or overlapping patterns "
            "can cause catastrophic backtracking, leading to denial of service."
        )
        self._severity = "medium"
        self._owasp_category = "A03:2021 - Injection"

        # Patterns that indicate potentially vulnerable regex
        self._redos_patterns = [
            (re.compile(r'\(\.\*\)\+'), '(.*)+  nested quantifier'),
            (re.compile(r'\(\.\+\)\+'), '(.+)+  nested quantifier'),
            (re.compile(r'\(\.\*\)\*'), '(.*)*  nested quantifier'),
            (re.compile(r'\(\[.*?\]\+\)\+'), '([...]+)+ nested quantifier'),
            (re.compile(r'\(\w\+\)\+'), r'(\w+)+ nested quantifier'),
            (re.compile(r'\(\.\{.*?\}\)\+'), '(.{n})+ nested quantifier'),
            (re.compile(r'\(.*?\|.*?\)\*'), '(a|b)* alternation with quantifier'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue

            # Only check lines that appear to contain regex
            if 're.' not in line and 'RegExp' not in line and 'regex' not in line.lower():
                if '/' not in line:
                    continue

            for pattern, name in self._redos_patterns:
                match = pattern.search(line)
                if match:
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=self.get_fix(line),
                            description=f"Detected {name}. This pattern may cause catastrophic backtracking."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        return (
            "# SECURITY: Simplify regex to avoid catastrophic backtracking\n"
            "# Use atomic groups or possessive quantifiers where possible\n"
            "# Consider using re2 library for guaranteed linear-time matching\n"
            "# import re2 as re  # pip install google-re2"
        )
