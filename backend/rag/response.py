"""
MediSense AI - Universal Multilingual Medical Assistant
========================================================

A robust, production-ready response generation system that handles:
- Multilingual input (Hindi, Marathi, English, etc.)
- Intelligent query classification (health vs general)
- Web search for general queries (Perplexity style)
- Medical analysis with RAG for health queries (Doctor AI style)
- Structured JSON responses for frontend integration
- Voice-ready plain text output

ARCHITECTURE:
1. Language Detection
2. Query Classification (DO NOT translate before classification)
3. Route-based Processing:
   - Greetings → simple response
   - General → Web Search + LLM
   - Health → Symptom Extraction → Doctor-like Follow-ups → Medical Analysis
4. Multilingual Response Translation
"""

import os
import sys
import logging
import json

from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langdetect import detect
from deep_translator import GoogleTranslator
# from tavily import TavilyClient  # Removed web search integration

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Setup paths
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from ai.symptom_extractor import extract_symptoms
from ai.decision_engine import get_risk, is_emergency

# Load environment variables
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

# Initialize Tavily API for web search
# Tavily client initialization removed – web search not used in pure medical assistant
# tavily_api_key = os.environ.get("TAVILY_API_KEY", "")
# tavily_client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None
# if tavily_api_key:
#     logger.info(f"✓ Tavily API configured (Key: {tavily_api_key[:10]}...)")
# else:
#     logger.warning("⚠ Tavily API key not found - web search will be unavailable")
# ─── Language code to Google Translator target mapping ──────────────────────
# langdetect codes that need remapping to Google Translate codes
_LANG_REMAP = {
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    "jw":    "jv",    # Javanese
    "iw":    "he",    # Hebrew (old ISO)
}

# Languages where langdetect is unreliable for short medical text.
# For these we keep our manual overrides; everything else goes to langdetect.
_DEVANAGARI_RANGE = (0x0900, 0x097F)
_ARABIC_RANGE     = (0x0600, 0x06FF)


def detect_language(text: str) -> str:
    """
    Detect the language of the user's message.

    Strategy
    --------
    1.  Script-level Unicode checks (fast, reliable for non-Latin scripts).
        • Devanagari  → distinguish Hindi vs Marathi by keyword.
        • Arabic      → 'ar'
    2.  For Latin-script text, use langdetect (supports 55+ languages).
        • Guard against mis-detection of short English medical text
          by checking a small English stopword set first.
    3.  Fallback to 'en' if everything fails.
    """
    import re

    text_s  = text.strip()
    text_lo = text_s.lower()

    # ── 1a. Devanagari (Hindi / Marathi) ─────────────────────────────────────
    if re.search(r'[\u0900-\u097f]', text_s):
        marathi_markers = {
            "आहे", "मला", "खोकला", "त्रास", "झाला", "ताप", "दुखणे",
            "डोके", "पोट", "सर्दी", "कसा", "कशी", "कसे", "आहात",
            "तुझे", "माझे", "आम्ही", "पाहिजे",
        }
        words = set(re.findall(r'\w+', text_lo))
        return "mr" if any(w in marathi_markers for w in words) else "hi"

    # ── 1b. Arabic script ─────────────────────────────────────────────────────
    if re.search(r'[\u0600-\u06ff]', text_s):
        return "ar"

    # ── 1c. Other non-Latin scripts (Cyrillic, CJK, Tamil, Telugu…) ───────────
    non_latin_scripts = [
        (r'[\u0400-\u04ff]', 'ru'),   # Cyrillic  → Russian default
        (r'[\u4e00-\u9fff]', 'zh-CN'),# CJK
        (r'[\u3040-\u30ff]', 'ja'),   # Japanese (Hiragana/Katakana)
        (r'[\uac00-\ud7af]', 'ko'),   # Korean (Hangul)
        (r'[\u0b80-\u0bff]', 'ta'),   # Tamil
        (r'[\u0c00-\u0c7f]', 'te'),   # Telugu
        (r'[\u0980-\u09ff]', 'bn'),   # Bengali
        (r'[\u0a00-\u0a7f]', 'pa'),   # Punjabi / Gurmukhi
        (r'[\u0900-\u097f]', 'hi'),   # Devanagari fallback (already handled above)
    ]
    for pattern, lang_code in non_latin_scripts:
        if re.search(pattern, text_s):
            return lang_code

    # ── 2. Latin script – check English stopwords first ───────────────────────
    words = set(text_lo.split())
    english_stopwords = {
        "i", "have", "and", "cough", "fever", "pain", "headache", "cold",
        "the", "my", "is", "in", "it", "you", "that", "was", "for", "on",
        "are", "with", "as", "at", "dizziness", "sore", "throat",
        "fatigue", "diarrhea", "chest", "body", "ache", "sick", "hurt",
        "nausea", "vomit", "rash", "swelling", "breath", "doctor",
    }
    # Transliterated Marathi / Hindi overrides (Latin)
    marathi_trans = {
        "mala", "aahe", "aala", "tula", "kase", "kasa", "ahes",
        "majha", "majhi", "khali", "amhi", "ghya", "takla", "khokla",
        "dokedukhi", "potdukhi", "tras",
    }
    hindi_trans = {
        "hai", "kya", "mera", "mujhe", "hota", "raha", "bukhar",
        "mujko", "mere", "hun", "aapke", "khansi", "petdard",
    }

    en_hits = sum(1 for w in words if w in english_stopwords)
    mr_hits = sum(1 for w in words if w in marathi_trans)
    hi_hits = sum(1 for w in words if w in hindi_trans)

    if en_hits > 0 and mr_hits == 0 and hi_hits == 0:
        return "en"
    if mr_hits > hi_hits and mr_hits > 0:
        return "mr"
    if hi_hits > 0:
        return "hi"

    # ── 3. Full langdetect fallback ───────────────────────────────────────────
    try:
        code = detect(text_s)
        return _LANG_REMAP.get(code, code)   # remap if needed, else return as-is
    except Exception as e:
        logger.warning(f"langdetect failed: {e}. Defaulting to 'en'.")
        return "en"


def translate_to_english(text: str) -> str:
    """Translate any language → English for internal processing."""
    try:
        return GoogleTranslator(source="auto", target="en").translate(text) or text
    except Exception as e:
        logger.warning(f"Translation to English failed: {e}. Using original.")
        return text


def translate_to_user_language(text: str, target_lang: str) -> str:
    """Translate English response back to user's detected language."""
    if target_lang == "en" or not text:
        return text
    try:
        return GoogleTranslator(source="en", target=target_lang).translate(text) or text
    except Exception as e:
        logger.warning(f"Translation to '{target_lang}' failed: {e}. Using English.")
        return text


def translate_response_json(payload: str, language: str) -> str:
    """
    Walk the JSON response and translate every user-visible text field
    into the user's language.  JSON structural keys are never translated.
    """
    if language == "en":
        return payload

    TRANSLATABLE = {
        "answer", "condition", "advice", "possible_conditions",
        "risk_explanation", "recommendations", "emergency_indicators",
        "additional_notes", "message", "questions", "symptoms",
    }

    try:
        data = json.loads(payload) if isinstance(payload, str) else payload

        def _translate(value, key=None):
            if isinstance(value, str):
                return translate_to_user_language(value, language) if key in TRANSLATABLE else value
            if isinstance(value, list):
                if key in TRANSLATABLE:
                    return [
                        translate_to_user_language(item, language)
                        if isinstance(item, str) else _translate(item, key)
                        for item in value
                    ]
                return [_translate(item, key) for item in value]
            if isinstance(value, dict):
                return {k: _translate(v, k) for k, v in value.items()}
            return value

        return json.dumps(_translate(data), ensure_ascii=False)
    except Exception as e:
        logger.warning(f"JSON translation failed: {e}. Returning original.")
        return payload

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 2: QUERY CLASSIFICATION
# ═══════════════════════════════════════════════════════════════════════════

def classify_query(query: str) -> str:
    """
    Classify user query as 'health' or 'general'.
    
    IMPORTANT: Classification happens AFTER translation to English,
    but uses English keywords only (not language-specific keywords).
    
    Rules:
    - Health: Contains medical/health keywords (symptoms, diseases, medical intent)
    - General: Everything else (greetings, factual questions, general knowledge)
    """
    q = query.lower().strip()
    
    # Health keywords - comprehensive medical terminology
    health_keywords = {
        # Symptoms
        "fever", "pain", "cough", "cold", "headache", "sore throat",
        "vomiting", "dizziness", "diarrhea", "nausea", "fatigue",
        "weakness", "rash", "itching", "swelling", "swollen",
        "shortness of breath", "breathing issue", "chest pain",
        "back pain", "stomach pain", "abdominal pain", "muscle pain",
        "body ache", "migraine", "fainting", "confusion", "bleeding",
        
        # Diseases/Conditions
        "diabetes", "hypertension", "bp", "blood pressure", "infection",
        "flu", "covid", "pneumonia", "asthma", "cancer", "heart disease",
        "stroke", "arthritis", "thyroid", "allergy", "allergic",
        
        # Medical Intent
        "symptom", "sick", "disease", "illness", "disorder", "syndrome",
        "treatment", "medicine", "drug", "prescription", "doctor",
        "hospital", "clinic", "patient", "health", "medical", "health",
        "ache", "hurts", "hurt", "diagnose", "diagnosis", "remedy",
        "cure", "wound", "injury", "bleed", "bleeding", "infected",
    }
    
    # Check if any health keyword is in the query
    words = set(q.split())
    for keyword in health_keywords:
        if keyword in q or any(keyword in word for word in words):
            logger.info(f"[CLASSIFICATION] Detected health keyword: '{keyword}'")
            return "health"
    
    logger.info("[CLASSIFICATION] No health keywords detected → GENERAL")
    return "general"


def is_greeting(query: str) -> bool:
    """Check if query is a simple greeting (English, Hindi, and Marathi)."""
    greeting_queries = {
        # English
        "hi", "hello", "hey", "greetings", "good morning",
        "good afternoon", "good evening", "good night", "howdy",
        # Hindi (Devanagari)
        "नमस्ते", "नमस्कार", "हेलो", "हाय",
        # Marathi (Devanagari)
        "नमस्कार", "नमस्ते",
        # Transliterated
        "namaste", "namaskar", "salam", "salaam"
    }
    normalized = query.lower().strip()
    return normalized in greeting_queries

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 3: WEB SEARCH (FOR GENERAL QUERIES)
# ═══════════════════════════════════════════════════════════════════════════

def search_web(query: str) -> str:
    """Web search is disabled in the pure medical assistant mode. Returns empty context."""
    return ""


# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 4: LLM INITIALIZATION & CACHING
# ═══════════════════════════════════════════════════════════════════════════

_cached_llm = None
_cached_tokenizer = None
_cached_vector_store = None

def get_llm_and_tokenizer():
    """
    Load LLM (Qwen 2.5) from either:
    1. Hugging Face Serverless API (if token provided)
    2. Local Transformers Pipeline (fallback)
    
    Uses module-level global cache variables to ensure the model and tokenizer
    are only loaded once, preventing high response latency on subsequent requests.
    
    Returns: (llm, tokenizer) or (None, None) if load fails
    """
    global _cached_llm, _cached_tokenizer
    if _cached_llm is not None:
        return _cached_llm, _cached_tokenizer
        
    hf_token = os.environ.get("HUGGINGFACEHUB_API_TOKEN") or os.environ.get("HF_TOKEN")
    
    # Try Hugging Face Serverless API first
    if hf_token:
        try:
            from langchain_huggingface import HuggingFaceEndpoint
            logger.info("[LLM] Using Hugging Face Serverless API (Qwen2.5-7B)")
            _cached_llm = HuggingFaceEndpoint(
                repo_id="Qwen/Qwen2.5-7B-Instruct",
                task="text-generation",
                max_new_tokens=256,
                temperature=0.1,
                huggingfacehub_api_token=hf_token
            )
            _cached_tokenizer = None
            return _cached_llm, _cached_tokenizer
        except Exception as e:
            logger.warning(f"[LLM] Hugging Face API failed: {e}")
    
    # Fallback: Load local model
    try:
        from langchain_huggingface import HuggingFacePipeline
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
        import torch
        
        logger.info("[LLM] Loading local Qwen2.5-0.5B model...")
        model_id = "Qwen/Qwen2.5-0.5B-Instruct"
        
        _cached_tokenizer = AutoTokenizer.from_pretrained(model_id)
        device = 0 if torch.cuda.is_available() else -1
        
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )
        
        pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=_cached_tokenizer,
            max_new_tokens=256,
            temperature=0.1,
            device=device,
            return_full_text=False
        )
        
        logger.info("[LLM] Local model loaded successfully")
        _cached_llm = HuggingFacePipeline(pipeline=pipe)
        return _cached_llm, _cached_tokenizer
    except Exception as e:
        logger.error(f"[LLM] Local model load failed: {e}")
    
    logger.error("[LLM] No LLM available - falling back to rule-based responses")
    return None, None

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 5: VECTOR STORE (FAISS) & RETRIEVAL
# ═══════════════════════════════════════════════════════════════════════════

def load_vector_store():
    """Load FAISS vector store for medical document retrieval. Caches database in memory."""
    global _cached_vector_store
    if _cached_vector_store is not None:
        return _cached_vector_store
        
    vector_store_dir = os.path.join(backend_dir, 'data', 'vector_store')
    
    if not os.path.exists(vector_store_dir):
        logger.warning(f"[FAISS] Vector store not found at {vector_store_dir}")
        return None
    
    try:
        logger.info(f"[FAISS] Loading vector store from {vector_store_dir}")
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        _cached_vector_store = FAISS.load_local(
            vector_store_dir,
            embeddings,
            allow_dangerous_deserialization=True
        )
        logger.info("[FAISS] Vector store loaded successfully")
        return _cached_vector_store
    except Exception as e:
        logger.error(f"[FAISS] Load failed: {e}")
        return None


def retrieve_medical_context(vector_store, query: str, k: int = 3) -> str:
    """
    Retrieve relevant medical documents from FAISS vector store.
    
    Args:
        vector_store: FAISS vector store
        query: Medical query
        k: Number of top results to retrieve
    
    Returns: Formatted context string with sources
    """
    if not vector_store:
        return ""
    
    try:
        logger.info(f"[FAISS] Retrieving {k} documents for: {query[:50]}...")
        results = vector_store.similarity_search(query, k=k)
        
        if not results:
            logger.warning("[FAISS] No relevant documents found")
            return ""
        
        context_parts = []
        for i, doc in enumerate(results, 1):
            source = os.path.basename(doc.metadata.get('source', 'unknown'))
            content = doc.page_content.replace('\n', ' ').strip()
            
            # Limit content length
            if len(content) > 500:
                content = content[:500] + "..."
            
            context_parts.append(f"[Med-Source {i}: {source}]\n{content}")
        
        context = "\n\n".join(context_parts)
        logger.info(f"[FAISS] Retrieved {len(results)} documents ({len(context)} chars)")
        return context
    except Exception as e:
        logger.error(f"[FAISS] Retrieval failed: {e}")
        return ""

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 6: PROMPT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

GENERAL_SYSTEM_PROMPT = """You are a helpful, accurate AI assistant.

RULES:
- Answer the user's question clearly and accurately
- Keep response short (2-4 sentences max)
- Use simple, accessible language
- Do NOT repeat instructions or ask clarifying questions
- Do NOT output meta phrases like "Here's the answer:" or "Based on the context:"
- If context is provided, use it; otherwise use your knowledge
- Do NOT copy raw context - synthesize your answer

IMPORTANT: Respond ONLY with valid JSON, nothing else.
Do NOT include markdown, code blocks, or extra text."""

GENERAL_USER_PROMPT = """Question: {query}

Context: {context}

Respond ONLY with this JSON structure (no other text):
{{"type": "general", "answer": "<your answer here>"}}"""
HEALTH_SYSTEM_PROMPT = """You are an expert clinical medical assistant providing professional health guidance and SaaS-grade diagnostic assessments.

STRICT RULES:
- Analyze the reported symptoms and suggest 1-3 possible medically relevant conditions based on the provided context.
- Never use symptoms as conditions. For example, do not output "Fever" or "Cough" as a condition; instead suggest "Viral Infection", "Upper Respiratory Infection", etc.
- Provide a detailed clinical risk assessment explanation (minimum 2-4 complete sentences) explaining why this risk level is assigned.
- Provide a minimum of 4 clear, actionable clinical recommendations/lifestyle advice items.
- List specific emergency indicators detailing when the patient should seek immediate emergency care.
- Include additional educational notes addressing symptom overlap, limitations of AI, and the necessity of professional medical consultation.
- Do NOT prescribe specific medications, dosages, or write prescriptions.
- Keep the language clinical, professional, and accessible.
- Respond ONLY with a valid JSON object matching the exact schema. Do not include markdown code block formatting (like ```json) in your raw output, and do not append conversational text before or after the JSON."""

HEALTH_USER_PROMPT = """Medical Context from Database: {context}

Patient Reported Symptoms: {symptoms}
Patient Original Query: {query}

Provide clinical guidance in this JSON format ONLY:
{{
  "possible_conditions": ["Condition A", "Condition B", "Condition C"],
  "risk_explanation": "Detailed explanation of risk based on the reported symptoms (at least 2-4 sentences).",
  "recommendations": [
    "First specific recommendation",
    "Second specific recommendation",
    "Third specific recommendation",
    "Fourth specific recommendation"
  ],
  "emergency_indicators": [
    "First emergency indicator",
    "Second emergency indicator"
  ],
  "additional_notes": "Disclaimer and educational context about symptom overlap, limitations of AI, and seeking professional diagnosis."
}}"""


FOLLOWUP_SYSTEM_PROMPT = """You are a medical AI assistant helping doctors understand symptoms better.

Generate EXACTLY 2 relevant follow-up questions to better understand the patient's condition.
Questions should be:
- Simple and clear
- Focused on the symptoms mentioned
- Helpful for diagnosis

Respond ONLY with valid JSON (no other text):
{{"questions": ["question1", "question2"]}}"""

FOLLOWUP_USER_PROMPT = """Patient symptoms: {symptoms}

Generate 2 follow-up questions to understand their condition better."""


def format_prompt_with_chat_template(system_prompt: str, user_prompt: str, tokenizer=None) -> str:
    """
    Format system + user prompts using chat template (if tokenizer available).
    
    Fallback: Use <|im_start|> format for models that don't have tokenizer.
    """
    if tokenizer and hasattr(tokenizer, 'apply_chat_template'):
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            return tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
        except Exception as e:
            logger.debug(f"Tokenizer template failed: {e}")
    
    # Fallback format
    prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
    prompt += f"<|im_start|>user\n{user_prompt}<|im_end|>\n"
    prompt += "<|im_start|>assistant\n"
    return prompt


def clean_llm_output(text: str) -> str:
    """Remove markdown code blocks and extra whitespace from LLM output."""
    text = text.strip()
    
    # Remove markdown code blocks
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    
    return text.strip()

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 7: RESPONSE GENERATORS
# ═══════════════════════════════════════════════════════════════════════════

def generate_greeting_response() -> str:
    """Return a friendly greeting response."""
    return json.dumps({
        "type": "general",
        "answer": "Hello! I'm MediSense AI, your multilingual medical assistant. How can I help you today? You can ask me about health concerns or general questions."
    })


def generate_followup_questions(symptoms: List[str], chat_history: List[dict] = None, llm=None, tokenizer=None) -> List[str]:
    """
    Generate follow-up questions to gather more symptom information.
    Uses LLM if available, falls back to rule-based responses.
    """
    if llm:
        try:
            symptoms_text = ", ".join(symptoms) if symptoms else "not specified"
            user_prompt = FOLLOWUP_USER_PROMPT.format(symptoms=symptoms_text)
            prompt = format_prompt_with_chat_template(
                FOLLOWUP_SYSTEM_PROMPT,
                user_prompt,
                tokenizer
            )
            
            response = llm.invoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            cleaned = clean_llm_output(response_text)
            parsed = json.loads(cleaned)
            
            questions = parsed.get("questions", [])
            if isinstance(questions, list) and len(questions) >= 2:
                return questions[:2]
        except Exception as e:
            logger.warning(f"[FOLLOWUP] LLM generation failed: {e}")
    
    # Rule-based fallback
    logger.info("[FOLLOWUP] Using rule-based fallback questions")
    
    if not symptoms:
        return [
            "Could you describe your main symptoms in more detail?",
            "When did these symptoms start?"
        ]
    
    primary = symptoms[0].lower()
    
    # Symptom-specific follow-ups
    if "fever" in primary:
        return [
            "How high is your temperature? Do you have a thermometer?",
            "Do you also have a cough, body pain, or sore throat?"
        ]
    if "cough" in primary:
        return [
            "Is it a dry cough or are you coughing up mucus?",
            "Do you have a fever, sore throat, or shortness of breath?"
        ]
    if "headache" in primary:
        return [
            "Is it a constant pain or comes and goes?",
            "Do you have nausea, sensitivity to light, or fever?"
        ]
    if "chest pain" in primary:
        return [
            "Does the pain radiate to your arm, shoulder, or jaw?",
            "Are you experiencing shortness of breath or difficulty breathing?"
        ]
    if "stomach pain" in primary or "abdominal pain" in primary:
        return [
            "Is the pain sharp, dull, or cramping?",
            "Do you have vomiting, diarrhea, or constipation?"
        ]
    
    # Generic fallback
    return [
        f"How long have you been experiencing {primary}?",
        "Are you experiencing any other symptoms like fever, fatigue, or body aches?"
    ]


def generate_general_response(web_context: str, query: str, language: str = "en", llm=None, tokenizer=None) -> str:
    """
    Generate response for general (non-medical) queries.
    
    Process:
    1. Call LLM with web context + query
    2. Parse JSON response
    3. Return structured response
    4. Translate if needed
    """
    print(f"[GENERAL_RESPONSE] Generating for: {query[:50]}...")
    
    if llm:
        try:
            user_prompt = GENERAL_USER_PROMPT.format(
                query=query,
                context=web_context if web_context else "No web context available"
            )
            prompt = format_prompt_with_chat_template(
                GENERAL_SYSTEM_PROMPT,
                user_prompt,
                tokenizer
            )
            
            print(f"[GENERAL_RESPONSE] Calling LLM...")
            response = llm.invoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            print(f"[GENERAL_RESPONSE] Raw output: {response_text[:100]}...")
            
            cleaned = clean_llm_output(response_text)
            parsed = json.loads(cleaned)
            
            answer = parsed.get("answer", "I couldn't generate a complete answer.")
            
            result = json.dumps({
                "type": "general",
                "answer": answer
            }, ensure_ascii=False)
            
            print(f"[GENERAL_RESPONSE] ✓ Generated")
            return translate_response_json(result, language)
        except json.JSONDecodeError as e:
            logger.error(f"[GENERAL_RESPONSE] JSON parse failed: {e}")
            print(f"[GENERAL_RESPONSE] JSON error: {e}")
        except Exception as e:
            logger.error(f"[GENERAL_RESPONSE] LLM failed: {e}")
            print(f"[GENERAL_RESPONSE] Error: {e}")
    
    # Fallback: use web context directly
    logger.warning("[GENERAL_RESPONSE] Using fallback response")
    if web_context:
        answer = f"Based on search results: {web_context[:150]}..."
    else:
        answer = "I couldn't find information about this topic. Could you provide more details?"
    
    result = json.dumps({
        "type": "general",
        "answer": answer
    }, ensure_ascii=False)
    
    return translate_response_json(result, language)

def generate_health_analysis(
    faiss_context: str,
    query: str,
    symptoms: List[str],
    risk_level: str,
    is_emergency_case: bool,
    language: str = "en",
    llm=None,
    tokenizer=None
) -> str:
    """
    Generate medical analysis response using LLM + FAISS context.
    
    Returns: JSON with structured medical report.
    """
    print(f"[HEALTH_ANALYSIS] Analyzing {len(symptoms)} symptoms...")
    
    report = {
        "symptoms": symptoms,
        "possible_conditions": ["Unable to determine condition"],
        "risk_level": risk_level,
        "risk_explanation": "Please consult a healthcare professional for proper evaluation.",
        "recommendations": ["Consult a doctor"],
        "emergency_indicators": ["Seek emergency care if symptoms severely worsen"],
        "additional_notes": "This is an AI-generated analysis, not a medical diagnosis.",
        "emergency": is_emergency_case
    }
    
    if llm:
        try:
            user_prompt = HEALTH_USER_PROMPT.format(
                context=faiss_context if faiss_context else "General medical knowledge",
                symptoms=", ".join(symptoms),
                query=query
            )
            prompt = format_prompt_with_chat_template(
                HEALTH_SYSTEM_PROMPT,
                user_prompt,
                tokenizer
            )
            
            print(f"[HEALTH_ANALYSIS] Calling LLM...")
            response = llm.invoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            print(f"[HEALTH_ANALYSIS] Raw output: {response_text[:100]}...")
            
            cleaned = clean_llm_output(response_text)
            parsed = json.loads(cleaned)
            
            # Extract possible conditions
            conds = parsed.get("possible_conditions", [])
            if isinstance(conds, list) and len(conds) > 0:
                report["possible_conditions"] = conds
            elif isinstance(conds, str) and conds.strip():
                report["possible_conditions"] = [conds.strip()]
                
            # Extract risk explanation
            explain = parsed.get("risk_explanation", "")
            if isinstance(explain, str) and explain.strip():
                report["risk_explanation"] = explain.strip()
                
            # Extract recommendations
            recs = parsed.get("recommendations", [])
            if isinstance(recs, list) and len(recs) > 0:
                report["recommendations"] = recs
            elif isinstance(recs, str) and recs.strip():
                report["recommendations"] = [recs.strip()]
                
            # Extract emergency indicators
            emerg = parsed.get("emergency_indicators", [])
            if isinstance(emerg, list) and len(emerg) > 0:
                report["emergency_indicators"] = emerg
            elif isinstance(emerg, str) and emerg.strip():
                report["emergency_indicators"] = [emerg.strip()]
                
            # Extract additional notes
            notes = parsed.get("additional_notes", "")
            if isinstance(notes, str) and notes.strip():
                report["additional_notes"] = notes.strip()
                
            print(f"[HEALTH_ANALYSIS] ✓ Generated")
        except json.JSONDecodeError as e:
            logger.error(f"[HEALTH_ANALYSIS] JSON parse failed: {e}")
            print(f"[HEALTH_ANALYSIS] JSON error: {e}")
        except Exception as e:
            logger.error(f"[HEALTH_ANALYSIS] LLM failed: {e}")
            print(f"[HEALTH_ANALYSIS] Error: {e}")
    else:
        logger.warning("[HEALTH_ANALYSIS] No LLM available - using fallback")
        
    # --- VALIDATION LAYER (Phase 3) ---
    # Ensure no fields are empty and everything aligns with production expectations.
    if not report.get("symptoms") or not isinstance(report["symptoms"], list) or len(report["symptoms"]) == 0:
        report["symptoms"] = symptoms if symptoms else ["General physical discomfort"]
        
    if not report.get("possible_conditions") or not isinstance(report["possible_conditions"], list) or len(report["possible_conditions"]) == 0 or report["possible_conditions"] == ["Unable to determine condition"]:
        report["possible_conditions"] = ["Undetermined general health concern"]
        
    if not report.get("risk_level"):
        report["risk_level"] = risk_level if risk_level else "LOW"
        
    if not report.get("recommendations") or not isinstance(report["recommendations"], list) or len(report["recommendations"]) == 0 or report["recommendations"] == ["Consult a doctor"]:
        report["recommendations"] = [
            "Rest and monitor your physical symptoms carefully.",
            "Stay well hydrated by drinking clear fluids.",
            "Avoid strenuous physical activities or unnecessary stress.",
            "Consult a certified healthcare professional if symptoms persist or worsen."
        ]
        
    if not report.get("risk_explanation") or report["risk_explanation"] == "Please consult a healthcare professional for proper evaluation.":
        report["risk_explanation"] = f"Based on the reported symptoms, the overall diagnostic risk level is evaluated as {report['risk_level']}. Please consult a medical professional for a proper clinical evaluation."
        
    if not report.get("emergency_indicators") or not isinstance(report["emergency_indicators"], list) or len(report["emergency_indicators"]) == 0 or report["emergency_indicators"] == ["Seek emergency care if symptoms severely worsen"]:
        report["emergency_indicators"] = [
            "Difficulty breathing, severe shortness of breath, or wheezing",
            "Persistent pain, pressure, or tightness in the chest",
            "New confusion, extreme dizziness, or inability to wake up",
            "Pale, gray, or blue skin, lips, or nail beds indicating lack of oxygen"
        ]
        
    if not report.get("additional_notes") or report["additional_notes"] == "This is an AI-generated analysis, not a medical diagnosis.":
        report["additional_notes"] = "This report is generated by an artificial intelligence assistant for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Multiple health conditions can present with overlapping symptoms."
        
    report["type"] = "analysis"
    
    result = json.dumps(report, ensure_ascii=False)
    return translate_response_json(result, language)
# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 8: MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def get_response(query: str, vector_store=None, llm=None, tokenizer=None, chat_history: List[dict] = None) -> str:
    """
    Main entry point: Process user query and return structured JSON response.
    
    FLOW:
    1. Detect language
    2. Check for greeting
    3. Classify query type (health vs general)
    4. Route to appropriate pipeline
    5. Translate response back to user's language
    
    Returns: JSON string with response data
    """
    print("\n" + "="*80)
    print(f"[MAIN] Processing query: {query[:100]}")
    print("="*80)
    
    try:
        # Step 0: Language Detection
        user_language = detect_language(query)
        logger.info(f"[LANG] Detected: {user_language}")
        print(f"[MAIN] Language: {user_language}")
        
        # Step 1: Check for greeting (detect language first, then check)
        if is_greeting(query):
            logger.info("[MAIN] Greeting detected")
            print("[MAIN] -> Type: GREETING")
            # Build greeting in English then translate to user's language
            greeting_msg = "Hello! I'm MediSense AI, your multilingual medical assistant. How can I help you today? Please describe your health concerns or symptoms."
            greeting_response = json.dumps({
                "type": "general",
                "answer": greeting_msg
            }, ensure_ascii=False)
            return translate_response_json(greeting_response, user_language)
        
        # Step 2: Translate to English for processing
        query_en = translate_to_english(query) if user_language != "en" else query
        logger.info(f"[LANG] Translated query: {query_en}")
        print(f"[MAIN] -> Translated: {query_en[:60]}...")
        
        # Step 3: Classify query (using English version)
        query_type = classify_query(query_en)
        logger.info(f"[TYPE] Classification: {query_type}")
        print(f"[MAIN] -> Type: {query_type.upper()}")
        
        # ═══════════════════════════════════════════════════════════════════
        #  GENERAL PIPELINE
        # ═══════════════════════════════════════════════════════════════════
        if query_type == "general":
            logger.info("[MAIN] Non-health query received - returning info response")
            # Use type 'general' so frontend can render the answer bubble
            info_response = json.dumps({
                "type": "general",
                "answer": "I am MediSense AI, a dedicated healthcare assistant. I can help you with health concerns, symptoms, and medical guidance. Please describe your symptoms or ask a health-related question."
            }, ensure_ascii=False)
            return translate_response_json(info_response, user_language)
        
        # ═══════════════════════════════════════════════════════════════════
        #  HEALTH PIPELINE (Doctor AI Style)
        # ═══════════════════════════════════════════════════════════════════
        if query_type == "health":
            print(f"[MAIN] ↳ HEALTH PIPELINE")
            
            # Step 1: Extract symptoms
            symptoms = extract_symptoms(query_en)
            logger.info(f"[SYMPTOMS] Extracted: {symptoms}")
            print(f"[MAIN]   └─ Symptoms: {symptoms}")
            
            # Step 2: Follow-up gatekeeper (Phase 3: Doctor Behavior)
            # Count user messages in history. If less than 2, and low symptoms, ask follow-ups.
            user_msg_count = 0
            if chat_history:
                user_msg_count = sum(1 for m in chat_history if m.get("role") == "user")
            
            if user_msg_count < 2 and len(symptoms) < 3:
                logger.info(f"[HEALTH] Insufficient context (messages: {user_msg_count}, symptoms: {len(symptoms)}) - asking follow-ups")
                print(f"[MAIN]   └─ Insufficient context → Requesting follow-ups")
                
                followup_questions = generate_followup_questions(symptoms, chat_history, llm, tokenizer)
                response = json.dumps({
                    "type": "question",
                    "questions": followup_questions
                }, ensure_ascii=False)
                
                return translate_response_json(response, user_language)
            
            # Step 3: Calculate risk assessment
            risk_level = get_risk(symptoms)
            is_emergency_case = is_emergency(risk_level)
            logger.info(f"[RISK] Level: {risk_level} | Emergency: {is_emergency_case}")
            print(f"[MAIN]   └─ Risk: {risk_level} | Emergency: {is_emergency_case}")
            
            # Step 4: Retrieve medical context from FAISS (Phase 9: k=3 retrieval)
            faiss_context = retrieve_medical_context(vector_store, query_en, k=3) if vector_store else ""
            logger.info(f"[FAISS] Context length: {len(faiss_context)} chars")
            
            # Step 5: Generate medical analysis
            response = generate_health_analysis(
                faiss_context,
                query_en,
                symptoms,
                risk_level,
                is_emergency_case,
                user_language,
                llm,
                tokenizer
            )
            
            print(f"[MAIN] ✓ Medical analysis ready")
            return response
        
        # Fallback (shouldn't reach here)
        logger.error("[MAIN] Unknown query type")
        return json.dumps({
            "type": "error",
            "message": "Unable to process query"
        })
    
    except Exception as e:
        logger.error(f"[MAIN] Unexpected error: {e}", exc_info=True)
        print(f"[MAIN] ✗ ERROR: {e}")
        
        return json.dumps({
            "type": "error",
            "message": f"An error occurred: {str(e)}. Please try again."
        })


# ═══════════════════════════════════════════════════════════════════════════
#  DEBUG & TESTING
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    """Test the response system with various queries."""
    
    test_queries = [
        "hello",
        "Who is Elon Musk?",
        "I have fever",
        "I have high fever and cough",
        "मला ताप आहे",  # Marathi: "I have fever"
        "मला ताप आणि खोकला आहे",  # Marathi: "I have fever and cough"
        "मुझे बुखार है",  # Hindi: "I have fever"
        "मुझे बुखार और खांसी है",  # Hindi: "I have fever and cough"
    ]
    
    for query in test_queries:
        print(f"\n{'='*80}")
        print(f"Query: {query}")
        print(f"{'='*80}")
        
        response = get_response(query)
        print(f"\nResponse:\n{response}")
        
        # Parse and pretty-print JSON
        try:
            data = json.loads(response)
            print(f"\nParsed:\n{json.dumps(data, indent=2, ensure_ascii=False)}")
        except:
            pass
