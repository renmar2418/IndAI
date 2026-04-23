"""
Rule: Weak Cryptographic Algorithm Detection
OWASP A02:2021 — Cryptographic Failures
Severity: Medium
"""

import re
from app.engine.security_rule import SecurityRule


class WeakCryptoRule(SecurityRule):
    """Detects usage of weak or deprecated cryptographic algorithms."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-010"
        self._title = "Weak Cryptographic Algorithm"
        self._description = (
            "Using weak hash algorithms (MD5, SHA1) or deprecated ciphers (DES, RC4) "
            "provides insufficient security against modern attacks."
        )
        self._severity = "medium"
        self._owasp_category = "A02:2021 - Cryptographic Failures"

        self._patterns = [
            (re.compile(r'hashlib\.md5\s*\('), 'MD5 hash'),
            (re.compile(r'hashlib\.sha1\s*\('), 'SHA1 hash'),
            (re.compile(r'MD5\s*\('), 'MD5 hash'),
            (re.compile(r'SHA1\s*\('), 'SHA1 hash'),
            (re.compile(r'createHash\s*\(\s*["\']md5["\']'), 'MD5 hash (Node.js)'),
            (re.compile(r'createHash\s*\(\s*["\']sha1["\']'), 'SHA1 hash (Node.js)'),
            (re.compile(r'DES\b'), 'DES cipher'),
            (re.compile(r'RC4\b'), 'RC4 cipher'),
            (re.compile(r'Blowfish\b'), 'Blowfish cipher'),
            (re.compile(r'md5\s*\('), 'md5() function'),
            (re.compile(r'sha1\s*\('), 'sha1() function'),
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
                            description=f"Detected {name}. Use SHA-256 or SHA-3 for hashing, AES-256 for encryption."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        fixed = code_snippet
        fixed = re.sub(r'hashlib\.md5', 'hashlib.sha256', fixed)
        fixed = re.sub(r'hashlib\.sha1', 'hashlib.sha256', fixed)
        fixed = re.sub(r"createHash\s*\(\s*['\"]md5['\"]", "createHash('sha256'", fixed)
        fixed = re.sub(r"createHash\s*\(\s*['\"]sha1['\"]", "createHash('sha256'", fixed)
        return f"{fixed.strip()}  # SECURITY: Upgraded to SHA-256"
