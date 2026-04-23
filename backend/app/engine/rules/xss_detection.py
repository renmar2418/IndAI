"""
Rule: Cross-Site Scripting (XSS) Detection
OWASP A03:2021 — Injection
Severity: High

Detects usage of innerHTML, document.write(), and other DOM manipulation
methods that can lead to XSS vulnerabilities.
"""

import re
from app.engine.security_rule import SecurityRule


class XSSRule(SecurityRule):
    """Detects potential Cross-Site Scripting vulnerabilities."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-003"
        self._title = "Cross-Site Scripting (XSS) Vulnerability"
        self._description = (
            "Using innerHTML, document.write(), or outerHTML with untrusted data can allow "
            "attackers to inject malicious scripts into web pages."
        )
        self._severity = "high"
        self._owasp_category = "A03:2021 - Injection"

        self._patterns = [
            (re.compile(r'\.innerHTML\s*='), 'innerHTML assignment'),
            (re.compile(r'\.outerHTML\s*='), 'outerHTML assignment'),
            (re.compile(r'document\.write\s*\('), 'document.write()'),
            (re.compile(r'document\.writeln\s*\('), 'document.writeln()'),
            (re.compile(r'\.insertAdjacentHTML\s*\('), 'insertAdjacentHTML()'),
            (re.compile(r'v-html\s*='), 'Vue v-html directive'),
            (re.compile(r'dangerouslySetInnerHTML'), 'React dangerouslySetInnerHTML'),
            # Python template rendering without escaping
            (re.compile(r'\|\s*safe\b'), 'Jinja2 |safe filter'),
            (re.compile(r'Markup\s*\('), 'Markup() without escaping'),
            (re.compile(r'render_template_string\s*\('), 'render_template_string()'),
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
                            description=f"Detected {name}. This can allow XSS attacks if used with untrusted input."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        fixed = code_snippet
        if 'innerHTML' in fixed:
            fixed = re.sub(r'\.innerHTML\s*=', '.textContent =', fixed)
            return f"{fixed.strip()}\n// SECURITY: Use textContent instead of innerHTML to prevent XSS"
        if 'document.write' in fixed:
            return "// SECURITY: Avoid document.write(). Use DOM methods like createElement() and appendChild()"
        if 'dangerouslySetInnerHTML' in fixed:
            return "// SECURITY: Avoid dangerouslySetInnerHTML. Use DOMPurify to sanitize HTML if necessary"
        return f"// SECURITY FIX: Sanitize all user input before DOM insertion\n{code_snippet.strip()}"
