"""
Rule: Deprecated/Insecure API Usage Detection
OWASP A06:2021 — Vulnerable and Outdated Components
Severity: Low
"""

import re
from app.engine.security_rule import SecurityRule


class DeprecatedAPIRule(SecurityRule):
    """Detects usage of deprecated or known-insecure API functions."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-015"
        self._title = "Deprecated/Insecure API Usage"
        self._description = (
            "Using deprecated functions or known-insecure APIs can introduce "
            "vulnerabilities and compatibility issues."
        )
        self._severity = "low"
        self._owasp_category = "A06:2021 - Vulnerable and Outdated Components"

        self._patterns = [
            # Python
            (re.compile(r'\binput\s*\(\s*\)'), 'Python 2 input() (use Python 3)', 'Use input() in Python 3 which is safe, or raw_input() in Python 2'),
            (re.compile(r'cgi\.escape\s*\('), 'cgi.escape() deprecated', 'Use html.escape() instead'),
            (re.compile(r'string\.atof\s*\('), 'string.atof() deprecated', 'Use float() instead'),
            (re.compile(r'string\.atoi\s*\('), 'string.atoi() deprecated', 'Use int() instead'),
            (re.compile(r'imp\.find_module'), 'imp module deprecated', 'Use importlib instead'),
            (re.compile(r'optparse\b'), 'optparse deprecated', 'Use argparse instead'),
            # JavaScript
            (re.compile(r'document\.write\s*\('), 'document.write()', 'Use DOM methods (createElement, appendChild)'),
            (re.compile(r'escape\s*\(\s*[^)]'), 'escape() deprecated', 'Use encodeURIComponent() instead'),
            (re.compile(r'unescape\s*\('), 'unescape() deprecated', 'Use decodeURIComponent() instead'),
            (re.compile(r'__defineGetter__'), '__defineGetter__ deprecated', 'Use Object.defineProperty()'),
            (re.compile(r'__defineSetter__'), '__defineSetter__ deprecated', 'Use Object.defineProperty()'),
            (re.compile(r'with\s*\(\s*\w'), 'with statement', 'Avoid with statement; use destructuring'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue

            for pattern, name, fix_hint in self._patterns:
                match = pattern.search(line)
                if match:
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=f"# SECURITY: {fix_hint}",
                            description=f"Detected {name}. {fix_hint}."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        return "# SECURITY: Replace deprecated API with its modern equivalent"
