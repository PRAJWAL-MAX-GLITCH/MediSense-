import os
import sys
import logging
import json
import re
from html import unescape
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langdetect import detect
from deep_translator import GoogleTranslator
from tavily import TavilyClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from ai.symptom_extractor import extract_symptoms
from ai.decision_engine import get_risk, is_emergency

env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

tavily_api_key = os.environ.get("TAVILY_API_KEY", "")
print("[DEBUG] API KEY:", tavily_api_key[:10] + "..." if tavily_api_key else "NOT FOUND ❌")
tavily_client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None
#  LANGUAGE DETECTION & TRANSLATION
def detect_language(text):
    try:
        text_lower = text.lower()
        if any(word in text_lower.split() for word in ["mala", "aahe", "aala", "tula", "kase", "kasa", "ahes", "majha", "majhi", "tap", "dukh", "dard", "khali", "hot"]):
            return "mr"
        if any(word in text_lower.split() for word in ["hai", "kya", "mera", "mujhe", "hota", "raha", "bukhar", "dard", "mujko"]):
            return "hi"
        lang = detect(text)
        if lang in ['so', 'sw', 'id', 'tl', 'hr', 'sq', 'cy', 'et', 'nl', 'af', 'tr']:
            return "mr"
        return lang
    except:
        return "en"

def translate_to_english(text):
    try:
        return GoogleTranslator(source='auto', target='en').translate(text)
    except:
        return text

def translate_to_user_language(text, lang):
    try:
        return GoogleTranslator(source='en', target=lang).translate(text)
    except:
        return text

def _translate_response_json(payload, lang):
    if lang == "en":
        return payload
    try:
        data = json.loads(payload) if isinstance(payload, str) else payload

        def _walk(value, parent_key=None):
            if isinstance(value, str):
                if parent_key in {"answer", "condition", "advice"}:
                    return translate_to_user_language(value, lang)
                return value
            if isinstance(value, list):
                if parent_key == "questions":
                    return [translate_to_user_language(item, lang) if isinstance(item, str) else _walk(item) for item in value]
                return [_walk(item, parent_key=parent_key) for item in value]
            if isinstance(value, dict):
                return {key: _walk(val, parent_key=key) for key, val in value.items()}
            return value

        return json.dumps(_walk(data))
    except Exception:
        return payload

# ─────────────────────────────────────────────
#  QUERY CLASSIFICATION  (symptoms-first)
# ─────────────────────────────────────────────

def classify_query(query):
    q = query.lower()
    lang = detect_language(query)

    health_keywords = [
        "fever", "pain", "cough", "cold", "headache",
        "diabetes", "bp", "vomiting", "dizziness"
    ]

    language_health_keywords = {
        "hi": ["bukhar", "dard", "khansi", "ulti", "chakkar", "sardi", "kamzori", "pet dard"],
        "mr": ["tap", "dukhat", "khokla", "olti", "chakkar", "sardi", "kamjori", "potdukh"],
    }

    # Keyword match
    for word in health_keywords:
        if word in q:
            return "health"

    for word in language_health_keywords.get(lang, []):
        if word in q:
            return "health"

    return "general"

# ─────────────────────────────────────────────
#  WEB SEARCH
# ─────────────────────────────────────────────

def search_web(query):
    print("[DEBUG] 🌐 WEB SEARCH CALLED")
    print("[DEBUG] QUERY:", query)
    if not tavily_client:
        logging.warning("Tavily API key not found. Web search skipped.")
        print("[DEBUG] ❌ Tavily client is None — API key missing or invalid.")
        return ""
    try:
        logging.info(f"Searching web for: {query}")
        result = tavily_client.search(query, search_depth="basic", max_results=3)
        print("[DEBUG] RAW WEB RESULT:", result)
        context_parts = []
        for res in result.get('results', []):
            context_parts.append(f"[Source: {res['url']}] {res['content']}")
        final_context = "\n\n".join(context_parts)
        print("[DEBUG] FINAL CONTEXT:", final_context[:500])
        return final_context
    except Exception as e:
        logging.error(f"Tavily search failed: {e}")
        print("[DEBUG] ❌ Tavily search EXCEPTION:", e)
        return ""

# ─────────────────────────────────────────────
#  PROMPT TEMPLATES
# ─────────────────────────────────────────────

HEALTH_SYSTEM_RULES = """You are a clinical medical assistant.

STRICT RULES:
- Infer a possible illness/condition from the symptoms. Do NOT just repeat the symptoms.
- Do NOT prescribe medicines or dosages.
- Keep language simple. Always recommend consulting a doctor.
- You MUST respond in JSON format ONLY. No markdown, no extra text.

Respond with EXACTLY this JSON structure:
{
  "condition": "<inferred possible illness, not just symptom names>",
  "advice": "<general guidance and when to see a doctor>"
}"""

HEALTH_USER_TEMPLATE = """CLINICAL CONTEXT:
{context}

USER SYMPTOMS: {symptoms}
USER QUERY: {query}

Output the JSON object only."""

GENERAL_SYSTEM_RULES = """You are a helpful universal AI assistant.

STRICT RULES:
- Provide a clear, accurate, concise answer.
- If context is provided, use it. Otherwise use your knowledge.
- You MUST respond in JSON format ONLY. No markdown.

Respond with EXACTLY this JSON structure:
{
  "type": "general",
  "answer": "<your response>"
}"""

GENERAL_USER_TEMPLATE = """CONTEXT:
{context}

USER QUERY: {query}

Output the JSON object only."""

FOLLOWUP_SYSTEM = """You are a medical AI assistant. Generate exactly 2 relevant follow-up questions to understand the user's symptoms better. Do NOT diagnose. Output MUST be valid JSON only:
{
  "questions": ["...", "..."]
}"""

def format_chat_prompt(system, user_content, tokenizer=None):
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content}
    ]
    if tokenizer:
        try:
            return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        except Exception as e:
            logging.warning(f"Tokenizer template failed: {e}. Using fallback.")
    prompt = ""
    for msg in messages:
        prompt += f"<|im_start|>{msg['role']}\n{msg['content']}<|im_end|>\n"
    prompt += "<|im_start|>assistant\n"
    return prompt

def _clean_llm_output(text):
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

# ─────────────────────────────────────────────
#  LLM LOADER
# ─────────────────────────────────────────────

def _get_llm():
    hf_token = os.environ.get("HUGGINGFACEHUB_API_TOKEN") or os.environ.get("HF_TOKEN")
    if hf_token:
        try:
            from langchain_huggingface import HuggingFaceEndpoint
            logging.info("Using Hugging Face Serverless API.")
            llm = HuggingFaceEndpoint(
                repo_id="Qwen/Qwen2.5-7B-Instruct",
                task="text-generation",
                max_new_tokens=256,
                temperature=0.1,
                huggingfacehub_api_token=hf_token
            )
            return llm, None
        except Exception as e:
            logging.warning(f"HuggingFaceEndpoint failed: {e}")

    try:
        from langchain_huggingface import HuggingFacePipeline
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
        import torch
        logging.info("Loading local Qwen2.5-0.5B-Instruct model...")
        model_id = "Qwen/Qwen2.5-0.5B-Instruct"
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        device = 0 if torch.cuda.is_available() else -1
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )
        pipe = pipeline(
            "text-generation", model=model, tokenizer=tokenizer,
            max_new_tokens=256, temperature=0.1, device=device, return_full_text=False
        )
        return HuggingFacePipeline(pipeline=pipe), tokenizer
    except Exception as e:
        logging.error(f"Local model load failed: {e}")

    return None, None

# ─────────────────────────────────────────────
#  VECTOR STORE
# ─────────────────────────────────────────────

def load_vector_store():
    vector_store_dir = os.path.join(backend_dir, 'data', 'vector_store')
    if not os.path.exists(vector_store_dir):
        logging.error("Vector store not found. Run create_index.py first.")
        return None
    logging.info("Loading FAISS vector store...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return FAISS.load_local(vector_store_dir, embeddings, allow_dangerous_deserialization=True)

def retrieve_context(vector_store, query, k=3):
    results = vector_store.similarity_search(query, k=k)
    if not results:
        return ""
    parts = []
    for doc in results:
        source = os.path.basename(doc.metadata.get('source', 'unknown'))
        parts.append(f"[Source: {source}] {doc.page_content.replace(chr(10), ' ').strip()}")
    logging.info(f"Retrieved {len(results)} FAISS chunks.")
    return "\n\n".join(parts)

# ─────────────────────────────────────────────
#  FOLLOW-UP QUESTION GENERATOR
# ─────────────────────────────────────────────

def generate_followup_questions(symptoms):
    try:
        llm, tokenizer = _get_llm()
        if llm:
            user_msg = f"User symptoms: {', '.join(symptoms) if symptoms else 'not specified'}"
            prompt = format_chat_prompt(FOLLOWUP_SYSTEM, user_msg, tokenizer)
            response = llm.invoke(prompt)
            text = response.content if hasattr(response, 'content') else response.strip()
            parsed = json.loads(_clean_llm_output(text))
            questions = parsed.get("questions", [])
            flat = [q["question"] if isinstance(q, dict) else q for q in questions]
            if flat:
                return flat[:2]
    except Exception as e:
        logging.warning(f"Dynamic follow-up failed: {e}. Using static fallback.")

    # Static fallback
    if not symptoms:
        return [
            "Could you describe your symptoms in more detail?",
            "For example, are you experiencing fever, pain, cough, or something else?"
        ]
    primary = symptoms[0].lower()
    if "fever" in primary:
        return ["Do you also have a cough or body pain?", "How long have you had the fever?"]
    if "headache" in primary:
        return ["Are you experiencing nausea or sensitivity to light?", "How long have you had this headache?"]
    if "cough" in primary:
        return ["Is it a dry cough or are you coughing up mucus?", "Do you also have a fever or sore throat?"]
    if "chest pain" in primary:
        return ["Does the pain radiate to your arm or jaw?", "Are you also short of breath or sweating?"]
    return [
        f"How long have you been experiencing {primary}?",
        "Are you experiencing any other symptoms like fever or fatigue?"
    ]

# ─────────────────────────────────────────────
#  HEALTH PIPELINE — LLM for condition + advice only
# ─────────────────────────────────────────────

def generate_health_response(context, query, symptoms, risk, emergency):
    llm, tokenizer = _get_llm()
    if llm:
        user_content = HEALTH_USER_TEMPLATE.format(
            context=context,
            symptoms=", ".join(symptoms),
            query=query
        )
        prompt = format_chat_prompt(HEALTH_SYSTEM_RULES, user_content, tokenizer)
        try:
            response = llm.invoke(prompt)
            text = response.content if hasattr(response, 'content') else response.strip()
            llm_json = json.loads(_clean_llm_output(text))
            condition = llm_json.get("condition", "Unable to determine condition.")
            advice = llm_json.get("advice", "Please consult a healthcare professional.")
        except Exception as e:
            logging.warning(f"Health LLM failed: {e}. Using fallback.")
            condition, advice = _health_fallback_text(context)
    else:
        logging.warning("No LLM available. Using template fallback.")
        condition, advice = _health_fallback_text(context)

    # FORCE: risk and emergency always from decision engine
    return json.dumps({
        "type": "analysis",
        "symptoms": symptoms,
        "risk": risk,
        "condition": condition,
        "advice": advice,
        "emergency": emergency
    })

def _health_fallback_text(context):
    if context:
        return (
            "Based on your symptoms, relevant clinical records were found.",
            "This is general health information only. Please consult a qualified doctor."
        )
    return (
        "Unable to determine a specific condition.",
        "Please consult a healthcare professional for proper evaluation."
    )

# ─────────────────────────────────────────────
#  GENERAL PIPELINE
# ─────────────────────────────────────────────

def generate_general_response(context, query):
    llm, tokenizer = _get_llm()
    if llm:
        user_content = GENERAL_USER_TEMPLATE.format(context=context, query=query)
        prompt = format_chat_prompt(GENERAL_SYSTEM_RULES, user_content, tokenizer)
        print("[DEBUG] LLM INPUT PROMPT:", prompt[:500])
        try:
            response = llm.invoke(prompt)
            print("[DEBUG] LLM OUTPUT:", response)
            response_text = response.content if hasattr(response, 'content') else response.strip()
            
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"): cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"): cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"): cleaned_text = cleaned_text[:-3]
            
            llm_json = json.loads(cleaned_text.strip())
            return json.dumps({
                "type": "general",
                "answer": llm_json.get("answer", "No valid answer generated.")
            })
        except Exception as e:
            logging.warning(f"General LLM failed: {e}")
            print("[DEBUG] ❌ General LLM EXCEPTION:", e)
            return json.dumps({"type": "general", "answer": "I'm sorry, I encountered an error while processing your request."})
    else:
        print("[DEBUG] ❌ LLM is None — falling back to raw context.")
        return json.dumps({"type": "general", "answer": "LLM is unavailable. Based on search: " + context[:200] + "..."})

# ─────────────────────────────────────────────
#  MAIN ENTRY POINT
# ─────────────────────────────────────────────

def get_response(query: str) -> str:
    try:
        print("[DEBUG] ═══════════════════════════════════")
        print("[DEBUG] USER QUERY:", query)
        normalized_query = query.lower().strip()
        if normalized_query in ["hi", "hello", "hey"]:
            return json.dumps({
                "type": "general",
                "answer": "Hello! 👋 How can I help you today?"
            })

        # Step 0: Detect language, but classify using the original query
        lang = detect_language(query)
        logging.info(f"[LANG] Detected: {lang}")
        
        # Step 1: Translate only after routing decision when needed
        query_en = translate_to_english(query) if lang != "en" else query
        query_type = classify_query(query_en)
        
        logging.info(f"[QUERY] Original: {query}")
        logging.info(f"[PIPELINE] Initial classification: {query_type}")
        print("[DEBUG] QUERY TYPE:", query_type)

        # Step 2: Extract symptoms only inside the health pipeline
        symptoms = []
        if query_type == "health":
            symptoms = extract_symptoms(query_en)
        print("[DEBUG] DETECTED SYMPTOMS:", symptoms)
        logging.info(f"[SYMPTOMS] Extracted: {symptoms}")
        print(f"[DEBUG] query={query_en}")
        print(f"[DEBUG] symptoms={symptoms}")
        print(f"[DEBUG] query_type={query_type}")
        logging.info(f"[PIPELINE] Using: {query_type}")

        # ── GENERAL PIPELINE ──────────────────────────────
        if query_type == "general":
            general_query = query_en
            web_context = search_web(general_query)
            response_json = generate_general_response(web_context, general_query)
            response_json = _translate_response_json(response_json, lang)
            return response_json

        # ── HEALTH PIPELINE ───────────────────────────────
        # Step 4: Follow-up gatekeeper — only for health queries with fewer than 2 symptoms
        if query_type == "health" and len(symptoms) < 2:
            logging.info(f"[FOLLOW-UP] Only {len(symptoms)} symptom(s) — triggering follow-up questions")
            questions = generate_followup_questions(symptoms)
            response_json = json.dumps({"type": "question", "questions": questions})
            response_json = _translate_response_json(response_json, lang)
            return response_json

        # Step 5: Risk + emergency — ALWAYS from decision engine, never LLM
        risk = get_risk(symptoms)
        emergency = is_emergency(risk)
        logging.info(f"[DECISION ENGINE] Risk: {risk} | Emergency: {emergency}")

        # Step 6: FAISS retrieval
        vector_store = load_vector_store()
        context = retrieve_context(vector_store, query_en) if vector_store else ""
        logging.info("[PIPELINE] Source: FAISS")

        # Step 7: LLM for condition + advice only
        response_json = generate_health_response(context, query_en, symptoms, risk, emergency)

        response_json = _translate_response_json(response_json, lang)
        return response_json

    except Exception as e:
        logging.error(f"get_response error: {e}")
        return json.dumps({
            "type": "analysis",
            "symptoms": [],
            "risk": "LOW",
            "condition": f"An error occurred: {str(e)}",
            "advice": "Please consult a medical professional.",
            "emergency": False
        })
