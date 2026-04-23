"""
Rule: Insecure Random Number Generation
OWASP A02:2021 — Cryptographic Failures
Severity: Medium

Detects Math.random() or random.random() used in security contexts.
"""

import re
from app.engine.security_rule import SecurityRule


class InsecureRandomRule(SecurityRule):
    """Detects insecure random number generation for security purposes."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-005"
        self._title = "Insecure Random Number Generation"
        self._description = (
            "Math.random() and random.random() are not cryptographically secure. "
            "Using them for tokens, passwords, or session IDs makes them predictable."
        )
        self._severity = "medium"
        self._owasp_category = "A02:2021 - Cryptographic Failures"

        self._patterns = [
            (re.compile(r'Math\.random\s*\('), 'Math.random()'),
            (re.compile(r'\brandom\.random\s*\('), 'random.random()'),
            (re.compile(r'\brandom\.randint\s*\('), 'random.randint()'),
            (re.compile(r'\brandom\.choice\s*\('), 'random.choice()'),
            (re.compile(r'\brandom\.randrange\s*\('), 'random.randrange()'),
        ]

        self._security_context = re.compile(
            r'(?:token|password|secret|key|session|nonce|salt|hash|otp|uuid|id)',
            re.IGNORECASE
        )

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
                            description=f"{name} is not cryptographically secure. Use secrets module (Python) or crypto.getRandomValues() (JS)."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        if 'Math.random' in code_snippet:
            return "// SECURITY: Use crypto.getRandomValues() or crypto.randomUUID()\nconst secureRandom = crypto.getRandomValues(new Uint32Array(1))[0];"
        return "# SECURITY: Use secrets module for security-sensitive random values\nimport secrets\nvalue = secrets.token_hex(32)"
