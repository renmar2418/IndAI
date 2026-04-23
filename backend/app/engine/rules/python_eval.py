"""
Rule: Python eval/exec usage
OWASP A03:2021 — Injection
Severity: Critical
"""

import re
from app.engine.security_rule import SecurityRule

class PythonEvalRule(SecurityRule):
    """Detects unsafe eval() and exec() in Python code."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-PY-001"
        self._title = "Unsafe eval() or exec() Usage"
        self._description = (
            "Using eval() or exec() on untrusted input allows attackers to execute arbitrary "
            "Python code, leading to complete system compromise."
        )
        self._severity = "critical"
        self._owasp_category = "A03:2021 - Injection"
        self._supported_languages = ["python"]

        self._patterns = [
            (re.compile(r'\beval\s*\('), 'eval()'),
            (re.compile(r'\bexec\s*\('), 'exec()'),
            (re.compile(r'os\.system\s*\('), 'os.system()'),
            (re.compile(r'subprocess\.call\s*\(\s*[a-zA-Z_]\w*\s*\+'), 'Unsafe subprocess call'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#'):
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
                            description=f"Detected {name}. Avoid executing arbitrary code strings."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        if 'eval(' in code_snippet or 'exec(' in code_snippet:
            return '# SECURITY: Use ast.literal_eval() instead of eval() for safe evaluation\nimport ast\n# result = ast.literal_eval(user_input)'
        if 'os.system(' in code_snippet or 'subprocess' in code_snippet:
            return '# SECURITY: Use subprocess.run() with a list of arguments (shell=False)\n# subprocess.run(["ls", "-l", user_input])'
        return '# SECURITY: Avoid dynamic execution of code strings.'
