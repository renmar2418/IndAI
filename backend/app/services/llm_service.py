"""
IndAI — LLM Service
Handles integration with Google's Gemini API for the Agentic Widget.
Provides intelligent, conversational security assistance.
"""

import os
import json
import logging
from google import genai
from google.genai import types
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        # The API key must be set in the environment variables (.env file)
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.is_configured = bool(self.api_key)
        
        if self.is_configured:
            # Use the official v1.0.0+ genai client
            self.client = genai.Client(api_key=self.api_key)
            self.model_name = 'gemini-2.5-flash'
        else:
            logger.warning("GEMINI_API_KEY not found in environment variables. LLM Service will operate in fallback mode.")

    def generate_agent_response(self, chat_history: List[Dict[str, Any]], current_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Takes the user's chat history, injects the system prompt and current context,
        and returns a structured response from the Gemini model.
        """
        if not self.is_configured:
            return {
                "text": "⚠️ **Configuration Error:** The Gemini API key is not set on the server. Please add `GEMINI_API_KEY` to your `.env` file and restart the backend.",
                "action": None
            }

        # System Instructions to define the Agent's persona and constraints
        system_instruction = """
        You are the 'IndAI Security Assistant', a helpful, expert AI embedded inside the IndAI code scanning platform.
        Your goal is to help users understand security vulnerabilities, guide them through the platform, and provide OWASP best practices.

        You MUST respond with a JSON object. Do NOT wrap it in markdown code blocks (like ```json), just output raw JSON.
        The JSON must have this exact structure:
        {
            "text": "Your markdown-formatted response to the user. Use emojis, bullet points, and bold text to make it readable.",
            "action": {
                "type": "navigate",
                "payload": "/scan" | "/dashboard" | "/",
                "label": "Button text (optional)"
            }
        }
        Note: The 'action' field is optional. If you don't need to navigate the user or trigger an action, set "action" to null.
        If the user asks to scan code, suggest they navigate to the scan page using action payload "/scan" and label "Go to Scan Page".
        If they ask about their recent scans, use action payload "/dashboard".
        Keep your responses concise, friendly, and highly educational regarding application security.
        """

        try:
            # Build the conversation history for Gemini
            # google.genai expects Content objects with role 'user' or 'model'
            contents = []
            
            # We inject the system prompt as the first message if needed, or use config.
            # Using config.system_instruction is the cleaner way in the new SDK
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                response_mime_type="application/json",
            )

            for msg in chat_history:
                role = "user" if msg.get("role") == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg.get("text", ""))]
                    )
                )

            # Add context to the latest user message
            if current_context and contents and contents[-1].role == "user":
                context_str = f"\n[System Context: The user is currently on the '{current_context.get('page', 'unknown')}' page.]"
                # Update the last part's text
                last_text = contents[-1].parts[0].text
                contents[-1].parts[0] = types.Part.from_text(text=last_text + context_str)

            # Generate response
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )
            
            response_text = response.text.strip()

            # Parse the JSON response
            try:
                parsed_response = json.loads(response_text)
                return {
                    "text": parsed_response.get("text", "I'm sorry, I couldn't generate a proper response."),
                    "action": parsed_response.get("action", None)
                }
            except json.JSONDecodeError:
                logger.error(f"Failed to parse LLM JSON response: {response_text}")
                return {
                    "text": response_text,  # Fallback to raw text if parsing fails
                    "action": None
                }

        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return {
                "text": "⚠️ The AI assistant is temporarily unavailable. Please try again later.",
                "action": None
            }

# Singleton instance
llm_service = LLMService()
