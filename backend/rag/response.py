import os
import logging
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
load_dotenv(env_path)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# ─────────────────────────────────────────────
#  CHAT PROMPT TEMPLATES & FORMATTER
# ─────────────────────────────────────────────

SYSTEM_RULES = """You are a helpful medical health assistant.

STRICT RULES:
- Do NOT give a final diagnosis.
- Do NOT prescribe any medicines or dosages.
- Only give general health guidance based on the context provided.
- Keep language simple and easy to understand.
- Always recommend consulting a doctor for proper diagnosis.

Use the trusted medical context to answer the user's question.
If the context does not contain enough information, say so honestly."""

USER_TEMPLATE = """CONTEXT:
{context}

USER SYMPTOMS:
{query}

Respond in this exact format:

Possible Condition: <what the symptoms might indicate>
Explanation: <brief explanation based on context>
Advice: <general guidance and when to see a doctor>"""

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
    current_dir = os.path.dirname(os.path.abspath(__file__))
    vector_store_dir = os.path.join(os.path.dirname(current_dir), 'data', 'vector_store')

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
            # Using Qwen2.5-7B-Instruct via Hugging Face Serverless API (free & fast)
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

def generate_llm_response(context, query):
    """Generates an LLM response using the prompt template and retrieved context."""
    llm, tokenizer = _get_llm()

    if llm:
        user_content = USER_TEMPLATE.format(context=context, query=query)
        prompt = format_chat_prompt(SYSTEM_RULES, user_content, tokenizer)

        try:
            response = llm.invoke(prompt)
            # Handle both string output (local Pipeline) and message content (ChatModel wrappers)
            if hasattr(response, 'content'):
                return response.content
            return response.strip()
        except Exception as e:
            logging.warning(f"LLM call failed ({e}). Falling back to template response.")
            return _template_fallback(context, query)
    else:
        logging.warning("No LLM available. Using template-based response.")
        return _template_fallback(context, query)

def _template_fallback(context, query):
    """Generates a structured response without an LLM, using retrieved context directly."""
    return (
        f"Possible Condition: Based on your symptoms ({query}), "
        f"the retrieved medical information suggests the following.\n\n"
        f"Explanation:\n{context}\n\n"
        f"Advice: This is general health information only. "
        f"Please consult a qualified healthcare professional for proper diagnosis and treatment."
    )

# ─────────────────────────────────────────────
#  MAIN RESPONSE FUNCTION
# ─────────────────────────────────────────────

def get_response(query: str) -> str:
    """
    Main RAG response function.
    Takes user symptoms, retrieves relevant context from FAISS,
    and generates a structured, safe medical response.
    """
    try:
        # Step 1: Load the vector database
        vector_store = load_vector_store()
        if not vector_store:
            return "Error: Could not load the medical knowledge base."

        # Step 2: Retrieve relevant context
        context = retrieve_context(vector_store, query)
        if not context:
            return "Sorry, I could not find relevant medical information for your symptoms."

        # Step 3: Generate response
        logging.info("Generating response...")
        response = generate_llm_response(context, query)

        return response

    except Exception as e:
        logging.error(f"Error generating response: {e}")
        return f"An error occurred while processing your request: {str(e)}"
