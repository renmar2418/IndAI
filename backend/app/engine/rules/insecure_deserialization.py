"""
Rule: Insecure Deserialization Detection
OWASP A08:2021 — Software and Data Integrity Failures
Severity: High
"""

import re
from app.engine.security_rule import SecurityRule


class InsecureDeserializationRule(SecurityRule):
    """Detects insecure deserialization patterns."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-009"
        self._title = "Insecure Deserialization"
        self._description = (
            "Deserializing untrusted data (pickle, yaml.load, JSON.parse of unchecked input) "
            "can lead to remote code execution or data tampering."
        )
        self._severity = "high"
        self._owasp_category = "A08:2021 - Software and Data Integrity Failures"

        self._patterns = [
            (re.compile(r'pickle\.loads?\s*\('), 'pickle.load()/loads()'),
            (re.compile(r'yaml\.load\s*\((?!.*Loader\s*=\s*yaml\.SafeLoader)'), 'yaml.load() without SafeLoader'),
            (re.compile(r'yaml\.unsafe_load\s*\('), 'yaml.unsafe_load()'),
            (re.compile(r'marshal\.loads?\s*\('), 'marshal.load()'),
            (re.compile(r'shelve\.open\s*\('), 'shelve.open()'),
            (re.compile(r'jsonpickle\.decode\s*\('), 'jsonpickle.decode()'),
            (re.compile(r'unserialize\s*\('), 'PHP unserialize()'),
            (re.compile(r'ObjectInputStream'), 'Java ObjectInputStream'),
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
                            description=f"Detected {name}. Use safe deserialization methods."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        if 'pickle' in code_snippet:
            return "# SECURITY: Avoid pickle for untrusted data. Use JSON instead\nimport json\ndata = json.loads(trusted_input)"
        if 'yaml.load' in code_snippet:
            return code_snippet.replace('yaml.load(', 'yaml.safe_load(').strip() + "  # SECURITY: Use safe_load()"
        return "# SECURITY: Only deserialize trusted, validated data. Prefer JSON format."
