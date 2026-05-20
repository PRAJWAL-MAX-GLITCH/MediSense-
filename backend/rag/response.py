import os
import sys
import logging
import json
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Add backend directory to sys.path to resolve imports of local modules
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from ai.symptom_extractor import extract_symptoms
from ai.decision_engine import get_risk, is_emergency

# Load environment variables from .env file
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# ─────────────────────────────────────────────
#  CHAT PROMPT TEMPLATES & FORMATTER
# ─────────────────────────────────────────────

SYSTEM_RULES = """You are a helpful medical health assistant.

STRICT RULES:
- Do NOT give a final diagnosis, but DO infer a possible illness (e.g., 'viral infection' or 'flu' instead of just repeating 'fever and headache').
- Do NOT just repeat the user's symptoms in the condition field.
- Do NOT prescribe any medicines or dosages.
- Only give general health guidance based on the context provided.
- Keep language simple and easy to understand.
- Always recommend consulting a doctor for proper diagnosis.
- You MUST respond in JSON format ONLY. Do NOT include any introduction, explanations, or markdown syntax blocks.

Your response must be a single valid JSON object structured exactly as follows:
{
  "condition": "<infer possible illness based on symptoms, do NOT repeat the symptoms>",
  "explanation": "<brief explanation based on context>",
  "advice": "<general guidance and when to see a doctor>"
}"""

USER_TEMPLATE = """CONTEXT:
{context}

USER QUERY: {query}

Based on the context and the user query, output a JSON object matching the requested schema. DO NOT generate risk or emergency fields."""

def format_chat_prompt(system, user_content, tokenizer=None):
    """Formats system and user messages into a model-compatible chat template."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content}
    ]
    if tokenizer:
        try:
            # Use tokenizer's native chat template if available
            return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        except Exception as e:
            logging.warning(f"Failed to apply tokenizer chat template: {e}. Using fallback.")
            
    # Standard ChatML fallback formatting (compatible with Qwen, Llama, etc.)
    prompt = ""
    for msg in messages:
        prompt += f"<|im_start|>{msg['role']}\n{msg['content']}<|im_end|>\n"
    prompt += "<|im_start|>assistant\n"
    return prompt

# ─────────────────────────────────────────────
#  VECTOR DATABASE LOADING
# ─────────────────────────────────────────────

def load_vector_store():
    """Loads the FAISS vector database from disk."""
    vector_store_dir = os.path.join(backend_dir, 'data', 'vector_store')

    if not os.path.exists(vector_store_dir):
        logging.error("Vector store not found. Run create_index.py first.")
        return None

    logging.info("Loading FAISS vector store...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    vector_store = FAISS.load_local(
        vector_store_dir,
        embeddings,
        allow_dangerous_deserialization=True
    )
    return vector_store

# ─────────────────────────────────────────────
#  CONTEXT RETRIEVAL
# ─────────────────────────────────────────────

def retrieve_context(vector_store, query, k=3):
    """Retrieves top-k relevant document chunks from the vector store."""
    results = vector_store.similarity_search(query, k=k)

    if not results:
        logging.warning("No relevant documents found.")
        return ""

    context_parts = []
    for i, doc in enumerate(results, 1):
        source = os.path.basename(doc.metadata.get('source', 'unknown'))
        content = doc.page_content.replace('\n', ' ').strip()
        context_parts.append(f"[Source: {source}] {content}")

    context = "\n\n".join(context_parts)
    logging.info(f"Retrieved {len(results)} relevant chunks.")
    return context

# ─────────────────────────────────────────────
#  LLM MODEL RETRIEVAL
# ─────────────────────────────────────────────

def _get_llm():
    """Returns the Hugging Face LLM and an optional tokenizer."""
    hf_token = os.environ.get("HUGGINGFACEHUB_API_TOKEN") or os.environ.get("HF_TOKEN")
    
    if hf_token:
        try:
            from langchain_huggingface import HuggingFaceEndpoint
            logging.info("Using Hugging Face Serverless API (Endpoint).")
            llm = HuggingFaceEndpoint(
                repo_id="Qwen/Qwen2.5-7B-Instruct",
                task="text-generation",
                max_new_tokens=256,
                temperature=0.1,
                huggingfacehub_api_token=hf_token
            )
            return llm, None
        except Exception as e:
            logging.warning(f"Failed to load HuggingFaceEndpoint: {e}")

    # Fallback: Local Hugging Face Pipeline
    try:
        from langchain_huggingface import HuggingFacePipeline
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
        import torch
        
        logging.info("No Hugging Face token found. Loading local Qwen2.5-0.5B-Instruct model...")
        
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
        
        return HuggingFacePipeline(pipeline=pipe), tokenizer
    except Exception as e:
        logging.error(f"Failed to load local Hugging Face Pipeline: {e}")
        
    return None, None

# ─────────────────────────────────────────────
#  LLM RESPONSE GENERATION
# ─────────────────────────────────────────────

def generate_llm_response(context, query, symptoms, risk, emergency):
    """Generates an LLM response using the prompt template and retrieved context, forcing strict structure."""
    llm, tokenizer = _get_llm()

    if llm:
        user_content = USER_TEMPLATE.format(
            context=context,
            query=query
        )
        prompt = format_chat_prompt(SYSTEM_RULES, user_content, tokenizer)

        try:
            response = llm.invoke(prompt)
            if hasattr(response, 'content'):
                response_text = response.content
            else:
                response_text = response.strip()
            
            # Clean markdown wrappers if present in model output
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            # Ensure valid JSON output
            try:
                llm_json = json.loads(cleaned_text)
                
                # Extract only condition and advice from LLM
                condition = llm_json.get("condition", "No condition provided.")
                advice = llm_json.get("advice", "No advice provided.")
                
                # Debug log to confirm manual override
                logging.info("LLM output ignored for emergency control")
                
                final_response = {
                    "symptoms": symptoms,
                    "risk": risk,
                    "condition": condition,
                    "advice": advice,
                    "emergency": emergency
                }
                
                return json.dumps(final_response)
            except Exception as e:
                logging.warning(f"LLM response was not valid JSON: {cleaned_text}. Error: {e}. Falling back.")
                return _template_fallback(context, query, symptoms, risk, emergency)

        except Exception as e:
            logging.warning(f"LLM call failed ({e}). Falling back to template response.")
            return _template_fallback(context, query, symptoms, risk, emergency)
    else:
        logging.warning("No LLM available. Using template-based response.")
        return _template_fallback(context, query, symptoms, risk, emergency)

def _template_fallback(context, query, symptoms, risk, emergency):
    """Generates a structured response without an LLM, using retrieved context directly."""
    fallback_data = {
        "symptoms": symptoms,
        "risk": risk,
        "condition": "Based on your symptoms, matching clinical records were retrieved.",
        "advice": "Please consult a healthcare professional for proper evaluation.",
        "emergency": emergency
    }

    if context:
        clean_context = context.replace('"', '\\"').replace('\n', ' ')
        fallback_data["condition"] = f"Matches found in database. Details: {clean_context}"
        fallback_data["advice"] = "This is general health information only. Please consult a qualified doctor."

    return json.dumps(fallback_data)

# ─────────────────────────────────────────────
#  MAIN RESPONSE FUNCTION
# ─────────────────────────────────────────────

def get_response(query: str) -> str:
    """
    Main RAG response function.
    Takes user symptoms, extracts clinical terms, computes risk indicators manually,
    retrieves context from FAISS, and guarantees a strictly controlled structured JSON response.
    """
    try:
        # Step 1: Pre-process symptoms, risk levels, and strictly calculate emergency
        symptoms = extract_symptoms(query)
        risk = get_risk(symptoms)
        emergency = is_emergency(risk)
        
        # Safety override
        if risk != "HIGH":
            emergency = False

        # Step 2: Load the vector database
        vector_store = load_vector_store()
        if not vector_store:
            return json.dumps({
                "symptoms": symptoms,
                "risk": risk,
                "condition": "Error: Could not load the medical knowledge base.",
                "advice": "Please contact system administration.",
                "emergency": emergency
            })

        # Step 3: Retrieve relevant context
        context = retrieve_context(vector_store, query)
        if not context:
            return json.dumps({
                "symptoms": symptoms,
                "risk": risk,
                "condition": "No matching conditions found in database.",
                "advice": "Please consult a doctor for advice.",
                "emergency": emergency
            })

        # Step 4: Generate response with manual overrides enforced
        logging.info("Generating response...")
        response = generate_llm_response(context, query, symptoms, risk, emergency)

        return response

    except Exception as e:
        logging.error(f"Error generating response: {e}")
        return json.dumps({
            "symptoms": [],
            "risk": "LOW",
            "condition": f"An error occurred while processing: {str(e)}",
            "advice": "Please consult a medical professional.",
            "emergency": False
        })
