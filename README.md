# 🩺 MediSense AI — Intelligent Health Risk Assistant

MediSense AI is a full-stack AI-powered health guidance application. It uses a **Retrieval-Augmented Generation (RAG)** pipeline backed by a local FAISS vector store and Hugging Face LLM inference to provide structured, safe, and clinically aligned guidance on common health symptoms.

The application features a **premium dark chat interface** — built with Next.js 14, TypeScript, and Tailwind CSS — where users can describe symptoms in natural language and receive structured AI analysis including risk levels, detected conditions, and general health advice.

---

## 🚀 Key Features

- **Premium Chat UI** — Next.js 14 + TypeScript frontend with glassmorphism, purple glow effects, and smooth animations
- **Voice Input (Speech-to-Text)** — Speak symptoms directly using the built-in microphone button
- **Multi-turn Follow-up** — App asks intelligent follow-up questions when symptoms are insufficient
- **Symptom Extraction Engine** — `symptom_extractor.py` detects 35+ clinical symptoms from free-form text
- **Risk Assessment** — `decision_engine.py` computes `LOW`, `MEDIUM`, or `HIGH` risk with emergency flag
- **RAG Pipeline** — LangChain + FAISS with `all-MiniLM-L6-v2` embeddings retrieves relevant clinical context
- **Dual LLM Support**
  - ☁️ **Cloud Mode** — Hugging Face Serverless API with `Qwen/Qwen2.5-7B-Instruct`
  - 💻 **Local Fallback** — Auto-downloads `Qwen/Qwen2.5-0.5B-Instruct` if no token provided
- **Symptoms-First Classification** — Symptoms are extracted before query classification, ensuring health queries never fall through to the general pipeline
- **Structured JSON Responses** — Backend returns `{ symptoms, risk, condition, advice, emergency }`
- **Chat History** — Sessions persisted in localStorage with sidebar navigation
- **Dynamic Risk Badges** — 🚨 Emergency / ⚠️ Moderate Risk / 🛡️ Low Risk color-coded UI

---

## 🏗️ Project Structure

```text
MediSense/
├── .gitignore
├── README.md
├── package.json                        # Root monorepo config
├── backend/
│   ├── .env                            # Your environment variables (not committed)
│   ├── .env.example                    # Config template
│   ├── main.py                         # FastAPI server entry point
│   ├── ai/
│   │   ├── symptom_extractor.py        # Detects 35+ clinical symptoms from text
│   │   └── decision_engine.py          # Computes risk level and emergency flag
│   ├── data/
│   │   ├── raw/                        # 14 vetted clinical text files
│   │   └── vector_store/               # FAISS index (generated locally, not committed)
│   └── rag/
│       ├── create_index.py             # Builds FAISS vector index from raw data
│       ├── data_ingestion.py           # Loads and chunks raw medical text files
│       ├── process_data.py             # Text cleaning helpers
│       ├── response.py                 # Core RAG + LLM pipeline (symptoms-first)
│       ├── test_response.py            # CLI tool to test end-to-end response
│       └── test_retrieval.py           # CLI tool to test FAISS retrieval
└── frontend/
    ├── package.json                    # Next.js dependencies
    ├── next.config.js
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx              # Root layout with Google Fonts
        │   ├── page.tsx                # Home page
        │   └── globals.css             # Dark theme, animations, glow effects
        ├── components/
        │   └── ChatInterface.tsx       # Full chat UI — sidebar, messages, input bar
        └── hooks/
            └── useChat.ts              # Chat state, API calls, localStorage
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- A modern browser (Chrome recommended for voice input)

---

### 1. Clone the Repository

```bash
git clone https://github.com/PRAJWAL-MAX-GLITCH/MediSense-.git
cd MediSense-
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1        # Windows PowerShell
# source .venv/bin/activate        # macOS / Linux

# Install Python dependencies
pip install fastapi uvicorn pydantic python-dotenv langchain langchain-community langchain-huggingface faiss-cpu sentence-transformers transformers torch langdetect deep-translator tavily-python
```

### 3. Configure Environment Variables

```bash
copy backend\.env.example backend\.env
```

Edit `backend\.env` and add your free [Hugging Face token](https://huggingface.co/settings/tokens):

```env
HUGGINGFACEHUB_API_TOKEN=hf_xxxxxxxxxxxxxxxx
```

> If left blank, the app auto-downloads and runs `Qwen2.5-0.5B-Instruct` locally (slower).

### 4. Build the FAISS Knowledge Base (One-Time)

```bash
python backend/rag/create_index.py
```

### 5. Frontend Setup

```bash
cd frontend
npm install
```

---

## 🖥️ Running the Application

Open **two terminals**:

**Terminal 1 — Backend**
```bash
# From project root, with .venv activated
python backend/main.py
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

---

## 🔁 How It Works

```
User types / speaks symptoms
         ↓
symptom_extractor.py — detects 35+ clinical keywords (symptoms-first)
         ↓
classify_query() — symptoms present → always health pipeline
         ↓
Follow-up gatekeeper — < 2 symptoms → ask follow-up questions
         ↓
decision_engine.py — computes risk (LOW / MEDIUM / HIGH) + emergency flag
         ↓
FAISS vector store — retrieves top-3 relevant clinical document chunks
         ↓
Qwen LLM (Cloud or Local) — generates condition + advice only
         ↓
JSON response: { type, symptoms, risk, condition, advice, emergency }
         ↓
Next.js Chat UI — renders bubble with colour-coded risk badge
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| UI Styling | Glassmorphism, Framer-style CSS animations |
| Backend | FastAPI, Python 3.9+ |
| LLM | Qwen2.5-7B (cloud) / Qwen2.5-0.5B (local) |
| Embeddings | `all-MiniLM-L6-v2` via sentence-transformers |
| Vector Store | FAISS (local) |
| RAG Framework | LangChain + LangChain-HuggingFace |
| Translation | deep-translator + langdetect |
| Web Search | Tavily API (optional) |

---

## 🛡️ Clinical Disclaimer

MediSense AI is built **solely for educational and informational purposes**. It is **NOT** a clinical diagnostic tool and must not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for any medical concerns. In an emergency, call your local emergency services **(911 / 112)** immediately.
