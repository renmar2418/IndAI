"""
IndAI — Rule Factory (Factory Pattern)
Demonstrates: Factory Pattern, Encapsulation

Dynamically discovers and instantiates all security rules.
"""

from app.engine.rules.eval_usage import EvalUsageRule
from app.engine.rules.sql_injection import SQLInjectionRule
from app.engine.rules.xss_detection import XSSRule
from app.engine.rules.hardcoded_secrets import HardcodedSecretsRule
from app.engine.rules.insecure_random import InsecureRandomRule
from app.engine.rules.no_https import NoHTTPSRule
from app.engine.rules.command_injection import CommandInjectionRule
from app.engine.rules.path_traversal import PathTraversalRule
from app.engine.rules.insecure_deserialization import InsecureDeserializationRule
from app.engine.rules.weak_crypto import WeakCryptoRule
from app.engine.rules.prototype_pollution import PrototypePollutionRule
from app.engine.rules.open_redirect import OpenRedirectRule
from app.engine.rules.missing_auth import MissingAuthRule
from app.engine.rules.insecure_regex import InsecureRegexRule
from app.engine.rules.deprecated_api import DeprecatedAPIRule
from app.engine.rules.python_eval import PythonEvalRule
from app.engine.rules.python_sqli import PythonSqlInjectionRule
from app.engine.rules.python_pickle import PythonPickleRule
from app.engine.rules.react_dangerously_set import ReactDangerouslySetRule
from app.engine.rules.dependency_scan import DependencyScanRule


class RuleFactory:
    """
    Factory Pattern — Creates and manages security rule instances.

    Centralizes rule creation so the Scanner doesn't need to know
    about individual rule implementations.
    """

    # Registry of all available rule classes
    _rule_classes = [
        EvalUsageRule,
        SQLInjectionRule,
        XSSRule,
        HardcodedSecretsRule,
        InsecureRandomRule,
        NoHTTPSRule,
        CommandInjectionRule,
        PathTraversalRule,
        InsecureDeserializationRule,
        WeakCryptoRule,
        PrototypePollutionRule,
        OpenRedirectRule,
        MissingAuthRule,
        InsecureRegexRule,
        DeprecatedAPIRule,
        PythonEvalRule,
        PythonSqlInjectionRule,
        PythonPickleRule,
        ReactDangerouslySetRule,
        DependencyScanRule,
    ]

    def __init__(self):
        """Instantiate all registered rules."""
        self._rules = [RuleClass() for RuleClass in self._rule_classes]

    def get_all_rules(self):
        """Return all instantiated rules."""
        return self._rules

    def get_by_severity(self, severity):
        """Filter rules by severity level."""
        return [rule for rule in self._rules if rule.severity == severity]

    def get_by_category(self, owasp_category):
        """Filter rules by OWASP category."""
        return [
            rule for rule in self._rules
            if owasp_category.lower() in rule.owasp_category.lower()
        ]

    def get_by_id(self, rule_id):
        """Find a specific rule by its ID."""
        for rule in self._rules:
            if rule.rule_id == rule_id:
                return rule
        return None

    def get_rule_count(self):
        """Return total number of registered rules."""
        return len(self._rules)

    def get_all_metadata(self):
        """Return metadata for all rules (for frontend display)."""
        return [rule.get_metadata() for rule in self._rules]
