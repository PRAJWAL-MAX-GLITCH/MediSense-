# 🩺 MediSense AI — Intelligent Health Risk Assistant

MediSense AI is a **full-stack AI-powered health guidance platform**. It combines a Retrieval-Augmented Generation (RAG) pipeline, a local FAISS vector store, and Hugging Face LLM inference to deliver safe, structured medical advice.

---

## 🚀 Features
- **Medical RAG** – LangChain + FAISS retrieves relevant clinical excerpts.
- **Follow-up Questions** – The assistant asks clarifying questions when needed.
- **Risk Assessment** – Computes **LOW / MEDIUM / HIGH** risk.
- **Emergency Detection** – Flags critical symptoms immediately.
- **Voice Features** – Speak symptoms directly via the microphone button.
- **Consultation History** – Persisted in `localStorage` with a sidebar navigator.
- **PDF Reports** – Generate PDF summaries of your consultations.
- **Multilingual Support** – Integrated translation capabilities.

---

## 🛠️ Tech Stack & Libraries
| Layer | Technology / Libraries Used |
|---|---|
| **Frontend** | Next.js 14, React, Tailwind CSS, Framer Motion, Radix UI, Axios |
| **Backend** | FastAPI, Python 3.11, Uvicorn, Python-Multipart |
| **Database** | SQLite, SQLAlchemy |
| **AI / NLP** | LangChain, Hugging Face, FAISS-CPU, Sentence-Transformers, PyTorch |
| **Translation** | Deep-Translator, Langdetect |
| **PDF Generation** | ReportLab |
| **Auth** | JWT (python-jose), bcrypt |

---

## ⚙️ Local Setup

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**

### 1️⃣ Backend Setup
```bash
cd backend
python -m venv .venv
# Activate virtual environment
# Windows: .venv\Scripts\Activate.ps1
# Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Optional: Add HF Token in .env to use cloud inference
uvicorn main:app --reload
```

### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:3000` to start chatting!

---

## 🛡️ Clinical Disclaimer
MediSense AI is **strictly for educational and informational purposes**. It is **not** a diagnostic tool and must never replace professional medical advice, diagnosis, or treatment. In emergencies, call your local emergency services (**911 / 112**).
