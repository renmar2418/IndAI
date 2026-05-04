"""
IndAI — Base Engine (Abstract Factory Pattern)
Demonstrates: Abstract Factory, Template Method Pattern

Abstract base class for all scanning engine types (SAST, Secret, SCA).
Each engine has its own scan() method and produces standardized findings.
"""

from abc import ABC, abstractmethod


class BaseEngine(ABC):
    """
    Abstract base for all IndAI scanning engines.

    Concrete implementations:
    - SASTEngine: AST-based vulnerability detection
    - SecretEngine: Entropy-based secret detection
    - (Future) SCAEngine: Software Composition Analysis
    """

    def __init__(self, engine_type: str, name: str):
        self.engine_type = engine_type
        self.name = name

    @abstractmethod
    def scan(self, source_code: str, language: str = "javascript") -> list:
        """
        Scan source code and return a list of finding dicts.

        Args:
            source_code: The code to scan.
            language: The programming language of the code.

        Returns:
            list[dict]: Standardized finding dictionaries.
        """
        pass

    def _create_finding(self, rule_id, severity, title, description,
                        line_number, column, code_snippet, suggested_fix,
                        owasp_category, engine_type=None):
        """Create a standardized finding dict with engine metadata."""
        return {
            "rule_id": rule_id,
            "severity": severity,
            "title": title,
            "description": description,
            "line_number": line_number,
            "column": column,
            "code_snippet": code_snippet.strip() if code_snippet else "",
            "suggested_fix": suggested_fix,
            "owasp_category": owasp_category,
            "engine": engine_type or self.engine_type,
        }
