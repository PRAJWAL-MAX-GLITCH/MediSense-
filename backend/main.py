import os
import sys
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# Add backend directory to sys.path to enable imports of local modules
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from rag.response import get_response
import database
import models
import auth
import pdf_generator

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

from fastapi import FastAPI, HTTPException, Depends, status, Request
from contextlib import asynccontextmanager

from rag.response import get_llm_and_tokenizer, load_vector_store

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Phase 9: Startup Caching (Load once)
    print("[STARTUP] Loading FAISS vector store...")
    app.state.vectorstore = load_vector_store()
    
    print("[STARTUP] Loading LLM and Tokenizer...")
    llm, tokenizer = get_llm_and_tokenizer()
    app.state.llm = llm
    app.state.tokenizer = tokenizer
    
    print("[STARTUP] Application startup complete.")
    yield
    print("[SHUTDOWN] Application shutdown complete.")

app = FastAPI(
    title="MediSense AI Backend",
    description="Symptom-based health guidance using local FAISS vector store and Hugging Face inference.",
    lifespan=lifespan
)

# Optionally serve static frontend build — skip if directory doesn't exist
frontend_build = os.path.join(os.path.dirname(backend_dir), "frontend", ".next", "static")
if os.path.isdir(frontend_build):
    from fastapi.staticfiles import StaticFiles
    app.mount("/frontend", StaticFiles(directory=frontend_build), name="frontend")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models (V2 style) ──────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str
    
class SymptomRequest(BaseModel):
    session_id: Optional[str] = None
    symptoms: str
    messages: Optional[List[dict]] = None

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    language_preference: str
    created_at: datetime

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    language_preference: Optional[str] = None

class ConsultationCreate(BaseModel):
    symptoms: str
    risk_level: str
    possible_conditions: str
    full_report: str

class ConsultationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: datetime
    symptoms: str
    risk_level: str
    possible_conditions: str
    full_report: str

# ─── Auth routes ─────────────────────────────────────────────────────────────

@app.post("/auth/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/users/me", response_model=UserResponse)
def update_user_me(
    user_update: UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.password is not None:
        current_user.hashed_password = auth.get_password_hash(user_update.password)
    if user_update.language_preference is not None:
        current_user.language_preference = user_update.language_preference

    db.commit()
    db.refresh(current_user)
    return current_user

# ─── Consultation routes ──────────────────────────────────────────────────────

@app.post("/consultations", response_model=ConsultationResponse)
def create_consultation(
    consultation: ConsultationCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    db_consultation = models.Consultation(
        user_id=current_user.id,
        symptoms=consultation.symptoms,
        risk_level=consultation.risk_level,
        possible_conditions=consultation.possible_conditions,
        full_report=consultation.full_report
    )
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    return db_consultation

@app.get("/consultations", response_model=List[ConsultationResponse])
def get_consultations(
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Consultation).filter(models.Consultation.user_id == current_user.id)

    if risk_level:
        query = query.filter(models.Consultation.risk_level == risk_level.upper())

    if search:
        query = query.filter(
            (models.Consultation.symptoms.like(f"%{search}%")) |
            (models.Consultation.possible_conditions.like(f"%{search}%"))
        )

    consultations = query.order_by(models.Consultation.date.desc()).offset(skip).limit(limit).all()
    return consultations

@app.get("/consultations/{id}/pdf")
def get_consultation_pdf(
    id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == id,
        models.Consultation.user_id == current_user.id
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    pdf_bytes = pdf_generator.create_consultation_pdf(consultation)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=medisense_report_{id}.pdf"
        }
    )

# ─── AI Analysis route ────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze_symptoms(request: Request, data: SymptomRequest):
    symptoms = data.symptoms.strip()
    if not symptoms:
        raise HTTPException(status_code=400, detail="Symptoms text cannot be empty.")

    try:
        # Pass globally cached instances down to RAG pipeline
        response_text = get_response(
            symptoms,
            vector_store=request.app.state.vectorstore,
            llm=request.app.state.llm,
            tokenizer=request.app.state.tokenizer,
            chat_history=data.messages
        )
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "MediSense AI Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
