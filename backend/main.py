import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add backend directory to sys.path to enable imports of local modules
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from fastapi.staticfiles import StaticFiles
from rag.response import get_response

app = FastAPI(
    title="MediSense AI Backend",
    description="Symptom-based health guidance using local FAISS vector store and Hugging Face inference."
)

# Serve static frontend files
frontend_dir = os.path.join(os.path.dirname(backend_dir), "frontend")
app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Essential for allowing requests from local index.html (file:// or localhost)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SymptomRequest(BaseModel):
    symptoms: str

@app.post("/analyze")
async def analyze_symptoms(request: SymptomRequest):
    symptoms = request.symptoms.strip()
    if not symptoms:
        raise HTTPException(status_code=400, detail="Symptoms text cannot be empty.")
    
    try:
        # Run the RAG pipeline to generate medical guidance
        response_text = get_response(symptoms)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "MediSense AI Backend",
        "endpoints": {
            "symptom_analysis": "/analyze [POST]"
        }
    }

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
