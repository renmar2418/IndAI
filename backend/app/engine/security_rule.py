"""
IndAI — SecurityRule Abstract Base Class (Strategy Pattern)
Demonstrates: Abstraction, Strategy Pattern

Every security rule must extend this class and implement check() and get_fix().
This enables adding new rules without modifying the scanner core.
"""

from abc import ABC, abstractmethod


class SecurityRule(ABC):
    """
    Abstract Base Class for all security scanning rules.

    Design Patterns:
    - Strategy Pattern: Each rule is a different scanning strategy
    - Template Method: Common metadata, custom check logic

    Subclasses MUST implement:
    - check(source_code, lines): Analyze code and return findings
    - get_fix(code_snippet): Return the corrected code snippet
    """

    def __init__(self):
        self._rule_id = ""
        self._title = ""
        self._description = ""
        self._severity = "info"
        self._owasp_category = ""
        self._supported_languages = ["javascript", "typescript"]

    @property
    def supported_languages(self):
        """List of languages this rule applies to."""
        return self._supported_languages

    @property
    def rule_id(self):
        """Unique identifier for this rule."""
        return self._rule_id

    @property
    def title(self):
        """Human-readable title of the vulnerability."""
        return self._title

    @property
    def description(self):
        """Detailed description of what this rule detects."""
        return self._description

    @property
    def severity(self):
        """Severity level: critical, high, medium, low, info."""
        return self._severity

    @property
    def owasp_category(self):
        """OWASP Top 10 category this rule maps to."""
        return self._owasp_category

    @abstractmethod
    def check(self, source_code, lines):
        """
        Analyze source code for this specific vulnerability.

        Args:
            source_code (str): The complete source code string.
            lines (list[str]): The source code split into lines.

        Returns:
            list[dict]: A list of finding dictionaries, each containing:
                - rule_id (str)
                - severity (str)
                - title (str)
                - description (str)
                - line_number (int)
                - column (int)
                - code_snippet (str)
                - suggested_fix (str)
                - owasp_category (str)
        """
        pass

    @abstractmethod
    def get_fix(self, code_snippet):
        """
        Generate a corrected version of the vulnerable code snippet.

        Args:
            code_snippet (str): The vulnerable line of code.

        Returns:
            str: The corrected line of code.
        """
        pass

    def _create_finding(self, line_number, column, code_snippet, suggested_fix, description=None):
        """
        Template method to create a standardized finding dictionary.
        Encapsulates finding creation logic.
        """
        return {
            "rule_id": self._rule_id,
            "severity": self._severity,
            "title": self._title,
            "description": description or self._description,
            "line_number": line_number,
            "column": column,
            "code_snippet": code_snippet.strip() if code_snippet else "",
            "suggested_fix": suggested_fix,
            "owasp_category": self._owasp_category,
        }

    def get_metadata(self):
        """Return rule metadata as a dictionary."""
        return {
            "rule_id": self._rule_id,
            "title": self._title,
            "description": self._description,
            "severity": self._severity,
            "owasp_category": self._owasp_category,
        }
