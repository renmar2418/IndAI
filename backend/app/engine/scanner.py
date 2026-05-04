"""
IndAI — Hybrid Scanner (Facade Pattern)
Demonstrates: Facade Pattern, Composition, Two-Stage Pipeline

The main orchestrator that coordinates the hybrid scanning pipeline:
  Stage 1: Deterministic analysis (SAST + Secret + Regex rules) — instant, no API
  Stage 2: AI Verification (Groq → Gemini → Mistral) — enriches ALL findings

Provides a simple scan() interface that hides all internal complexity.
"""

import re
import time
import logging
from app.engine.rule_factory import RuleFactory
from app.engine.code_fixer import CodeFixer
from app.engine.sast_engine import SASTEngine
from app.engine.secret_engine import SecretEngine
from app.engine.ai_verifier import AIVerifier

logger = logging.getLogger(__name__)


class Scanner:
    """
    Facade Pattern — Provides a simplified interface to the scanning subsystem.

    Composition: Contains RuleFactory, CodeFixer, SASTEngine, SecretEngine,
    and AIVerifier instances.

    The hybrid scanner orchestrates:
    1. Code validation (check if input is actual code)
    2. Stage 1 — Deterministic scanning:
       a. SAST Engine (AST-based for Python, enhanced regex for JS)
       b. Secret Engine (entropy-based secret detection)
       c. Existing 20 regex rules via RuleFactory
    3. Deduplication of findings across engines
    4. Stage 2 — AI Verification (all findings, all severities)
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
        self._rule_factory = RuleFactory()   # Composition — existing regex rules
        self._code_fixer = CodeFixer()       # Composition — auto-fix generator
        self._sast_engine = SASTEngine()     # Composition — AST-based scanning
        self._secret_engine = SecretEngine() # Composition — entropy-based secrets
        self._ai_verifier = AIVerifier()     # Composition — AI verification chain

        # Pre-compile code indicator patterns
        self._compiled_indicators = [
            re.compile(pattern, re.MULTILINE | re.IGNORECASE)
            for pattern in self._CODE_INDICATORS
        ]

        logger.info(
            f"[Scanner] Hybrid engine initialized — "
            f"{self._rule_factory.get_rule_count()} rules, "
            f"SAST engine: ON, Secret engine: ON, "
            f"AI verification: {'ON' if self._ai_verifier.is_enabled else 'OFF'}"
        )

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
        Perform a full hybrid security scan on the given source code.

        Two-Stage Pipeline:
            Stage 1: Deterministic engines (SAST + Secret + Regex rules)
            Stage 2: AI Verification (enriches ALL findings)

        Args:
            source_code (str): The code to analyze.
            language (str): Programming language of the code.

        Returns:
            dict: Scan results containing:
                - findings (list): All detected vulnerabilities (AI-enriched)
                - corrected_code (str): Code with fixes applied
                - summary (dict): Vulnerability count by severity
                - total_issues (int): Total number of issues found
                - is_valid_code (bool): Whether input was valid code
                - engine_stats (dict): Per-engine finding counts
                - ai_stats (dict): AI verification statistics

        Raises:
            ValueError: If input is not valid programming code.
        """
        scan_start = time.time()

        # Validate input is actual code
        is_valid, error_message = self.validate_code(source_code, language)
        if not is_valid:
            raise ValueError(error_message)

        lines = source_code.split('\n')

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # STAGE 1: Deterministic Analysis (no API calls)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        stage1_start = time.time()
        all_findings = []

        # 1a. SAST Engine (AST-based)
        try:
            sast_findings = self._sast_engine.scan(source_code, language)
            all_findings.extend(sast_findings)
            logger.info(f"[Stage 1] SAST engine found {len(sast_findings)} issues")
        except Exception as e:
            logger.error(f"[Stage 1] SAST engine error: {e}")

        # 1b. Secret Engine (entropy-based)
        try:
            secret_findings = self._secret_engine.scan(source_code, language)
            all_findings.extend(secret_findings)
            logger.info(f"[Stage 1] Secret engine found {len(secret_findings)} issues")
        except Exception as e:
            logger.error(f"[Stage 1] Secret engine error: {e}")

        # 1c. Existing regex rules via RuleFactory
        regex_count = 0
        for rule in self._rule_factory.get_all_rules():
            # Filter by supported language
            rule_langs = [l.lower() for l in getattr(rule, "supported_languages", ["javascript", "typescript"])]
            if language and language.lower() not in rule_langs and "all" not in rule_langs:
                continue

            try:
                findings = rule.check(source_code, lines)
                # Tag each finding with its engine type
                for f in findings:
                    if "engine" not in f:
                        f["engine"] = getattr(rule, "engine_type", "regex")
                all_findings.extend(findings)
                regex_count += len(findings)
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
                    "engine": "regex",
                })

        logger.info(f"[Stage 1] Regex rules found {regex_count} issues")

        # Deduplicate findings (same rule + same line = duplicate)
        all_findings = self._deduplicate(all_findings)

        stage1_time = round(time.time() - stage1_start, 3)
        logger.info(
            f"[Stage 1] Complete — {len(all_findings)} unique findings "
            f"in {stage1_time}s"
        )

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # STAGE 2: AI Verification (all findings)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        stage2_start = time.time()

        all_findings = self._ai_verifier.verify_findings(all_findings, source_code)

        stage2_time = round(time.time() - stage2_start, 3)
        logger.info(f"[Stage 2] AI verification complete in {stage2_time}s")

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
        engine_stats = self._build_engine_stats(all_findings)
        ai_stats = self._build_ai_stats(all_findings)

        total_time = round(time.time() - scan_start, 3)
        logger.info(
            f"[Scanner] Hybrid scan complete — {len(all_findings)} findings, "
            f"total time: {total_time}s (Stage1: {stage1_time}s, Stage2: {stage2_time}s)"
        )

        return {
            "findings": all_findings,
            "corrected_code": corrected_code,
            "summary": summary,
            "total_issues": len(all_findings),
            "language": language,
            "is_valid_code": True,
            "engine_stats": engine_stats,
            "ai_stats": ai_stats,
            "scan_time": {
                "total": total_time,
                "stage1_deterministic": stage1_time,
                "stage2_ai_verification": stage2_time,
            },
        }

    def get_available_rules(self):
        """Return metadata for all registered security rules."""
        return self._rule_factory.get_all_metadata()

    def get_rule_count(self):
        """Return total number of scanning rules (regex + SAST + secret)."""
        # Count the built-in SAST and secret engine rules too
        sast_rule_count = len(self._sast_engine._python_dangerous_calls) + \
                          len(self._sast_engine._python_dangerous_attrs) + \
                          len(self._sast_engine._js_patterns)
        secret_rule_count = len(self._secret_engine._known_patterns) + 1  # +1 for entropy
        return self._rule_factory.get_rule_count() + sast_rule_count + secret_rule_count

    def _deduplicate(self, findings):
        """Remove duplicate findings (same rule_id + same line_number)."""
        seen = set()
        unique = []
        for f in findings:
            key = (f.get("rule_id", ""), f.get("line_number", 0))
            if key not in seen:
                seen.add(key)
                unique.append(f)
        return unique

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

    def _build_engine_stats(self, findings):
        """Build per-engine statistics."""
        stats = {"sast": 0, "secret": 0, "regex": 0, "sca": 0}
        for f in findings:
            engine = f.get("engine", "regex")
            stats[engine] = stats.get(engine, 0) + 1
        return stats

    def _build_ai_stats(self, findings):
        """Build AI verification statistics."""
        total = len(findings)
        verified = sum(1 for f in findings if f.get("ai_verified", False))
        false_positives = sum(1 for f in findings if f.get("false_positive", False))
        providers_used = set(
            f.get("ai_provider") for f in findings
            if f.get("ai_provider")
        )
        return {
            "total_findings": total,
            "ai_verified": verified,
            "ai_unverified": total - verified,
            "false_positives_detected": false_positives,
            "true_positives": verified - false_positives,
            "providers_used": list(providers_used),
            "verification_rate": round(verified / max(total, 1) * 100, 1),
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

