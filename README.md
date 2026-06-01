# 🩺 MediSense AI — Intelligent Health Risk Assistant

MediSense AI is a **full‑stack AI‑powered health guidance platform**. It combines a Retrieval‑Augmented Generation (RAG) pipeline, a local FAISS vector store, and Hugging Face LLM inference to deliver safe, structured medical advice.

---

## 🚀 Premium Features
- **Next.js 14 + TypeScript** front‑end with **Tailwind CSS**, glass‑morphism UI, and smooth animated transitions.
- **Voice Input** – speak symptoms directly via the microphone button.
- **Multi‑turn Follow‑up** – the assistant asks clarifying questions when needed.
- **Symptom Extraction Engine** (`symptom_extractor.py`) – detects 35+ clinical keywords.
- **Risk Assessment** (`decision_engine.py`) – computes **LOW / MEDIUM / HIGH** risk and an **emergency flag**.
- **RAG Pipeline** – LangChain + FAISS with `all‑MiniLM‑L6‑v2` embeddings retrieves the most relevant clinical excerpts.
- **Dual LLM Support**
  - ☁️ **Cloud** – Hugging Face Serverless API (`Qwen/Qwen2.5‑7B‑Instruct`).
  - 💻 **Local** – Auto‑download of `Qwen/Qwen2.5‑0.5B‑Instruct` if no token is supplied.
- **Structured JSON Responses** – `{ symptoms, risk, condition, advice, emergency }`.
- **Dynamic Risk Badges** – 🚨 Emergency, ⚠️ Moderate, 🛡️ Low risk.
- **Persisted Chat History** – stored in `localStorage` with a sidebar navigator.
- **Test Suite** – `test_response.py` validates the end‑to‑end RAG flow.

---

## 📂 Project Structure
```text
MediSense/
├── .gitignore
├── README.md
├── package.json                # Monorepo config (frontend & backend)
├── backend/
│   ├── .env.example           # Template for environment variables
│   ├── main.py                # FastAPI entry point
│   ├── ai/
│   │   ├── symptom_extractor.py   # Symptom detection
│   │   └── decision_engine.py     # Risk calculation
│   ├── data/
│   │   ├── raw/               # 14 vetted clinical text files
│   │   └── vector_store/      # FAISS index (generated locally, not committed)
│   └── rag/
│       ├── create_index.py      # Build FAISS index
│       ├── response.py          # Core RAG + LLM pipeline (symptoms‑first)
│       ├── test_response.py     # CLI end‑to‑end test
│       └── test_retrieval.py    # FAISS retrieval test
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx      # Root layout with Google Fonts
        │   ├── page.tsx        # Home page
        │   └── globals.css     # Dark theme, glow effects
        ├── components/
        │   └── ChatInterface.tsx   # Full chat UI
        └── hooks/
            └── useChat.ts      # Chat state, API calls, localStorage
```

---

## ⚙️ Installation & Setup
### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- Modern browser (Chrome recommended for voice input)

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/PRAJWAL-MAX-GLITCH/MediSense-.git
cd MediSense-
```

### 2️⃣ Backend Setup
```bash
# Virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows PowerShell
# .venv/bin/activate          # macOS / Linux

# Install Python dependencies
pip install -r backend/requirements.txt
```
> *If `requirements.txt` does not exist, install the packages manually as listed in the original docs.*

### 3️⃣ Configure Environment Variables
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` and add your free Hugging Face token (optional):
```env
HUGGINGFACEHUB_API_TOKEN=your_token_here
```
*Without a token the app will fall back to the lightweight local model.*

### 4️⃣ Build the Knowledge Base (one‑time)
```bash
python backend/rag/create_index.py
```
### 5️⃣ Frontend Setup
```bash
cd frontend
npm install
```

---

## ▶️ Running the Application
Open **two terminals**:
1️⃣ **Backend**
```bash
# From project root, with venv active
python backend/main.py
```
2️⃣ **Frontend**
```bash
cd frontend
npm run dev   # Starts Next.js dev server on http://localhost:3000
```
Visit the URL and start chatting!

---

## 🧪 Testing
A small test harness is provided to ensure the RAG pipeline works end‑to‑end:
```bash
python backend/rag/test_response.py "I have a persistent cough and mild fever"
```
The script prints the structured JSON response and verifies that the vector store loads correctly.

---

## 📚 How It Works
```mermaid
flowchart TD
    A[User inputs symptoms] --> B[Symptom Extractor]
    B --> C[Risk Assessment]
    C --> D[FAISS Vector Store]
    D --> E[LLM (cloud/local)]
    E --> F[JSON Response]
    F --> G[Next.js UI]
```

---

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| UI Styling | Glassmorphism, CSS animations |
| Backend | FastAPI, Python 3.9+ |
| LLM | Qwen2.5‑7B (cloud) / Qwen2.5‑0.5B (local) |
| Embeddings | `all‑MiniLM‑L6‑v2` via sentence‑transformers |
| Vector Store | FAISS (local) |
| RAG Framework | LangChain + LangChain‑HuggingFace |
| Translation | deep‑translator + langdetect |
| Web Search (optional) | Tavily API |

---

## 🛡️ Clinical Disclaimer
MediSense AI is **strictly for educational and informational purposes**. It is **not** a diagnostic tool and must never replace professional medical advice, diagnosis, or treatment. In emergencies, call your local emergency services (**911 / 112**).
