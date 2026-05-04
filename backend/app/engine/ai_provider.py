"""
IndAI — AI Provider Chain (Chain of Responsibility Pattern)
Demonstrates: Chain of Responsibility, Strategy Pattern, Graceful Degradation

Provides an abstraction layer over multiple AI providers (Groq, Gemini, Mistral)
with automatic failover. If the primary provider is rate-limited or errors out,
the chain silently falls through to the next provider.

Provider priority:
    1. Groq (LPU inference — fastest, free tier)
    2. Gemini Flash (Google — fast, generous free tier)
    3. Mistral (EU-based — reliable fallback)
"""

import os
import json
import logging
import time
from abc import ABC, abstractmethod

import requests

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Exceptions
# ──────────────────────────────────────────────

class AIProviderError(Exception):
    """Base exception for AI provider failures."""
    pass


class RateLimitError(AIProviderError):
    """Raised when a provider returns HTTP 429."""
    pass


class AuthenticationError(AIProviderError):
    """Raised when a provider rejects the API key."""
    pass


# ──────────────────────────────────────────────
# Abstract Base Provider
# ──────────────────────────────────────────────

class BaseAIProvider(ABC):
    """
    Abstract base class for all AI providers.

    Each concrete provider implements `_call_api()` which handles
    the provider-specific HTTP request format.
    """

    def __init__(self, name: str, api_key: str = None):
        self.name = name
        self.api_key = api_key
        self._enabled = bool(api_key)

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    def verify(self, finding: dict, code_context: str) -> dict:
        """
        Ask the AI to verify a single security finding.

        Args:
            finding: The raw finding dict from Stage 1.
            code_context: Surrounding source code for context.

        Returns:
            dict with ai_verified, confidence, ai_explanation, false_positive.

        Raises:
            RateLimitError: If provider returns 429.
            AIProviderError: For any other API failure.
        """
        if not self.is_enabled:
            raise AIProviderError(f"{self.name} is not configured (missing API key)")

        prompt = self._build_prompt(finding, code_context)

        start = time.time()
        try:
            raw_response = self._call_api(prompt)
            elapsed = round(time.time() - start, 2)
            logger.info(f"[{self.name}] AI verification completed in {elapsed}s")
            return self._parse_response(raw_response)
        except RateLimitError:
            logger.warning(f"[{self.name}] Rate limited (429) — falling through to next provider")
            raise
        except AuthenticationError:
            logger.error(f"[{self.name}] Authentication failed — check API key")
            raise AIProviderError(f"{self.name} authentication failed")
        except Exception as e:
            logger.error(f"[{self.name}] API call failed: {e}")
            raise AIProviderError(str(e))

    def _build_prompt(self, finding: dict, code_context: str) -> str:
        """Build a structured verification prompt for the AI."""
        return f"""You are an expert security code reviewer. Analyze the following security finding and determine if it is a TRUE positive vulnerability or a FALSE positive.

## Security Finding
- **Rule**: {finding.get('rule_id', 'Unknown')} — {finding.get('title', 'Unknown')}
- **Severity**: {finding.get('severity', 'unknown')}
- **Description**: {finding.get('description', '')}
- **Line**: {finding.get('line_number', 0)}
- **Flagged Code**: `{finding.get('code_snippet', '')}`
- **OWASP Category**: {finding.get('owasp_category', 'N/A')}

## Surrounding Code Context
```
{code_context}
```

## Instructions
Respond ONLY with a valid JSON object (no markdown, no extra text). Use this exact schema:
{{
    "is_vulnerability": true/false,
    "confidence": 0.0 to 1.0,
    "explanation": "Brief explanation of why this IS or IS NOT a real vulnerability",
    "severity_adjustment": "same" | "upgrade" | "downgrade",
    "recommended_severity": "critical" | "high" | "medium" | "low" | "info",
    "accurate_fix": "Provide the exact line(s) of code to fix the issue. Write actual code. Return null if no fix is possible."
}}
"""

    def _parse_response(self, raw_response: str) -> dict:
        """Parse the AI's JSON response into a structured result."""
        try:
            # Try to extract JSON from the response
            text = raw_response.strip()

            # Handle markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            parsed = json.loads(text)

            return {
                "ai_verified": True,
                "confidence": float(parsed.get("confidence", 0.5)),
                "ai_explanation": parsed.get("explanation", ""),
                "false_positive": not parsed.get("is_vulnerability", True),
                "severity_adjustment": parsed.get("severity_adjustment", "same"),
                "recommended_severity": parsed.get("recommended_severity", None),
                "accurate_fix": parsed.get("accurate_fix", None),
                "ai_provider": self.name,
            }
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"[{self.name}] Failed to parse AI response: {e}")
            # Return a partial result — still marks as AI-verified
            return {
                "ai_verified": True,
                "confidence": 0.5,
                "ai_explanation": raw_response[:500] if raw_response else "AI response was unparseable",
                "false_positive": False,
                "severity_adjustment": "same",
                "recommended_severity": None,
                "accurate_fix": None,
                "ai_provider": self.name,
            }

    @abstractmethod
    def _call_api(self, prompt: str) -> str:
        """
        Provider-specific API call. Must return the raw text response.
        Raise RateLimitError on 429, AIProviderError on other failures.
        """
        pass

    @abstractmethod
    def _call_text_api(self, system_prompt: str, user_prompt: str) -> str:
        """Call the AI without JSON enforcement for generic text tasks."""
        pass


# ──────────────────────────────────────────────
# Concrete Providers
# ──────────────────────────────────────────────

class GroqProvider(BaseAIProvider):
    """
    Groq LPU Inference — Primary provider.
    Uses Llama 3 70B for fast, high-quality analysis.
    Free tier: 30 req/min, 14,400 req/day.
    """

    API_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "llama-3.3-70b-versatile"

    def __init__(self, api_key: str = None):
        super().__init__(
            name="Groq",
            api_key=api_key or os.getenv("GROQ_API_KEY"),
        )

    def _call_api(self, prompt: str) -> str:
        response = requests.post(
            self.API_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.MODEL,
                "messages": [
                    {"role": "system", "content": "You are a security code review expert. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 512,
            },
            timeout=30,
        )

        if response.status_code == 429:
            raise RateLimitError("Groq rate limit exceeded")
        if response.status_code == 401:
            raise AuthenticationError("Invalid Groq API key")
        if response.status_code != 200:
            raise AIProviderError(f"Groq returned {response.status_code}: {response.text[:200]}")

        data = response.json()
        return data["choices"][0]["message"]["content"]

    def _call_text_api(self, system_prompt: str, user_prompt: str) -> str:
        response = requests.post(
            self.API_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 1024,
            },
            timeout=30,
        )

        if response.status_code == 429:
            raise RateLimitError("Groq rate limit exceeded")
        if response.status_code == 401:
            raise AuthenticationError("Invalid Groq API key")
        if response.status_code != 200:
            raise AIProviderError(f"Groq returned {response.status_code}: {response.text[:200]}")

        data = response.json()
        return data["choices"][0]["message"]["content"]


class GeminiProvider(BaseAIProvider):
    """
    Google Gemini Flash — Secondary fallback.
    Uses the google-genai SDK already in the project.
    Free tier: 15 RPM, 1M TPM.
    """

    def __init__(self, api_key: str = None):
        super().__init__(
            name="Gemini",
            api_key=api_key or os.getenv("GEMINI_API_KEY"),
        )

    def _call_api(self, prompt: str) -> str:
        try:
            from google import genai

            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            return response.text
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "resource exhausted" in error_str or "rate" in error_str:
                raise RateLimitError("Gemini rate limit exceeded")
            if "401" in error_str or "invalid" in error_str and "key" in error_str:
                raise AuthenticationError("Invalid Gemini API key")
            raise AIProviderError(f"Gemini error: {e}")

    def _call_text_api(self, system_prompt: str, user_prompt: str) -> str:
        try:
            from google import genai
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=f"{system_prompt}\n\n{user_prompt}",
            )
            return response.text
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "resource exhausted" in error_str or "rate" in error_str:
                raise RateLimitError("Gemini rate limit exceeded")
            if "401" in error_str or "invalid" in error_str and "key" in error_str:
                raise AuthenticationError("Invalid Gemini API key")
            raise AIProviderError(f"Gemini error: {e}")


class MistralProvider(BaseAIProvider):
    """
    Mistral AI — Third fallback.
    Uses the REST API directly (no SDK needed).
    Free tier: Mistral Small via La Plateforme.
    """

    API_URL = "https://api.mistral.ai/v1/chat/completions"
    MODEL = "mistral-small-latest"

    def __init__(self, api_key: str = None):
        super().__init__(
            name="Mistral",
            api_key=api_key or os.getenv("MISTRAL_API_KEY"),
        )

    def _call_api(self, prompt: str) -> str:
        response = requests.post(
            self.API_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.MODEL,
                "messages": [
                    {"role": "system", "content": "You are a security code review expert. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 512,
            },
            timeout=30,
        )

        if response.status_code == 429:
            raise RateLimitError("Mistral rate limit exceeded")
        if response.status_code == 401:
            raise AuthenticationError("Invalid Mistral API key")
        if response.status_code != 200:
            raise AIProviderError(f"Mistral returned {response.status_code}: {response.text[:200]}")

        data = response.json()
        return data["choices"][0]["message"]["content"]

    def _call_text_api(self, system_prompt: str, user_prompt: str) -> str:
        response = requests.post(
            self.API_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 1024,
            },
            timeout=30,
        )

        if response.status_code == 429:
            raise RateLimitError("Mistral rate limit exceeded")
        if response.status_code == 401:
            raise AuthenticationError("Invalid Mistral API key")
        if response.status_code != 200:
            raise AIProviderError(f"Mistral returned {response.status_code}: {response.text[:200]}")

        data = response.json()
        return data["choices"][0]["message"]["content"]


# ──────────────────────────────────────────────
# Chain of Responsibility Orchestrator
# ──────────────────────────────────────────────

class AIProviderChain:
    """
    Chain of Responsibility — Tries each AI provider in priority order.
    If one fails (rate limit, auth error, timeout), silently falls to the next.
    If ALL providers fail, returns a graceful degradation result.
    """

    def __init__(self):
        self.providers = [
            GroqProvider(),
            GeminiProvider(),
            MistralProvider(),
        ]
        # Filter to only enabled providers
        self._active_providers = [p for p in self.providers if p.is_enabled]

        if self._active_providers:
            names = ", ".join(p.name for p in self._active_providers)
            logger.info(f"[AIProviderChain] Active providers: {names}")
        else:
            logger.warning("[AIProviderChain] No AI providers configured — AI verification disabled")

    @property
    def has_providers(self) -> bool:
        """Check if at least one provider is configured."""
        return len(self._active_providers) > 0

    def verify(self, finding: dict, code_context: str) -> dict:
        """
        Try each provider in sequence. Return the first successful result.
        If all fail, return a graceful degradation result.
        """
        if not self._active_providers:
            return self._degraded_result("No AI providers configured or all rate-limited")

        last_error = None
        for provider in list(self._active_providers):
            try:
                result = provider.verify(finding, code_context)
                return result
            except RateLimitError as e:
                logger.warning(f"[AIProviderChain] {provider.name} rate limited. Circuit breaker triggered (disabled for rest of scan).")
                self._active_providers.remove(provider)
                last_error = e
                continue
            except AIProviderError as e:
                last_error = e
                continue

        # All providers failed
        logger.warning(f"[AIProviderChain] All providers failed. Last error: {last_error}")
        return self._degraded_result(str(last_error))

    def _degraded_result(self, reason: str) -> dict:
        """Return a graceful degradation result when no AI is available."""
        return {
            "ai_verified": False,
            "confidence": None,
            "ai_explanation": f"AI verification unavailable: {reason}",
            "false_positive": False,
            "severity_adjustment": "same",
            "ai_provider": None,
        }

    def generate_summary(self, findings_text: str, language: str) -> str:
        """Generate a natural, professional security abstract without AI artifacts (no asterisks/markdown symbols)."""
        if not self._active_providers:
            return "AI Summary unavailable: No AI providers configured."

        system_prompt = (
            "You are a Professional Security Summarizer. Your goal is to write a natural, easy-to-read security assessment in plain English. "
            "Do NOT use asterisks (*), dashes (-), or any markdown symbols. Do NOT use bullet points. "
            "Write in clear, cohesive paragraphs. Use natural, non-complicated language that anyone can understand. "
            "To highlight a VULNERABILITY or a SECTION TITLE, use FULL UPPERCASE. "
            "Structure the response into three distinct parts: GLOBAL RISK, ARCHITECTURAL FLAWS, and REMEDIATION STEPS."
        )

        user_prompt = (
            f"Analyze these findings for a {language} application. Write a professional but natural-sounding summary in 2-3 paragraphs. "
            "Avoid technical jargon where possible. Ensure there are NO asterisks or special characters in your response. "
            "Use ONLY uppercase letters for important titles and vulnerability names.\n\n"
            f"FINDINGS:\n{findings_text}"
        )

        last_error = None
        for provider in list(self._active_providers):
            try:
                start = time.time()
                result = provider._call_text_api(system_prompt, user_prompt)
                logger.info(f"[AIProviderChain] Natural Summary generated by {provider.name} in {time.time()-start:.2f}s")
                return result.strip()
            except RateLimitError as e:
                logger.warning(f"[AIProviderChain] {provider.name} rate limited during summary.")
                self._active_providers.remove(provider)
                last_error = e
                continue
            except AIProviderError as e:
                last_error = e
                continue
            except Exception as e:
                last_error = e
                continue

        logger.warning(f"[AIProviderChain] All providers failed summary generation: {last_error}")
        return f"AI Summary generation failed: {last_error}"
