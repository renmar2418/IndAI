"""
Rule: Command Injection Detection
OWASP A03:2021 — Injection
Severity: Critical

Detects os.system(), subprocess calls, and child_process.exec()
with variable interpolation that can lead to command injection.
"""

import re
from app.engine.security_rule import SecurityRule


class CommandInjectionRule(SecurityRule):
    """Detects potential OS command injection vulnerabilities."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-007"
        self._title = "OS Command Injection"
        self._description = (
            "Executing OS commands with unsanitized user input allows attackers "
            "to run arbitrary commands on the server."
        )
        self._severity = "critical"
        self._owasp_category = "A03:2021 - Injection"

        self._patterns = [
            (re.compile(r'os\.system\s*\('), 'os.system()'),
            (re.compile(r'os\.popen\s*\('), 'os.popen()'),
            (re.compile(r'subprocess\.call\s*\(\s*["\']'), 'subprocess.call() with string'),
            (re.compile(r'subprocess\.call\s*\(\s*f["\']'), 'subprocess.call() with f-string'),
            (re.compile(r'subprocess\.Popen\s*\(\s*["\']'), 'subprocess.Popen() with string'),
            (re.compile(r'subprocess\.run\s*\(\s*["\']'), 'subprocess.run() with string'),
            (re.compile(r'subprocess\.run\s*\(\s*f["\']'), 'subprocess.run() with f-string'),
            (re.compile(r'child_process\.exec\s*\('), 'child_process.exec()'),
            (re.compile(r'child_process\.execSync\s*\('), 'child_process.execSync()'),
            (re.compile(r'shell\s*=\s*True'), 'shell=True in subprocess'),
            (re.compile(r'commands\.getoutput\s*\('), 'commands.getoutput()'),
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
                            description=f"Detected {name}. Use parameterized command execution instead."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        if 'os.system' in code_snippet or 'os.popen' in code_snippet:
            return (
                "# SECURITY: Use subprocess.run() with a list of arguments (no shell)\n"
                "import subprocess\n"
                "subprocess.run(['command', 'arg1', 'arg2'], check=True, capture_output=True)"
            )
        if 'shell=True' in code_snippet:
            return code_snippet.replace('shell=True', 'shell=False  # SECURITY: Avoid shell=True').strip()
        return (
            "// SECURITY: Use child_process.execFile() with argument arrays\n"
            "const { execFile } = require('child_process');\n"
            "execFile('command', ['arg1', 'arg2'], callback);"
        )
