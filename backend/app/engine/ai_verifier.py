"""
IndAI — AI Verifier (Mediator Pattern)
Demonstrates: Mediator Pattern, Decorator Pattern

Orchestrates Stage 2 of the hybrid pipeline. Takes all raw findings
from Stage 1, sends each to the AIProviderChain for verification,
and enriches every finding with AI metadata.

Fields added to each finding:
    - ai_verified (bool): Was an AI able to review this?
    - confidence (float 0-1): AI confidence this is real
    - ai_explanation (str): Why it IS or IS NOT dangerous
    - false_positive (bool): AI thinks this is NOT a real issue
    - ai_provider (str): Which provider verified it (Groq/Gemini/Mistral)
"""

import os
import time
import logging
from app.engine.ai_provider import AIProviderChain

logger = logging.getLogger(__name__)


class AIVerifier:
    """
    Mediator between the rule engine findings and AI providers.

    Enriches every finding with AI verification data. If AI is disabled
    or all providers fail, findings pass through unchanged with
    ai_verified=False.
    """

    def __init__(self):
        self._enabled = os.getenv("AI_VERIFY_ENABLED", "true").lower() == "true"
        self._chain = AIProviderChain() if self._enabled else None

        if self._enabled and self._chain and self._chain.has_providers:
            logger.info("[AIVerifier] AI verification is ENABLED")
        elif self._enabled:
            logger.warning("[AIVerifier] AI verification enabled but no providers configured")
            self._enabled = False
        else:
            logger.info("[AIVerifier] AI verification is DISABLED")

    @property
    def is_enabled(self) -> bool:
        return self._enabled and self._chain is not None and self._chain.has_providers

    def verify_findings(self, findings: list, source_code: str) -> list:
        """
        Verify ALL findings through the AI provider chain.

        Args:
            findings: List of raw finding dicts from Stage 1.
            source_code: The full source code (for context extraction).

        Returns:
            list: The same findings, enriched with AI verification fields.
        """
        if not self.is_enabled or not findings:
            # Tag all findings as unverified and pass through
            for finding in findings:
                finding.update({
                    "ai_verified": False,
                    "confidence": None,
                    "ai_explanation": "",
                    "false_positive": False,
                    "ai_provider": None,
                })
            return findings

        lines = source_code.split("\n")
        verified_findings = []
        false_positive_count = 0

        start_time = time.time()
        MAX_VERIFY_TIME = 15.0  # Safe margin before frontend timeout (30s)

        for finding in findings:
            # Check overall timeout to prevent frontend disconnects
            if time.time() - start_time > MAX_VERIFY_TIME:
                finding.update({
                    "ai_verified": False,
                    "confidence": None,
                    "ai_explanation": "Skipped due to verification timeout limit (file too large)",
                    "false_positive": False,
                    "ai_provider": None,
                })
                verified_findings.append(finding)
                continue

            # Extract surrounding code context (5 lines above and below)
            line_num = finding.get("line_number", 0)
            context = self._extract_context(lines, line_num, window=5)

            try:
                ai_result = self._chain.verify(finding, context)
                finding.update(ai_result)

                if ai_result.get("false_positive", False):
                    false_positive_count += 1

                # Apply severity adjustment if AI recommends it
                if ai_result.get("severity_adjustment") != "same":
                    recommended = ai_result.get("recommended_severity")
                    if recommended and recommended in ("critical", "high", "medium", "low", "info"):
                        finding["original_severity"] = finding["severity"]
                        finding["severity"] = recommended

            except Exception as e:
                logger.error(f"[AIVerifier] Error verifying finding {finding.get('rule_id')}: {e}")
                finding.update({
                    "ai_verified": False,
                    "confidence": None,
                    "ai_explanation": f"Verification error: {str(e)}",
                    "false_positive": False,
                    "ai_provider": None,
                })

            verified_findings.append(finding)

        if false_positive_count > 0:
            logger.info(
                f"[AIVerifier] Identified {false_positive_count}/{len(findings)} "
                f"findings as likely false positives"
            )

        return verified_findings

    def _extract_context(self, lines: list, line_num: int, window: int = 5) -> str:
        """Extract surrounding code lines for AI context."""
        if line_num <= 0 or not lines:
            return ""

        start = max(0, line_num - window - 1)
        end = min(len(lines), line_num + window)

        context_lines = []
        for i in range(start, end):
            marker = " >>> " if i == line_num - 1 else "     "
            context_lines.append(f"{i + 1:4d}{marker}{lines[i]}")

        return "\n".join(context_lines)
