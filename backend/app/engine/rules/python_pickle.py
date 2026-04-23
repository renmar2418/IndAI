"""
Rule: Python pickle deserialization
OWASP A08:2021 — Software and Data Integrity Failures
Severity: Critical
"""

import re
from app.engine.security_rule import SecurityRule

class PythonPickleRule(SecurityRule):
    """Detects insecure deserialization via pickle."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-PY-002"
        self._title = "Insecure Pickle Deserialization"
        self._description = (
            "The pickle module is not secure against erroneous or maliciously constructed data. "
            "Never unpickle data received from an untrusted or unauthenticated source."
        )
        self._severity = "critical"
        self._owasp_category = "A08:2021 - Software and Data Integrity Failures"
        self._supported_languages = ["python"]

        self._patterns = [
            re.compile(r'\bpickle\.loads\s*\('),
            re.compile(r'\bpickle\.load\s*\('),
            re.compile(r'\bcPickle\.loads\s*\('),
            re.compile(r'\byaml\.load\s*\([^,]+$'), # PyYAML without SafeLoader
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
                    name = "pickle" if "pickle" in line else "yaml.load without SafeLoader"
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=self.get_fix(line),
                            description=f"Detected {name}. Deserializing untrusted data can lead to Remote Code Execution."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        if 'yaml.load' in code_snippet:
            return code_snippet.replace('yaml.load(', 'yaml.safe_load(') + "  # SECURITY: Used safe_load"
        return '# SECURITY: Use json.loads() for data exchange instead of pickle\nimport json\n# data = json.loads(user_input)'
