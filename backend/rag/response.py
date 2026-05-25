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
import re
from html import unescape
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langdetect import detect
from deep_translator import GoogleTranslator
from tavily import TavilyClient

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
tavily_api_key = os.environ.get("TAVILY_API_KEY", "")
tavily_client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None

if tavily_api_key:
    logger.info(f"✓ Tavily API configured (Key: {tavily_api_key[:10]}...)")
else:
    logger.warning("⚠ Tavily API key not found - web search will be unavailable")
# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 1: LANGUAGE DETECTION & TRANSLATION
# ═══════════════════════════════════════════════════════════════════════════

def detect_language(text: str) -> str:
    """
    Detect language from user input.
    
    Priority:
    1. Check for specific language keywords first (Hindi, Marathi)
    2. Use langdetect as fallback
    3. Default to English
    
    Returns: language code (en, hi, mr, etc.)
    """
    try:
        text_lower = text.lower()
        words = set(text_lower.split())
        
        # Marathi detection keywords
        marathi_keywords = {
            "mala", "aahe", "aala", "tula", "kase", "kasa", "ahes",
            "majha", "majhi", "tap", "dukh", "dard", "khali", "hot",
            "amhi", "he", "te", "pan", "ghya", "takla"
        }
        
        # Hindi detection keywords
        hindi_keywords = {
            "hai", "kya", "mera", "mujhe", "hota", "raha", "bukhar",
            "dard", "mujko", "mere", "hun", "aapke", "cough", "jor"
        }
        
        if any(word in words for word in marathi_keywords):
            return "mr"
        if any(word in words for word in hindi_keywords):
            return "hi"
        
        # Fallback to langdetect
        detected_lang = detect(text)
        
        # Map unsupported languages to Marathi (reasonable default for Indian context)
        unsupported_languages = {
            'so', 'sw', 'id', 'tl', 'hr', 'sq', 'cy', 'et', 'nl', 'af', 'tr'
        }
        if detected_lang in unsupported_languages:
            return "mr"
        
        return detected_lang
    except Exception as e:
        logger.warning(f"Language detection failed: {e}. Defaulting to English.")
        return "en"


def translate_to_english(text: str) -> str:
    """Translate user input to English for processing."""
    try:
        return GoogleTranslator(source='auto', target='en').translate(text)
    except Exception as e:
        logger.warning(f"Translation to English failed: {e}. Using original text.")
        return text


def translate_to_user_language(text: str, target_lang: str) -> str:
    """Translate generated response back to user's language."""
    if target_lang == "en":
        return text
    try:
        return GoogleTranslator(source='en', target=target_lang).translate(text)
    except Exception as e:
        logger.warning(f"Translation to {target_lang} failed: {e}. Using English.")
        return text


def translate_response_json(payload: str, language: str) -> str:
    """
    Translate user-facing text in JSON response to original language.
    
    JSON keys (type, risk, etc.) are NEVER translated.
    Only user-facing content (answer, condition, advice, questions) is translated.
    """
    if language == "en":
        return payload
    
    try:
        data = json.loads(payload) if isinstance(payload, str) else payload
        
        def translate_value(value, key_name=None):
            if isinstance(value, str):
                # Translate user-facing content only
                if key_name in {"answer", "condition", "advice"}:
                    return translate_to_user_language(value, language)
                return value
            
            if isinstance(value, list):
                if key_name == "questions":
                    return [translate_to_user_language(item, language) if isinstance(item, str) else translate_value(item, key_name) for item in value]
                if key_name == "symptoms":
                    return [translate_to_user_language(item, language) if isinstance(item, str) else translate_value(item, key_name) for item in value]
                return [translate_value(item, key_name) for item in value]
            
            if isinstance(value, dict):
                return {k: translate_value(v, k) for k, v in value.items()}
            
            return value
        
        translated_data = translate_value(data)
        return json.dumps(translated_data, ensure_ascii=False)
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
    """Check if query is a simple greeting."""
    greeting_queries = {
        "hi", "hello", "hey", "greetings", "good morning",
        "good afternoon", "good evening", "good night", "howdy"
    }
    normalized = query.lower().strip()
    return normalized in greeting_queries

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 3: WEB SEARCH (FOR GENERAL QUERIES)
# ═══════════════════════════════════════════════════════════════════════════

def search_web(query: str) -> str:
    """
    Search web using Tavily API for general queries.
    
    Returns: Combined context from top 3 results (cleaned & deduplicated)
    """
    print(f"[WEB_SEARCH] Query: {query}")
    
    if not tavily_client:
        logger.warning("[WEB_SEARCH] Tavily client not initialized - web search unavailable")
        return ""
    
    try:
        logger.info(f"[WEB_SEARCH] Searching for: {query}")
        result = tavily_client.search(query, search_depth="basic", max_results=3)
        print(f"[WEB_SEARCH] Found {len(result.get('results', []))} results")
        
        context_parts = []
        seen_urls = set()
        
        for res in result.get('results', []):
            url = res.get('url', '')
            content = res.get('content', '')
            
            # Avoid duplicate sources
            if url in seen_urls or not content:
                continue
            
            seen_urls.add(url)
            
            # Clean HTML entities
            content = unescape(content)
            
            # Limit content length per source (avoid huge contexts)
            content = content[:500]
            
            context_parts.append(f"[Source: {url}]\n{content}")
        
        final_context = "\n\n".join(context_parts)
        logger.info(f"[WEB_SEARCH] Context length: {len(final_context)} chars")
        print(f"[WEB_SEARCH] Context prepared ({len(final_context)} chars)")
        
        return final_context
    except Exception as e:
        logger.error(f"[WEB_SEARCH] Exception: {e}")
        print(f"[WEB_SEARCH] ERROR: {e}")
        return ""

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 4: LLM INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════

def get_llm_and_tokenizer():
    """
    Load LLM (Qwen 2.5) from either:
    1. Hugging Face Serverless API (if token provided)
    2. Local Transformers Pipeline (fallback)
    
    Returns: (llm, tokenizer) or (None, None) if load fails
    """
    hf_token = os.environ.get("HUGGINGFACEHUB_API_TOKEN") or os.environ.get("HF_TOKEN")
    
    # Try Hugging Face Serverless API first
    if hf_token:
        try:
            from langchain_huggingface import HuggingFaceEndpoint
            logger.info("[LLM] Using Hugging Face Serverless API (Qwen2.5-7B)")
            llm = HuggingFaceEndpoint(
                repo_id="Qwen/Qwen2.5-7B-Instruct",
                task="text-generation",
                max_new_tokens=256,
                temperature=0.1,
                huggingfacehub_api_token=hf_token
            )
            return llm, None
        except Exception as e:
            logger.warning(f"[LLM] Hugging Face API failed: {e}")
    
    # Fallback: Load local model
    try:
        from langchain_huggingface import HuggingFacePipeline
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
        import torch
        
        logger.info("[LLM] Loading local Qwen2.5-0.5B model...")
        model_id = "Qwen/Qwen2.5-0.5B-Instruct"
        
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        device = 0 if torch.cuda.is_available() else -1
        
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )
        
        pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            max_new_tokens=256,
            temperature=0.1,
            device=device,
            return_full_text=False
        )
        
        logger.info("[LLM] Local model loaded successfully")
        return HuggingFacePipeline(pipeline=pipe), tokenizer
    except Exception as e:
        logger.error(f"[LLM] Local model load failed: {e}")
    
    logger.error("[LLM] No LLM available - falling back to rule-based responses")
    return None, None

# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 5: VECTOR STORE (FAISS) & RETRIEVAL
# ═══════════════════════════════════════════════════════════════════════════

def load_vector_store():
    """Load FAISS vector store for medical document retrieval."""
    vector_store_dir = os.path.join(backend_dir, 'data', 'vector_store')
    
    if not os.path.exists(vector_store_dir):
        logger.warning(f"[FAISS] Vector store not found at {vector_store_dir}")
        return None
    
    try:
        logger.info(f"[FAISS] Loading vector store from {vector_store_dir}")
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vector_store = FAISS.load_local(
            vector_store_dir,
            embeddings,
            allow_dangerous_deserialization=True
        )
        logger.info("[FAISS] Vector store loaded successfully")
        return vector_store
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

HEALTH_SYSTEM_PROMPT = """You are a clinical medical assistant providing health guidance.

STRICT RULES:
- Analyze symptoms and infer a possible condition (not just repeat symptoms)
- Provide general guidance and when to see a doctor
- Do NOT prescribe medicines, dosages, or specific treatments
- Keep language simple and accessible
- Always emphasize consulting a healthcare professional
- Respond ONLY with valid JSON, nothing else

IMPORTANT: Your response MUST be valid JSON only. No markdown, no extra text."""

HEALTH_USER_PROMPT = """Medical Context: {context}

Patient Symptoms: {symptoms}
Patient Query: {query}

Provide clinical guidance in this JSON format ONLY:
{{"condition": "<possible condition based on symptoms>", "advice": "<general guidance and when to see a doctor>"}}"""

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


def generate_followup_questions(symptoms: List[str]) -> List[str]:
    """
    Generate follow-up questions to gather more symptom information.
    
    Uses LLM if available, falls back to rule-based responses.
    """
    llm, tokenizer = get_llm_and_tokenizer()
    
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


def generate_general_response(web_context: str, query: str, language: str = "en") -> str:
    """
    Generate response for general (non-medical) queries.
    
    Process:
    1. Call LLM with web context + query
    2. Parse JSON response
    3. Return structured response
    4. Translate if needed
    """
    print(f"[GENERAL_RESPONSE] Generating for: {query[:50]}...")
    
    llm, tokenizer = get_llm_and_tokenizer()
    
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
    language: str = "en"
) -> str:
    """
    Generate medical analysis response using LLM + FAISS context.
    
    Returns: JSON with condition, advice, risk assessment, emergency flag
    """
    print(f"[HEALTH_ANALYSIS] Analyzing {len(symptoms)} symptoms...")
    
    llm, tokenizer = get_llm_and_tokenizer()
    
    condition = "Unable to determine condition"
    advice = "Please consult a healthcare professional for proper evaluation"
    
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
            
            condition = parsed.get("condition", condition)
            advice = parsed.get("advice", advice)
            
            print(f"[HEALTH_ANALYSIS] ✓ Generated")
        except json.JSONDecodeError as e:
            logger.error(f"[HEALTH_ANALYSIS] JSON parse failed: {e}")
            print(f"[HEALTH_ANALYSIS] JSON error: {e}")
        except Exception as e:
            logger.error(f"[HEALTH_ANALYSIS] LLM failed: {e}")
            print(f"[HEALTH_ANALYSIS] Error: {e}")
    else:
        logger.warning("[HEALTH_ANALYSIS] No LLM available - using fallback")
    
    result = json.dumps({
        "type": "analysis",
        "symptoms": symptoms,
        "risk": risk_level,
        "condition": condition,
        "advice": advice,
        "emergency": is_emergency_case
    }, ensure_ascii=False)
    
    return translate_response_json(result, language)



# ═══════════════════════════════════════════════════════════════════════════
#  SECTION 8: MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def get_response(query: str) -> str:
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
        
        # Step 1: Check for greeting (before translation)
        if is_greeting(query):
            logger.info("[MAIN] Greeting detected")
            print(f"[MAIN] → Type: GREETING")
            return generate_greeting_response()
        
        # Step 2: Translate to English for processing
        query_en = translate_to_english(query) if user_language != "en" else query
        logger.info(f"[LANG] Translated query: {query_en}")
        print(f"[MAIN] → Translated: {query_en[:60]}...")
        
        # Step 3: Classify query (using English version)
        query_type = classify_query(query_en)
        logger.info(f"[TYPE] Classification: {query_type}")
        print(f"[MAIN] → Type: {query_type.upper()}")
        
        # ═══════════════════════════════════════════════════════════════════
        #  GENERAL PIPELINE (Perplexity Style)
        # ═══════════════════════════════════════════════════════════════════
        if query_type == "general":
            print(f"[MAIN] ↳ GENERAL PIPELINE")
            
            # Web search
            web_context = search_web(query_en)
            
            # LLM response generation
            response = generate_general_response(web_context, query_en, user_language)
            
            print(f"[MAIN] ✓ Response ready")
            return response
        
        # ═══════════════════════════════════════════════════════════════════
        #  HEALTH PIPELINE (Doctor AI Style)
        # ═══════════════════════════════════════════════════════════════════
        if query_type == "health":
            print(f"[MAIN] ↳ HEALTH PIPELINE")
            
            # Step 1: Extract symptoms
            symptoms = extract_symptoms(query_en)
            logger.info(f"[SYMPTOMS] Extracted: {symptoms}")
            print(f"[MAIN]   └─ Symptoms: {symptoms}")
            
            # Step 2: Follow-up gatekeeper (ask for more info if <2 symptoms)
            if len(symptoms) < 2:
                logger.info(f"[HEALTH] Only {len(symptoms)} symptom(s) - asking follow-ups")
                print(f"[MAIN]   └─ Insufficient symptoms ({len(symptoms)}) → Requesting follow-ups")
                
                followup_questions = generate_followup_questions(symptoms)
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
            
            # Step 4: Retrieve medical context from FAISS
            vector_store = load_vector_store()
            faiss_context = retrieve_medical_context(vector_store, query_en) if vector_store else ""
            logger.info(f"[FAISS] Context length: {len(faiss_context)} chars")
            
            # Step 5: Generate medical analysis
            response = generate_health_analysis(
                faiss_context,
                query_en,
                symptoms,
                risk_level,
                is_emergency_case,
                user_language
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
