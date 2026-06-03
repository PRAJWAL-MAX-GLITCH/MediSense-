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

## ☁️ Deployment Instructions

MediSense AI is deployment-ready for cloud platforms. **Render** is recommended as the simplest default for this stack.

### Option A: Deploying on Render (Recommended)
1. **Backend**:
   - Create a new **Web Service** and connect your GitHub repo.
   - **Root Directory**: `backend`
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Env Vars**: Add your `JWT_SECRET_KEY` and `HUGGINGFACEHUB_API_TOKEN`.

2. **Frontend**:
   - Create a new **Static Site**.
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `out` (or `.next` depending on your Next.js config).

### Option B: Deploying on Railway
1. **Backend**:
   - Railway will automatically detect the `Procfile` and `runtime.txt` in the root.
   - Adjust the `Procfile` path to point to `backend.main:app`.
   - Add your environment variables in the Railway dashboard.

2. **Frontend**:
   - Deploy as a Next.js service. Railway will automatically run `npm install` and `npm run build`.

---

## 🛡️ Clinical Disclaimer
MediSense AI is **strictly for educational and informational purposes**. It is **not** a diagnostic tool and must never replace professional medical advice, diagnosis, or treatment. In emergencies, call your local emergency services (**911 / 112**).
