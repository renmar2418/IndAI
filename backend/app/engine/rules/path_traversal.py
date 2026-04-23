"""
Rule: Path Traversal Detection
OWASP A01:2021 — Broken Access Control
Severity: High

Detects file operations with unsanitized user input that may allow
directory traversal attacks.
"""

import re
from app.engine.security_rule import SecurityRule


class PathTraversalRule(SecurityRule):
    """Detects potential path traversal vulnerabilities."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-008"
        self._title = "Path Traversal Vulnerability"
        self._description = (
            "File operations using unsanitized user input can allow attackers to "
            "access files outside intended directories using ../ sequences."
        )
        self._severity = "high"
        self._owasp_category = "A01:2021 - Broken Access Control"

        self._patterns = [
            (re.compile(r'open\s*\(\s*(?:f["\']|.*\+|.*format|.*%)'), 'open() with dynamic path'),
            (re.compile(r'(?:readFile|readFileSync|writeFile|writeFileSync)\s*\(\s*(?:`|.*\+)'), 'Node.js file op with dynamic path'),
            (re.compile(r'os\.path\.join\s*\(.*(?:request|req|input|param|args)'), 'os.path.join() with user input'),
            (re.compile(r'send_file\s*\('), 'Flask send_file() - verify path sanitization'),
            (re.compile(r'\.\./', ), '../ path traversal sequence'),
            (re.compile(r'\.\.\\\\'), r'..\ path traversal sequence'),
            (re.compile(r'fs\.\w+\s*\(\s*(?:req\.|request\.)'), 'fs operation with request data'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue
            
            # Ignore standard import/require statements which naturally contain ../ sequences
            if stripped.startswith('import ') or stripped.startswith('export ') or 'from "' in stripped or "from '" in stripped or 'require(' in stripped:
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
                            description=f"Detected {name}. Validate and sanitize file paths before use."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        return (
            "# SECURITY: Sanitize file paths to prevent traversal\n"
            "import os\n"
            "safe_path = os.path.realpath(user_path)\n"
            "if not safe_path.startswith(ALLOWED_DIRECTORY):\n"
            "    raise ValueError('Invalid file path')"
        )
