"""
Rule: Eval/Exec Usage Detection
OWASP A03:2021 — Injection
Severity: Critical

Detects usage of eval(), exec(), and similar dynamic code execution
functions that can lead to code injection vulnerabilities.
"""

import re
from app.engine.security_rule import SecurityRule


class EvalUsageRule(SecurityRule):
    """Detects dangerous eval() and exec() calls."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-001"
        self._title = "Dangerous eval()/exec() Usage"
        self._description = (
            "Using eval() or exec() with untrusted input allows arbitrary code execution. "
            "An attacker can inject malicious code that runs with the same privileges as your application."
        )
        self._severity = "critical"
        self._owasp_category = "A03:2021 - Injection"

        # Patterns for both Python and JavaScript
        self._patterns = [
            (re.compile(r'\beval\s*\('), 'eval()'),
            (re.compile(r'\bexec\s*\('), 'exec()'),
            (re.compile(r'\bexecfile\s*\('), 'execfile()'),
            (re.compile(r'\bcompile\s*\('), 'compile()'),
            (re.compile(r'new\s+Function\s*\('), 'new Function()'),
            (re.compile(r'setTimeout\s*\(\s*["\']'), 'setTimeout() with string'),
            (re.compile(r'setInterval\s*\(\s*["\']'), 'setInterval() with string'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            # Skip comments
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
                            description=f"Dangerous usage of {name} detected. "
                                        f"This can lead to arbitrary code execution if user input is passed."
                        )
                    )
        return findings

    def get_fix(self, code_snippet):
        # Replace eval/exec with safer alternatives
        fixed = code_snippet
        fixed = re.sub(r'\beval\s*\(', '/* SECURITY: Use JSON.parse() or a safe parser instead */ JSON.parse(', fixed)
        fixed = re.sub(r'\bexec\s*\(', '# SECURITY: Use ast.literal_eval() or subprocess.run() instead\n# ', fixed)
        fixed = re.sub(r'new\s+Function\s*\(', '/* SECURITY: Define functions statically */ function safe(', fixed)
        return fixed.strip()
