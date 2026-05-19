# MediSense AI - Intelligent Health Risk Assistant

MediSense AI is a symptom-based health guidance web application. It utilizes Retrieval-Augmented Generation (RAG) powered by a local FAISS vector store and Hugging Face language model inference to provide structured, safe, and clinical-aligned guidance on common health symptoms (such as back pain, fever, chest pain, and more).

---

## 🚀 Features

- **Symptom-Based Guidance:** Analyze symptoms against vetted clinical documents.
- **Retrieval-Augmented Generation (RAG):** Utilizes LangChain, FAISS, and Hugging Face embeddings (`all-MiniLM-L6-v2`) to retrieve local medical context.
- **Dual LLM Support:**
  - **Cloud Mode:** Leverages Hugging Face serverless API using the fast `Qwen2.5-7B-Instruct` model (if api token is provided).
  - **Local Mode:** Automatically falls back to running a lightweight model locally using Hugging Face pipelines (`Qwen2.5-0.5B-Instruct`).
- **Interactive Web Interface:** A premium, modern, single-page web app built with Vanilla JS, HTML, and custom CSS.
- **Voice Capabilities:** Features built-in voice input (speech-to-text) to describe symptoms and voice synthesis (text-to-speech) to listen to the clinical guidance aloud.

---

## 🛠️ Project Structure

```text
MediSense/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── main.py                   # FastAPI server entry point
│   ├── data/
│   │   ├── raw/                  # Vetted raw clinical text files (symptoms)
│   │   └── vector_store/         # Generated local FAISS index files
│   └── rag/
│       ├── create_index.py       # FAISS index builder script
│       ├── data_ingestion.py     # Data pipeline and chunking
│       ├── process_data.py       # Helper functions to clean and split data
│       ├── response.py           # Core RAG retrieval and generation pipeline
│       ├── test_response.py      # Quick CLI response script
│       └── test_retrieval.py     # Quick CLI retrieval check
└── frontend/
    ├── index.html                # Frontend web app layout
    ├── script.js                 # UI interactions, API client, Speech-to-Text
    └── style.css                 # Custom premium styles and animations
```

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure you have **Python 3.9+** and **Git** installed on your system.

### 1. Clone & Set Up the Workspace

```bash
# Navigate to your workspace directory
cd MediSense
```

### 2. Set Up a Virtual Environment

```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.venv\Scripts\activate.bat
# On macOS/Linux:
source .venv/bin/activate
```

### 3. Install Dependencies

Install the required Python packages:

```bash
pip install fastapi uvicorn pydantic python-dotenv langchain langchain-community langchain-huggingface faiss-cpu sentence-transformers transformers torch
```

### 4. Configure Environment Variables

1. Copy `.env.example` to create a `.env` file in the `backend` directory:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` and optionally add your [Hugging Face Token](https://huggingface.co/settings/tokens):
   ```env
   HUGGINGFACEHUB_API_TOKEN=your_hugging_face_token_here
   ```
   *Note: If no token is provided, the backend will automatically pull and run a lightweight model locally.*

---

## 📊 Run the Data Ingestion Pipeline

Before running the application, you need to ingest the clinical raw files to build the local FAISS vector search database:

```bash
# Run from the root directory
python backend/rag/create_index.py
```

This will read the texts inside `backend/data/raw/`, chunk them, compute embeddings, and save the FAISS vector index files under `backend/data/vector_store/`.

---

## 🖥️ Running the Application

1. Start the FastAPI backend:
   ```bash
   python backend/main.py
   ```
   Or run it directly using uvicorn:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

2. Open the frontend:
   - Once the server is running, the frontend is mounted statically! You can access it directly by visiting:
     `http://127.0.0.1:8000/frontend/index.html`
   - Alternatively, you can open the `frontend/index.html` file in your web browser.

---

## 🛡️ Clinical Disclaimer

MediSense AI is built solely for educational and informational purposes. It is **NOT** a clinical diagnostic tool and should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult a healthcare professional regarding medical questions or emergencies.