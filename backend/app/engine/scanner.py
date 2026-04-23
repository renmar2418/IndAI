"""
IndAI — Scanner (Facade Pattern)
Demonstrates: Facade Pattern, Composition

The main orchestrator that coordinates parsing, rule execution,
and fix generation. Provides a simple scan() interface that
hides all internal complexity.
"""

import re
from app.engine.rule_factory import RuleFactory
from app.engine.code_fixer import CodeFixer


class Scanner:
    """
    Facade Pattern — Provides a simplified interface to the scanning subsystem.

    Composition: Contains RuleFactory and CodeFixer instances.
    The scanner orchestrates:
    1. Code validation (check if input is actual code)
    2. Code parsing (split into lines)
    3. Rule execution (iterate all rules via Strategy Pattern)
    4. Finding collection
    5. Code fixing (apply suggested fixes)
    """

    # Patterns that indicate the input is actual programming code
    _CODE_INDICATORS = [
        # Python
        r'\bdef\s+\w+\s*\(',         # function definitions
        r'\bclass\s+\w+',            # class definitions
        r'\bimport\s+\w+',           # import statements
        r'\bfrom\s+\w+\s+import',    # from imports
        r'\bif\s+.*:',               # if statements
        r'\bfor\s+\w+\s+in\b',      # for loops
        r'\bwhile\s+.*:',           # while loops
        r'\breturn\b',               # return statements
        r'\bprint\s*\(',             # print calls
        r'^\s*#.*',                  # comments

        # JavaScript / TypeScript
        r'\bfunction\s+\w+\s*\(',    # function declarations
        r'\bconst\s+\w+\s*=',        # const declarations
        r'\blet\s+\w+\s*=',          # let declarations
        r'\bvar\s+\w+\s*=',          # var declarations
        r'\bconsole\.\w+\s*\(',      # console methods
        r'=>',                        # arrow functions
        r'\brequire\s*\(',           # require
        r'\bexport\s+',              # export
        r'\basync\s+',               # async
        r'\bawait\s+',               # await
        r'^\s*//.*',                 # JS comments

        # General
        r'[{}\[\]();]',              # brackets and semicolons
        r'\w+\s*\(.*\)',             # function calls
        r'\w+\s*=\s*.+',            # assignments
        r'[!=<>]=',                  # comparison operators
        r'\b(true|false|null|None|undefined)\b',  # boolean/null literals
        r'["\'].*["\']',            # string literals
        r'\w+\.\w+\(',              # method calls (obj.method())

        # PHP
        r'\<\?php',                  # PHP opening tag
        r'\$\w+\s*=',               # PHP variables

        # Java / C#
        r'\bpublic\s+',             # access modifiers
        r'\bprivate\s+',
        r'\bprotected\s+',
        r'\bstatic\s+',
        r'\bvoid\s+',
        r'\bnew\s+\w+',             # object instantiation

        # HTML/SQL (common in web code)
        r'<\w+[^>]*>',              # HTML tags
        r'\bSELECT\b.*\bFROM\b',   # SQL queries
        r'\bINSERT\b.*\bINTO\b',
    ]

    # Minimum thresholds
    _MIN_CODE_LINES = 2        # Must have at least 2 lines
    _MIN_INDICATOR_MATCHES = 1 # Must match at least 1 code pattern
    _MIN_CODE_CHARS = 10       # Must have at least 10 characters

    def __init__(self):
        """Initialize with composed subsystems."""
        self._rule_factory = RuleFactory()  # Composition
        self._code_fixer = CodeFixer()      # Composition
        # Pre-compile code indicator patterns
        self._compiled_indicators = [
            re.compile(pattern, re.MULTILINE | re.IGNORECASE)
            for pattern in self._CODE_INDICATORS
        ]

    def validate_code(self, source_code, language="javascript"):
        """
        Validate that the input looks like actual programming code.

        Returns:
            tuple: (is_valid: bool, error_message: str or None)
        """
        stripped = source_code.strip()

        # Check minimum length
        if len(stripped) < self._MIN_CODE_CHARS:
            return False, (
                "Input is too short. Please paste actual source code "
                "(at least 10 characters)."
            )

        # Check minimum lines (at least 2 meaningful lines)
        meaningful_lines = [
            line for line in stripped.split('\n')
            if line.strip() and not line.strip().startswith(('#', '//', '/*', '*'))
        ]
        if len(meaningful_lines) < self._MIN_CODE_LINES:
            return False, (
                "Input has too few lines. Please paste a code block "
                "with at least 2 lines of code."
            )

        # Check for code structure indicators
        match_count = 0
        for pattern in self._compiled_indicators:
            if pattern.search(stripped):
                match_count += 1
                if match_count >= self._MIN_INDICATOR_MATCHES:
                    return True, None  # Valid code detected

        # Check if it's mostly alphanumeric without code structure
        # (random text like "asdfgh 12345 hello world" has no code patterns)
        alpha_ratio = sum(c.isalnum() or c.isspace() for c in stripped) / max(len(stripped), 1)
        if alpha_ratio > 0.95 and match_count == 0:
            return False, (
                "Input does not appear to be source code. "
                "Please paste valid programming code (Python, JavaScript, etc.) "
                "to analyze for security vulnerabilities."
            )

        # If we found no patterns at all, it's likely not code
        if match_count == 0:
            return False, (
                "Could not detect any programming language structure. "
                "Please paste valid source code to scan."
            )

        return True, None

    def scan(self, source_code, language="javascript"):
        """
        Perform a full security scan on the given source code.

        Args:
            source_code (str): The code to analyze.
            language (str): Programming language of the code.

        Returns:
            dict: Scan results containing:
                - findings (list): All detected vulnerabilities
                - corrected_code (str): Code with fixes applied
                - summary (dict): Vulnerability count by severity
                - total_issues (int): Total number of issues found
                - is_valid_code (bool): Whether input was valid code

        Raises:
            ValueError: If input is not valid programming code.
        """
        # Validate input is actual code
        is_valid, error_message = self.validate_code(source_code, language)
        if not is_valid:
            raise ValueError(error_message)

        lines = source_code.split('\n')
        all_findings = []

        # Run all rules against the source code (Strategy Pattern iteration)
        for rule in self._rule_factory.get_all_rules():
            # Filter by supported language
            rule_langs = [l.lower() for l in getattr(rule, "supported_languages", ["javascript", "typescript"])]
            if language and language.lower() not in rule_langs and "all" not in rule_langs:
                continue

            try:
                findings = rule.check(source_code, lines)
                all_findings.extend(findings)
            except Exception as e:
                # Don't let one rule failure break the entire scan
                all_findings.append({
                    "rule_id": rule.rule_id,
                    "severity": "info",
                    "title": f"Rule Error: {rule.title}",
                    "description": f"Internal error running rule: {str(e)}",
                    "line_number": 0,
                    "column": 0,
                    "code_snippet": "",
                    "suggested_fix": "",
                    "owasp_category": rule.owasp_category,
                })

        # Sort findings by severity (critical first) then by line number
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        all_findings.sort(
            key=lambda f: (
                severity_order.get(f.get("severity", "info"), 5),
                f.get("line_number", 0)
            )
        )

        # Generate corrected code only if there are findings
        corrected_code = ""
        if all_findings:
            corrected_code = self._code_fixer.apply_fixes(source_code, all_findings)

        # Build summary
        summary = self._build_summary(all_findings)

        return {
            "findings": all_findings,
            "corrected_code": corrected_code,
            "summary": summary,
            "total_issues": len(all_findings),
            "language": language,
            "is_valid_code": True,
        }

    def get_available_rules(self):
        """Return metadata for all registered security rules."""
        return self._rule_factory.get_all_metadata()

    def get_rule_count(self):
        """Return total number of scanning rules."""
        return self._rule_factory.get_rule_count()

    def _build_summary(self, findings):
        """Build a summary of findings by severity."""
        summary = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0,
        }
        owasp_categories = {}

        for finding in findings:
            severity = finding.get("severity", "info")
            if severity in summary:
                summary[severity] += 1

            category = finding.get("owasp_category", "Unknown")
            owasp_categories[category] = owasp_categories.get(category, 0) + 1

        return {
            "by_severity": summary,
            "by_owasp": owasp_categories,
            "total": len(findings),
            "risk_score": self._calculate_risk_score(summary),
        }

    def _calculate_risk_score(self, severity_counts):
        """
        Calculate an overall risk score (0-100).
        Higher = more dangerous.
        """
        weights = {"critical": 25, "high": 15, "medium": 8, "low": 3, "info": 1}
        score = sum(
            severity_counts.get(sev, 0) * weight
            for sev, weight in weights.items()
        )
        return min(score, 100)  # Cap at 100
