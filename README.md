# MediSense AI — Intelligent Health Risk Assistant

MediSense AI is an AI-powered, conversational health guidance web application. It uses a Retrieval-Augmented Generation (RAG) pipeline backed by a local FAISS vector store and Hugging Face language model inference to provide structured, safe, and clinically aligned guidance on common health symptoms.

The application features a modern **chat-based interface** — similar to a medical chatbot — where users can describe symptoms in a natural conversational flow and receive structured AI analysis including risk levels, detected conditions, and general health advice.

---

## 🚀 Key Features

- **Conversational Chat UI:** A modern chat interface for natural symptom input with bubble-style messages.
- **Voice Input (Speech-to-Text):** Speak your symptoms directly into the app using the built-in microphone button.
- **Multi-turn Follow-up:** The app accumulates context across follow-up messages for a richer analysis.
- **Symptom Extraction Engine:** A built-in `symptom_extractor.py` module parses free-form user text to detect known clinical symptoms.
- **Risk Assessment:** The `decision_engine.py` computes a structured risk level (`LOW`, `MEDIUM`, or `HIGH`) along with an emergency flag from the detected symptoms.
- **Retrieval-Augmented Generation (RAG):** Uses LangChain + FAISS with `all-MiniLM-L6-v2` embeddings to retrieve clinically relevant context from local medical texts.
- **Dual LLM Support:**
  - **☁️ Cloud Mode:** Uses Hugging Face Serverless API with `Qwen/Qwen2.5-7B-Instruct` (fast, free API token required).
  - **💻 Local Fallback Mode:** Auto-downloads and runs `Qwen/Qwen2.5-0.5B-Instruct` locally if no token is provided.
- **Structured JSON Responses:** Backend returns a standardized JSON payload with `symptoms`, `risk`, `condition`, `advice`, and `emergency` fields.
- **Dynamic Risk UI Badges:** The UI automatically shows 🚨 Emergency, ⚠️ Moderate Risk, or 🛡️ Clinical Guidance based on the analysis.

---

## 🏗️ Project Structure

```text
MediSense/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example                # Config template for environment variables
│   ├── main.py                     # FastAPI server entry point
│   ├── ai/
│   │   ├── symptom_extractor.py    # Detects clinical symptoms from user text
│   │   └── decision_engine.py      # Computes risk level and emergency flag
│   ├── data/
│   │   ├── raw/                    # Vetted clinical text files (14 symptom topics)
│   │   └── vector_store/           # FAISS index files (generated locally)
│   └── rag/
│       ├── create_index.py         # Builds the FAISS vector index from raw data
│       ├── data_ingestion.py       # Loads and chunks raw medical text files
│       ├── process_data.py         # Text cleaning and document processing helpers
│       ├── response.py             # Core RAG retrieval and LLM generation pipeline
│       ├── test_response.py        # CLI tool to test end-to-end response
│       └── test_retrieval.py       # CLI tool to test FAISS vector retrieval
└── frontend/
    ├── index.html                  # Main HTML layout (chat app structure)
    ├── css/
    │   └── style.css               # Custom styles, animations, and themes
    └── js/
        ├── app.js                  # Entry point — initializes UI and Chat modules
        ├── api.js                  # API client — sends symptom queries to FastAPI
        ├── chat.js                 # Chat logic, follow-up accumulation, voice input
        └── ui.js                   # UI rendering — bubbles, risk badges, responses
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Python 3.9+**
- **Git**
- A modern browser (Chrome recommended for full speech support)

---

### 1. Clone the Repository

```bash
git clone https://github.com/PRAJWAL-MAX-GLITCH/MediSense-.git
cd MediSense-
```

### 2. Create & Activate a Virtual Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate (macOS / Linux)
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install fastapi uvicorn pydantic python-dotenv langchain langchain-community langchain-huggingface faiss-cpu sentence-transformers transformers torch
```

### 4. Configure Environment Variables

```bash
# Copy the example config
cp backend/.env.example backend/.env
```

Edit `backend/.env` and optionally add your free [Hugging Face Access Token](https://huggingface.co/settings/tokens):

```env
HUGGINGFACEHUB_API_TOKEN=your_token_here
```

> **Note:** If you leave this blank, the app will automatically download and run `Qwen2.5-0.5B-Instruct` locally (slower, but no account needed).

---

## 📊 Build the Knowledge Base (One-Time Setup)

Before running the application, you need to build the FAISS vector index from the bundled clinical text files:

```bash
python backend/rag/create_index.py
```

This will:
1. Load all 14 clinical text files from `backend/data/raw/`
2. Chunk and embed them using `all-MiniLM-L6-v2`
3. Save the FAISS index to `backend/data/vector_store/`

---

## 🖥️ Running the Application

### Start the Backend Server

```bash
python backend/main.py
```

Or with uvicorn directly:

```bash
uvicorn backend.main:app --reload --port 8000
```

### Open the Frontend

Once the server is up, open the frontend in your browser:

```
http://127.0.0.1:8000/frontend/index.html
```

Or open `frontend/index.html` directly in your browser.

---

## 🔁 How It Works

```
User types/speaks symptoms
         ↓
symptom_extractor.py — detects clinical keywords
         ↓
decision_engine.py — computes risk (LOW / MEDIUM / HIGH) + emergency flag
         ↓
FAISS vector store — retrieves top-3 relevant clinical document chunks
         ↓
Qwen LLM (Cloud or Local) — generates structured guidance
         ↓
JSON response: { symptoms, risk, condition, advice, emergency }
         ↓
Chat UI — renders bubble with colour-coded risk badge
```

---

## 🛡️ Clinical Disclaimer

MediSense AI is built **solely for educational and informational purposes**. It is **NOT** a clinical diagnostic tool and must not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for any medical concerns. In an emergency, call your local emergency services (911 / 112) immediately.