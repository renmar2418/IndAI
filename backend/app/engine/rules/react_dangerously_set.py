"""
Rule: React dangerouslySetInnerHTML
OWASP A03:2021 — Injection (XSS)
Severity: High
"""

import re
from app.engine.security_rule import SecurityRule

class ReactDangerouslySetRule(SecurityRule):
    """Detects unsafe dangerouslySetInnerHTML in React/TypeScript."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-TSX-001"
        self._title = "Unsafe dangerouslySetInnerHTML"
        self._description = (
            "Using dangerouslySetInnerHTML can expose your application to Cross-Site Scripting (XSS) "
            "attacks if the HTML is not properly sanitized."
        )
        self._severity = "high"
        self._owasp_category = "A03:2021 - Injection"
        self._supported_languages = ["javascript", "typescript", "tsx", "jsx"]

        self._patterns = [
            re.compile(r'dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('/*'):
                continue

            for pattern in self._patterns:
                match = pattern.search(line)
                if match:
                    # Check if DOMPurify or similar might be in use on this line
                    if 'DOMPurify.sanitize' in line or 'sanitize(' in line:
                        continue
                        
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=self.get_fix(line),
                            description="Detected dangerouslySetInnerHTML. Ensure the input is strictly sanitized using a library like DOMPurify."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        return '{/* SECURITY: Sanitize input before rendering HTML */}\n{/* <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} /> */}'
