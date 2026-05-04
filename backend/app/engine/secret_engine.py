"""
IndAI — Secret Engine (Entropy-Based Detection)
Demonstrates: Strategy Pattern, Shannon Entropy Analysis

TruffleHog-style entropy-based secret detection. Calculates Shannon
entropy of strings to catch secrets that don't match known regex patterns.

Inspired by: TruffleHog, GitLeaks, detect-secrets
"""

import re
import math
import logging
from app.engine.base_engine import BaseEngine

logger = logging.getLogger(__name__)


class SecretEngine(BaseEngine):
    """
    Entropy-based secret detection engine.

    Two detection strategies:
    1. Known patterns: Regex for well-known secret formats (AWS, Stripe, etc.)
    2. High-entropy strings: Shannon entropy calculation to catch unknown secrets
    """

    # Entropy thresholds (calibrated to minimize false positives)
    HEX_ENTROPY_THRESHOLD = 3.0      # For hex strings (0-9a-f)
    BASE64_ENTROPY_THRESHOLD = 4.2   # For base64 strings
    GENERIC_ENTROPY_THRESHOLD = 4.5  # For generic high-entropy strings
    MIN_SECRET_LENGTH = 12           # Minimum length to consider

    # Character sets for entropy classification
    HEX_CHARS = set("0123456789abcdefABCDEF")
    BASE64_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")

    def __init__(self):
        super().__init__(engine_type="secret", name="Secret Engine")

        # Known secret patterns (high-confidence, no entropy needed)
        self._known_patterns = [
            {
                "pattern": re.compile(r'AKIA[0-9A-Z]{16}'),
                "name": "AWS Access Key ID",
                "severity": "critical",
            },
            {
                "pattern": re.compile(r'ASIA[0-9A-Z]{16}'),
                "name": "AWS Temporary Access Key",
                "severity": "critical",
            },
            {
                "pattern": re.compile(r'ghp_[A-Za-z0-9_]{36}'),
                "name": "GitHub Personal Access Token",
                "severity": "critical",
            },
            {
                "pattern": re.compile(r'gho_[A-Za-z0-9_]{36}'),
                "name": "GitHub OAuth Token",
                "severity": "critical",
            },
            {
                "pattern": re.compile(r'sk_live_[A-Za-z0-9]{24,}'),
                "name": "Stripe Secret Key",
                "severity": "critical",
            },
            {
                "pattern": re.compile(r'sk-[A-Za-z0-9]{48,}'),
                "name": "OpenAI API Key",
                "severity": "critical",
            },
            {
                "pattern": re.compile(r'-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----'),
                "name": "Private Key",
                "severity": "critical",
            },
            {
                "pattern": re.compile(r'eyJ[A-Za-z0-9\-_]{10,}\.eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}'),
                "name": "JSON Web Token (JWT)",
                "severity": "high",
            },
            {
                "pattern": re.compile(r'https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+'),
                "name": "Slack Webhook URL",
                "severity": "high",
            },
            {
                "pattern": re.compile(r'xox[baprs]-[A-Za-z0-9\-]{10,}'),
                "name": "Slack API Token",
                "severity": "critical",
            },
        ]

        # Variable name patterns that suggest a secret assignment
        self._secret_var_pattern = re.compile(
            r'(?:password|passwd|pwd|secret|token|api_?key|apikey|auth|credential|'
            r'private_?key|access_?key|secret_?key|encryption_?key|signing_?key|'
            r'client_?secret|app_?secret)\s*[=:]\s*["\']([^"\']{8,})["\']',
            re.IGNORECASE
        )

        # Patterns to SKIP (known false positives)
        self._skip_patterns = [
            re.compile(r'getenv|environ|process\.env', re.IGNORECASE),
            re.compile(r'placeholder|example|changeme|your[_-]', re.IGNORECASE),
            re.compile(r'\.env\b|config\.get|settings\.', re.IGNORECASE),
            re.compile(r'https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0)'),
            re.compile(r'(?:xxx|aaa|bbb|test|fake|dummy|mock)', re.IGNORECASE),
        ]

    def scan(self, source_code: str, language: str = "javascript") -> list:
        """Run secret detection on the given source code."""
        findings = []
        lines = source_code.split("\n")

        for i, line in enumerate(lines, 1):
            stripped = line.strip()

            # Skip comments and blank lines
            if not stripped or stripped.startswith("#") or stripped.startswith("//"):
                continue

            # Skip lines with known safe patterns
            if any(p.search(line) for p in self._skip_patterns):
                continue

            # Strategy 1: Known secret patterns
            for known in self._known_patterns:
                match = known["pattern"].search(line)
                if match:
                    findings.append(self._create_finding(
                        rule_id="SECRET-001",
                        severity=known["severity"],
                        title=f"Detected {known['name']}",
                        description=(
                            f"A {known['name']} was found hardcoded in source code. "
                            f"This should be moved to environment variables or a secrets manager."
                        ),
                        line_number=i,
                        column=match.start() + 1,
                        code_snippet=line,
                        suggested_fix="# Move to environment variable:\n# value = os.getenv('SECRET_NAME')",
                        owasp_category="A07:2021 - Identification and Authentication Failures",
                    ))

            # Strategy 2: Variable assignment with high-entropy value
            var_match = self._secret_var_pattern.search(line)
            if var_match:
                value = var_match.group(1)
                entropy = self._shannon_entropy(value)
                threshold = self._get_threshold(value)

                if entropy >= threshold and len(value) >= self.MIN_SECRET_LENGTH:
                    findings.append(self._create_finding(
                        rule_id="SECRET-002",
                        severity="high",
                        title="High-Entropy Secret in Variable",
                        description=(
                            f"A high-entropy string (entropy={entropy:.2f}) was assigned to a "
                            f"sensitive variable. This looks like a real secret that should not "
                            f"be hardcoded."
                        ),
                        line_number=i,
                        column=var_match.start() + 1,
                        code_snippet=line,
                        suggested_fix="# Move to environment variable:\n# value = os.getenv('SECRET_NAME')",
                        owasp_category="A07:2021 - Identification and Authentication Failures",
                    ))

        return findings

    # ── Shannon Entropy ─────────────────────────────

    @staticmethod
    def _shannon_entropy(data: str) -> float:
        """
        Calculate Shannon entropy of a string.

        Higher entropy = more random = more likely to be a real secret.
        - English text: ~3.5-4.0 bits
        - Base64 encoded: ~5.0-6.0 bits
        - Hex encoded: ~3.5-4.0 bits
        - Random bytes: ~7.5-8.0 bits
        """
        if not data:
            return 0.0

        freq = {}
        for char in data:
            freq[char] = freq.get(char, 0) + 1

        length = len(data)
        entropy = 0.0
        for count in freq.values():
            probability = count / length
            if probability > 0:
                entropy -= probability * math.log2(probability)

        return entropy

    def _get_threshold(self, value: str) -> float:
        """Determine the appropriate entropy threshold based on character set."""
        chars = set(value)
        if chars.issubset(self.HEX_CHARS):
            return self.HEX_ENTROPY_THRESHOLD
        if chars.issubset(self.BASE64_CHARS):
            return self.BASE64_ENTROPY_THRESHOLD
        return self.GENERIC_ENTROPY_THRESHOLD
