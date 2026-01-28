"""OpenAI service for NongPlaToo travel assistant (GPT-only)."""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional
import logging

from openai import OpenAI

from .configs import PromptRepo
from .constants import (
    DEFAULT_OPENAI_MODEL,
    DEFAULT_TEMPERATURE,
    DEFAULT_MAX_TOKENS,
    DEFAULT_TOP_P,
    DEFAULT_PRESENCE_PENALTY,
    DEFAULT_FREQUENCY_PENALTY,
    DEFAULT_REQUEST_TIMEOUT,
    THAI_CHAR_MIN_CODE,
    THAI_CHAR_MAX_CODE,
)
from .text_utils import detect_language

PROMPT_REPO = PromptRepo()
logger = logging.getLogger(__name__)


class GPTService:
    """Generate travel guidance using OpenAI and optional local datasets."""

    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model_config = PROMPT_REPO.get_model_params()
        chat_params = self.model_config.get("chat", {})
        greeting_params = self.model_config.get("greeting", {})
        self.model_name = os.getenv("OPENAI_MODEL") or self.model_config.get(
            "default_model", DEFAULT_OPENAI_MODEL
        )
        system_data = PROMPT_REPO.get_prompt("chatbot/system", default={})
        self.system_prompts = system_data.get("default", {})
        self.character_profile = PROMPT_REPO.get_character_profile()
        self.answer_prompts = PROMPT_REPO.get_prompt("chatbot/answer", default={})
        self.search_prompts = PROMPT_REPO.get_prompt("chatbot/search", default={})
        self.preferences = PROMPT_REPO.get_preferences()
        self.temperature = chat_params.get("temperature", DEFAULT_TEMPERATURE)
        self.max_completion_tokens = chat_params.get("max_completion_tokens", DEFAULT_MAX_TOKENS)
        self.top_p = chat_params.get("top_p", DEFAULT_TOP_P)
        self.presence_penalty = chat_params.get("presence_penalty", DEFAULT_PRESENCE_PENALTY)
        self.frequency_penalty = chat_params.get("frequency_penalty", DEFAULT_FREQUENCY_PENALTY)
        self.greeting_temperature = greeting_params.get("temperature", DEFAULT_TEMPERATURE)
        self.greeting_max_tokens = greeting_params.get("max_completion_tokens", 150)
        self.greeting_top_p = greeting_params.get("top_p", DEFAULT_TOP_P)
        self.request_timeout = chat_params.get("timeout_seconds", DEFAULT_REQUEST_TIMEOUT)
        self.greeting_timeout = greeting_params.get("timeout_seconds", self.request_timeout)

        if not self.api_key:
            print("[WARN] OPENAI_API_KEY not found")
            self.client: Optional[OpenAI] = None
            return

        try:
            # Increase max_retries to handle transient errors better
            self.client = OpenAI(api_key=self.api_key, max_retries=2, timeout=self.request_timeout)
            print(f"[OK] OpenAI client init (model: {self.model_name}, timeout: {self.request_timeout}s)")
        except Exception as exc:
            print(f"[ERROR] OpenAI client init failed: {exc}")
            self.client = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_response_stream(
        self,
        user_query: str,
        context_data: List[Dict[str, Any]],
        *,
        data_type: str = "attractions",
        intent: Optional[str] = None,
        intent_type: Optional[str] = None,
        data_status: Optional[Dict[str, Any]] = None,
        system_override: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ):
        """Generate streaming response from OpenAI for gradual text output."""
        language = self._detect_language(user_query)

        if not self.client:
            yield {"error": "OpenAI client not initialized"}
            return

        try:
            data_context = self._format_context_data(context_data, data_type, intent_type)
            status_note = self._build_context_status_note(data_status, bool(context_data))
            preference_note = self._build_preference_note()
            search_instruction = self._build_search_instruction(language)
            guardrail_note = self._context_guardrail(language, len(context_data))

            user_parts = [f"User Query: {user_query}"]
            if intent:
                user_parts.append(f"Detected Intent: {intent}")
            if intent_type:
                user_parts.append(f"Intent Type: {intent_type} ({'specific place query' if intent_type == 'specific' else 'general recommendations'})")
            if status_note:
                user_parts.append(status_note)
            if preference_note:
                user_parts.append(preference_note)
            if search_instruction:
                user_parts.append(search_instruction)
            if guardrail_note:
                user_parts.append(guardrail_note)
            user_parts.append(data_context)
            user_message = "\\n\\n".join(part for part in user_parts if part)
            if len(user_message) > 8000:
                user_message = user_message[:8000]

            # Build messages array with conversation history
            messages = [{"role": "system", "content": system_override or self._system_prompt(language)}]
            
            # Add conversation history if provided (last 5 exchanges to stay within token limits)
            if conversation_history:
                messages.extend(conversation_history[-10:])
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Create streaming chat completion with extended timeout
            logger.info(f"[GPT] Starting streaming request with timeout={self.request_timeout}s, history_messages={len(messages)-2}")
            stream_response = self.client.chat.completions.create(  # type: ignore[call-overload]
                model=self.model_name,
                messages=messages,  # type: ignore[arg-type]
                temperature=self.temperature,
                top_p=self.top_p,
                max_tokens=self.max_completion_tokens,
                timeout=self.request_timeout,
                stream=True,  # Enable streaming
            )

            # Yield chunks as they arrive
            chunk_count = 0
            for chunk in stream_response:
                if chunk.choices and chunk.choices[0].delta.content:
                    chunk_count += 1
                    yield {
                        "chunk": chunk.choices[0].delta.content,
                        "language": language,
                        "source": self.model_name
                    }
            
            logger.info(f"[GPT] Streaming completed successfully ({chunk_count} chunks)")

            # Send final metadata
            yield {
                "done": True,
                "structured_data": context_data,
                "language": language,
                "source": self.model_name,
                "intent": intent,
                "intent_type": intent_type
            }

        except TimeoutError as exc:
            logger.error(f"Streaming timeout after {self.request_timeout}s: {exc}")
            yield {
                "error": f"Request timeout after {self.request_timeout} seconds. Please try again.",
                "timeout": True
            }
        except Exception as exc:
            logger.error(f"Streaming generation failed: {exc}", exc_info=True)
            yield {"error": str(exc)}

    def generate_response(
        self,
        user_query: str,
        context_data: List[Dict[str, Any]],
        *,
        data_type: str = "attractions",
        intent: Optional[str] = None,
        intent_type: Optional[str] = None,
        data_status: Optional[Dict[str, Any]] = None,
        system_override: Optional[str] = None,
        stream: bool = False,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Call OpenAI to produce a travel response given optional structured context."""
        language = self._detect_language(user_query)

        if not self.client:
            return self._build_fallback_payload(language, user_query, context_data, "no_openai_client")

        try:
            data_context = self._format_context_data(context_data, data_type, intent_type)
            status_note = self._build_context_status_note(data_status, bool(context_data))
            preference_note = self._build_preference_note()
            search_instruction = self._build_search_instruction(language)
            guardrail_note = self._context_guardrail(language, len(context_data))

            user_parts = [f"User Query: {user_query}"]
            if intent:
                user_parts.append(f"Detected Intent: {intent}")
            if status_note:
                user_parts.append(status_note)
            if preference_note:
                user_parts.append(preference_note)
            if search_instruction:
                user_parts.append(search_instruction)
            if guardrail_note:
                user_parts.append(guardrail_note)
            user_parts.append(data_context)
            user_message = "\n\n".join(part for part in user_parts if part)
            if len(user_message) > 8000:
                user_message = user_message[:8000]

            # Build messages array with conversation history
            messages = [{"role": "system", "content": system_override or self._system_prompt(language)}]
            
            # Add conversation history if provided (last 5 exchanges)
            if conversation_history:
                messages.extend(conversation_history[-10:])
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            response = self._create_chat_completion(
                model=self.model_name,
                messages=messages,
                temperature=self.temperature,
                top_p=self.top_p,
                max_completion_tokens=self.max_completion_tokens,  # จะถูกแปลงเป็น max_tokens ใน helper
                timeout=self.request_timeout,
            )

            ai_response = self._safe_extract_content(response) or self._create_fallback_response(language, user_query)

            return {
                "response": ai_response,
                "data": context_data,
                "language": language,
                "source": self.model_name,
                "model": self.model_name,
                "tokens_used": getattr(response.usage, "total_tokens", None) if hasattr(response, "usage") else None,
            }
        except Exception as exc:
            print(f"[ERROR] GPT generation failed: {exc}")
            payload = self._build_fallback_payload(language, user_query, context_data, "fallback_error")
            payload["error"] = str(exc)
            return payload

    def generate_greeting(self, language: str = "th") -> str:
        if not self.client:
            if language == "th":
                return "สวัสดีค่ะ! น้องปลาทูพร้อมช่วยวางแผนการเที่ยวสมุทรสงครามให้คุณค่ะ"
            return "Hello! I'm NongPlaToo, ready to help you plan your Samut Songkhram trip!"

        try:
            response = self._create_chat_completion(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": self._system_prompt(language)},
                    {
                        "role": "user",
                        "content": PROMPT_REPO.get_prompt(
                            "chatbot/answer/greeting_prompt",
                            default="Provide a short greeting suitable for a Samut Songkhram travel assistant.",
                        ),
                    },
                ],
                temperature=self.greeting_temperature,
                top_p=self.greeting_top_p,
                max_completion_tokens=self.greeting_max_tokens,
                timeout=self.greeting_timeout,
            )
            return self._safe_extract_content(response)
        except Exception as exc:
            print(f"[ERROR] Greeting generation failed: {exc}")
            if language == "th":
                return "สวัสดีค่ะ! น้องปลาทูพร้อมช่วยวางแผนการเที่ยวสมุทรสงครามให้คุณค่ะ"
            return "Hello! I'm NongPlaToo, ready to help you plan your Samut Songkhram trip!"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_chat_completion(self, **kwargs: Any):
        """Safe wrapper around client.chat.completions.create for openai>=1.x."""

        if not self.client:
            raise RuntimeError("OpenAI client not initialized")

        # --- Normalize parameters for new OpenAI client ---
        # 1) max_completion_tokens -> max_tokens
        if "max_completion_tokens" in kwargs:
            kwargs["max_tokens"] = kwargs.pop("max_completion_tokens")

        # 2) Remove parameters that may not be supported for gpt-4o
        kwargs.pop("presence_penalty", None)
        kwargs.pop("frequency_penalty", None)
        # --------------------------------------------------

        # Ensure calls do not hang indefinitely
        kwargs.setdefault("timeout", 60)
        logger.debug(f"[GPT] chat.completions.create payload keys={list(kwargs.keys())}")

        # ถ้ามี error ให้โยนออกไปเลย แล้วไปจับในชั้นบน (generate_response / greeting)
        return self.client.chat.completions.create(**kwargs)

    @staticmethod
    def _detect_language(text: str) -> str:
        """Detect if text is primarily Thai or English."""
        return detect_language(text)

    def _format_context_data(
        self,
        context_data: List[Dict[str, Any]],
        data_type: str,
        intent_type: Optional[str] = None,
    ) -> str:
        if not context_data:
            return f"No verified {data_type} data available."

        is_specific = intent_type == "specific"
        max_items = 3 if is_specific else 6

        context_parts = [f"=== VERIFIED DATA ({data_type.upper()}) ===\n"]
        for idx, item in enumerate(context_data[:max_items], 1):
            name = item.get("place_name") or item.get("name") or "Unknown"
            context_parts.append(f"\n[Place {idx}]")
            context_parts.append(f"Name: {name}")

            location = item.get("location", {}) or {}
            district = location.get("district")
            province = location.get("province")
            if district and province:
                context_parts.append(f"Location: {district}, {province}")
            elif province:
                context_parts.append(f"Location: {province}")

            place_info = item.get("place_information", {}) or {}
            detail = place_info.get("detail")
            entry_description = item.get("description")

            if is_specific:
                if detail:
                    context_parts.append(f"Description: {detail}")
                if entry_description and entry_description != detail:
                    context_parts.append(f"Summary: {entry_description}")

                opening_hours = place_info.get("opening_hours")
                if opening_hours:
                    context_parts.append(f"Opening Hours: {opening_hours}")

                contact = place_info.get("contact", {}) or {}
                phones = contact.get("phones") or []
                if phones:
                    context_parts.append(f"Contact: {', '.join(phones)}")
                socials = contact.get("socials")
                if socials:
                    if isinstance(socials, list):
                        context_parts.append(f"Social: {', '.join(socials[:3])}")
                    else:
                        context_parts.append(f"Social: {socials}")

                category = item.get("category") or place_info.get("category_description")
                if category:
                    context_parts.append(f"Category: {category}")

                best_time = item.get("best_time") or place_info.get("best_time")
                if best_time:
                    context_parts.append(f"Best Time: {best_time}")

                price = item.get("price_range") or place_info.get("price") or place_info.get("ticket_price")
                if price:
                    context_parts.append(f"Cost: {price}")

                tips = item.get("tips") or place_info.get("tips")
                if tips:
                    if isinstance(tips, list):
                        context_parts.append(f"Tips: {'; '.join(str(tip) for tip in tips[:3])}")
                    else:
                        context_parts.append(f"Tips: {tips}")

                highlights = item.get("highlights") or place_info.get("highlights")
                if highlights:
                    if isinstance(highlights, list):
                        context_parts.append(f"Highlights: {'; '.join(str(h) for h in highlights[:3])}")
                    else:
                        context_parts.append(f"Highlights: {highlights}")

                activities = item.get("activities") or place_info.get("activities")
                if activities:
                    if isinstance(activities, list):
                        context_parts.append(f"Activities: {'; '.join(str(a) for a in activities[:3])}")
                    else:
                        context_parts.append(f"Activities: {activities}")

                lat = location.get("latitude")
                lon = location.get("longitude")
                if lat and lon:
                    context_parts.append(f"Coordinates: {lat}, {lon}")
            else:
                summary = detail or entry_description
                if summary:
                    context_parts.append(f"Summary: {summary}")

        context_parts.append("\n=== END DATA ===")
        return "\n".join(context_parts)

    @staticmethod
    def _safe_extract_content(response: Any) -> str:
        try:
            return (response.choices[0].message.content or "").strip()
        except Exception:
            return ""

    def _build_context_status_note(self, status: Optional[Dict[str, Any]], has_data: bool) -> str:
        if not status:
            return ""
        context_prompts = self.search_prompts.get("context", {})
        success = status.get("success", True)
        message = status.get("message") or status.get("error")

        if success and not has_data:
            return context_prompts.get(
                "no_data",
                "There is no verified local dataset available for this query. Respond with general knowledge.",
            )

        if success:
            return ""

        reason = message or "an unknown issue"
        template = context_prompts.get(
            "error",
            "Local travel data is unavailable due to {reason}. Provide a helpful response using general knowledge and mention the limitation.",
        )
        return template.format(reason=reason)

    def _build_preference_note(self) -> str:
        prefs = self.preferences or {}
        components = []
        if tone := prefs.get("tone"):
            components.append(f"Respond with tone: {tone}")
        if style := prefs.get("response_style"):
            components.append(f"Style: {style}")
        if format_hint := prefs.get("format"):
            components.append(f"Format focus: {format_hint}")
        if cta := prefs.get("call_to_action"):
            components.append(cta)
        return " | ".join(components)

    def _build_search_instruction(self, language: str) -> str:
        if language == "th":
            return (
                "ให้ผสมผสานความรู้หรือการค้นหาของคุณกับข้อมูลยืนยันด้านล่างเกี่ยวกับการท่องเที่ยวสมุทรสงคราม "
                "โดยยึดข้อมูลจากไฟล์เป็นหลัก และหากมีข้อมูลทั่วไปเพิ่มเติมให้ระบุให้ชัดเจน\n"
                "เขียนคำตอบให้ยาวขึ้นและรายละเอียดมากขึ้น รวมถึงข้อมูลเกี่ยวกับวิธีการเดินทาง เวลาเปิด ค่าเข้า ตัวอย่าง และคำแนะนำปฏิบัติที่เป็นประโยชน์"
            )
        return (
            "Combine any reliable knowledge you have with the verified Samut Songkhram dataset below, "
            "favoring the dataset when conflicts arise and labelling additional insights as general knowledge. "
            "Write detailed and comprehensive responses including transportation, hours, fees, examples, and practical tips."
        )

    def _context_guardrail(self, language: str, context_count: int) -> str:
        if context_count > 0:
            if language == "th":
                return (
                    f"คุณมีข้อมูลยืนยันแล้ว {context_count} รายการจากฐานข้อมูลสมุทรสงคราม "
                    "ให้อ้างอิงข้อมูลเหล่านี้เป็นหลัก จัดระเบียบคำแนะนำให้เกี่ยวข้องกับทุกจุด "
                    "ให้รายละเอียดเต็มเปี่ยมเกี่ยวกับสถานที่นั้นๆ วิธีเดินทาง เวลา ค่าใช้จ่าย และข้อมูลปฏิบัติสำคัญ "
                    "และหากต้องเพิ่มข้อมูลทั่วไปต้องระบุว่าเป็นข้อมูลเสริม"
                )
            return (
                f"You have {context_count} verified Samut Songkhram entries. "
                "Base recommendations on them, provide comprehensive details about each location including directions, hours, fees, and practical information, "
                "cover each entry clearly, and explicitly label any extra general-knowledge hints."
            )

        if language == "th":
            return (
                "ยังไม่มีข้อมูลยืนยันจากฐานข้อมูลให้ใช้อ้างอิง ให้แจ้งข้อจำกัดนี้กับผู้ใช้ "
                "พร้อมตอบด้วยความรู้ทั่วไปที่เชื่อถือได้เท่านั้น ให้รายละเอียดและครอบคลุม และเชิญชวนให้ผู้ใช้ระบุรายละเอียดเพิ่มเติม"
            )
        return (
            "No verified dataset is available for this turn. Make the limitation explicit, "
            "answer with trusted general knowledge only with comprehensive details, and invite the user to share more specifics."
        )

    def _build_fallback_payload(
        self,
        language: str,
        query: str,
        context_data: List[Dict[str, Any]],
        source: str,
    ) -> Dict[str, Any]:
        return {
            "response": self._create_fallback_response(language, query),
            "data": context_data,
            "language": language,
            "source": source,
            "model": None,
        }

    def _create_fallback_response(self, language: str, query: str) -> str:
        fallback_prompts = self.answer_prompts.get("fallback", {})
        if language == "th":
            template = fallback_prompts.get(
                "th",
                "ขออภัยค่ะ ขณะนี้ระบบ AI ไม่พร้อมให้บริการ\n\nกรุณาลองใหม่อีกครั้งในภายหลัง และนี่คือคำถามของคุณ: {query}",
            )
        else:
            template = fallback_prompts.get(
                "en",
                "Sorry, the AI system is currently unavailable.\n\nPlease try again later. Here is your question for reference: {query}",
            )
        return template.format(query=query)

    def extract_query_entities(self, query: str, dataset_summary: str) -> Dict[str, List[str]]:
        """Use GPT to extract keywords/places that should match local data."""
        if not self.client:
            return {"keywords": [], "places": []}

        character_hint = ""
        if self.character_profile:
            name = self.character_profile.get("name", "Nong Pla Too")
            description = " ".join(self.character_profile.get("characteristics", []))
            character_hint = f"You are {name}. {description}"

        prompt = (
            f"{character_hint}\n\n"
            "You are a travel data matcher for Samut Songkhram.\n"
            "Dataset entries:\n"
            f"{dataset_summary}\n\n"
            "Analyze the user's question and return JSON with two arrays:\n"
            "- keywords: important search words or synonyms\n"
            "- places: names from the dataset that likely match\n"
            "Respond with JSON only."
        )

        try:
            response = self._create_chat_completion(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "Extract concise travel keywords from the user query."},
                    {"role": "user", "content": f"{prompt}\n\nUser query:\n{query}"},
                ],
                temperature=0.0,
                max_completion_tokens=200,
                top_p=1.0,
                timeout=self.request_timeout,
            )
            content = self._safe_extract_content(response)
            if not content:
                return {"keywords": [], "places": []}
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(content[start:end])
                return {
                    "keywords": parsed.get("keywords", []),
                    "places": parsed.get("places", []),
                }
        except Exception as exc:
            print(f"[WARN] Keyword extraction failed: {exc}")
        return {"keywords": [], "places": []}

    def _system_prompt(self, language: str) -> str:
        if language == "th":
            return self.system_prompts.get("th", "")
        return self.system_prompts.get("en", self.system_prompts.get("th", ""))


def test_gpt_service() -> None:
    """Quick manual test."""
    service = GPTService()
    sample_data = [
        {
            "place_name": "Amphawa Floating Market",
            "place_information": {"detail": "Floating market open Friday-Sunday evenings."},
            "location": {"district": "Amphawa", "province": "Samut Songkhram"},
        }
    ]
    result = service.generate_response(
        user_query="แนะนำทริปไปอัมพวาหน่อย",
        context_data=sample_data,
        data_type="attractions",
        intent="attractions",
    )
    print(result["response"])


if __name__ == "__main__":
    test_gpt_service()
