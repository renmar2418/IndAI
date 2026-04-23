"""
Rule: Prototype Pollution Detection
OWASP A03:2021 — Injection
Severity: High
"""

import re
from app.engine.security_rule import SecurityRule


class PrototypePollutionRule(SecurityRule):
    """Detects potential prototype pollution vulnerabilities."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-011"
        self._title = "Prototype Pollution Risk"
        self._description = (
            "Deep merging or assigning objects without sanitizing keys like __proto__, "
            "constructor, or prototype can allow attackers to modify object prototypes."
        )
        self._severity = "high"
        self._owasp_category = "A03:2021 - Injection"

        self._patterns = [
            (re.compile(r'__proto__'), '__proto__ access'),
            (re.compile(r'\[?\s*["\']__proto__["\']\s*\]?'), '__proto__ property'),
            (re.compile(r'Object\.assign\s*\(\s*\{\}'), 'Object.assign() shallow merge'),
            (re.compile(r'\.constructor\.prototype'), 'constructor.prototype access'),
            (re.compile(r'lodash\.merge\b|_\.merge\b'), 'lodash.merge() deep merge'),
            (re.compile(r'deepmerge\s*\(|deep_merge\s*\('), 'Deep merge function'),
            (re.compile(r'Object\.create\s*\(\s*null\s*\)'), 'Null prototype object (safe pattern)'),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue

            for pattern, name in self._patterns:
                if 'safe pattern' in name:
                    continue
                match = pattern.search(line)
                if match:
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=self.get_fix(line),
                            description=f"Detected {name}. Sanitize keys before object assignment."
                        )
                    )
                    break
        return findings

    def get_fix(self, code_snippet):
        return (
            "// SECURITY: Sanitize object keys before merging\n"
            "function safeMerge(target, source) {\n"
            "  for (const key of Object.keys(source)) {\n"
            "    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;\n"
            "    target[key] = source[key];\n"
            "  }\n"
            "  return target;\n"
            "}"
        )
