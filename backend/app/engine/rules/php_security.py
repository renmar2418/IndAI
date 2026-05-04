"""
Rule: Universal Security Best Practices & Vulnerabilities
OWASP Top 10
Severity: High/Critical

Detects common vulnerabilities across multiple programming languages (PHP, Java, Go, Ruby, C#, etc.)
such as SQL Injection, Command Injection, XSS, and Insecure Deserialization.
"""

import re
from app.engine.security_rule import SecurityRule


class UniversalSecurityRule(SecurityRule):
    """Detects common vulnerabilities across multiple programming languages."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-UNV-001"
        self._title = "Universal Security Vulnerability"
        self._description = "Detected a common security vulnerability across languages."
        self._severity = "high"
        self._owasp_category = "A03:2021 - Injection"
        self._supported_languages = ["all"]

        self._patterns = [
            # --- PHP ---
            (re.compile(r'(?:SELECT|INSERT|UPDATE|DELETE).*\$[\w]+', re.IGNORECASE), "SQL Injection (PHP Variable Interpolation)", "critical"),
            (re.compile(r'echo\s+.*\$[\w]+'), "Cross-Site Scripting (PHP XSS)", "high"),
            (re.compile(r'move_uploaded_file\s*\(\s*\$_FILES'), "Arbitrary File Upload (PHP)", "critical"),
            (re.compile(r'echo\s+mysqli_error\s*\('), "Information Exposure (PHP Database Error)", "medium"),
            (re.compile(r'(?:system|exec|shell_exec|passthru)\s*\(\s*\$'), "Command Injection (PHP)", "critical"),
            (re.compile(r'(?:include|require)(?:_once)?\s*\(\s*\$_(?:GET|POST|REQUEST)'), "Local File Inclusion / Path Traversal (PHP)", "critical"),

            # --- Java ---
            (re.compile(r'Runtime\.getRuntime\(\)\.exec\s*\('), "Command Injection (Java Runtime.exec)", "critical"),
            (re.compile(r'new\s+ObjectInputStream.*\.readObject\(\)'), "Insecure Deserialization (Java ObjectInputStream)", "critical"),
            (re.compile(r'(?:SELECT|INSERT|UPDATE|DELETE).*?\s*\+\s*[a-zA-Z0-9_]+\s*(?:\+.*)?', re.IGNORECASE), "SQL Injection (Java/C# String Concatenation)", "critical"),

            # --- C# / .NET ---
            (re.compile(r'Process\.Start\s*\('), "Command Injection (C# Process.Start)", "critical"),
            (re.compile(r'BinaryFormatter\.Deserialize\s*\('), "Insecure Deserialization (C# BinaryFormatter)", "critical"),
            (re.compile(r'@Html\.Raw\s*\('), "Cross-Site Scripting (C# Html.Raw)", "high"),

            # --- Go ---
            (re.compile(r'exec\.Command\s*\([^,]+,\s*[a-zA-Z0-9_]+'), "Command Injection (Go exec.Command)", "critical"),
            (re.compile(r'template\.HTML\s*\('), "Cross-Site Scripting (Go template.HTML)", "high"),
            (re.compile(r'fmt\.Sprintf\s*\(\s*"[^"]*(?:SELECT|INSERT|UPDATE|DELETE)[^"]*%\w"'), "SQL Injection (Go fmt.Sprintf)", "critical"),

            # --- Ruby ---
            (re.compile(r'(?:system|exec)\s*\([^)]*#\{'), "Command Injection (Ruby Interpolation)", "critical"),
            (re.compile(r'Marshal\.load\s*\('), "Insecure Deserialization (Ruby Marshal)", "critical"),
            (re.compile(r'<\%=\s*raw\s+'), "Cross-Site Scripting (Ruby raw template)", "high"),
            (re.compile(r'ActiveRecord::Base\.connection\.execute\s*\(\s*"[^"]*#\{'), "SQL Injection (Ruby ActiveRecord Interpolation)", "critical"),
        ]

    def check(self, source_code, lines):
        findings = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('#') or stripped.startswith('/*'):
                continue

            for pattern, name, severity in self._patterns:
                match = pattern.search(line)
                if match:
                    findings.append(
                        self._create_finding(
                            line_number=i,
                            column=match.start() + 1,
                            code_snippet=line,
                            suggested_fix=self.get_fix(name, line),
                            description=f"Detected {name}. This is a serious security risk."
                        )
                    )
                    break
        return findings

    def get_fix(self, vulnerability_type, code_snippet):
        if "SQL" in vulnerability_type:
            return "// SECURITY FIX: Use parameterized queries or prepared statements."
        elif "XSS" in vulnerability_type:
            return "// SECURITY FIX: Properly escape/sanitize user input before rendering."
        elif "Command Injection" in vulnerability_type:
            return "// SECURITY FIX: Avoid executing system commands with user input. Use safe APIs."
        elif "Deserialization" in vulnerability_type:
            return "// SECURITY FIX: Do not deserialize untrusted data. Use safe formats like JSON."
        elif "File Upload" in vulnerability_type:
            return "// SECURITY FIX: Validate file type, extension, and use a safe random filename."
        elif "Information Exposure" in vulnerability_type:
            return "// SECURITY FIX: Log errors to a file, do not display them to the user."
        return "// SECURITY FIX: Review this line for security vulnerabilities."

    def _create_finding(self, line_number, column, code_snippet, suggested_fix, description):
        finding = super()._create_finding(line_number, column, code_snippet, suggested_fix, description)
        
        for _, name, severity in self._patterns:
            if name in description:
                finding["severity"] = severity
                finding["title"] = name
                if "SQL" in name or "XSS" in name:
                    finding["owasp_category"] = "A03:2021 - Injection"
                elif "Command Injection" in name:
                    finding["owasp_category"] = "A03:2021 - Injection"
                elif "Deserialization" in name:
                    finding["owasp_category"] = "A08:2021 - Software and Data Integrity Failures"
                elif "File Upload" in name:
                    finding["owasp_category"] = "A04:2021 - Insecure Design"
                elif "Information Exposure" in name:
                    finding["owasp_category"] = "A05:2021 - Security Misconfiguration"
                break
                
        return finding
