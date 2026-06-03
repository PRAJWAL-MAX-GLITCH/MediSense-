import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

backend_dir = os.path.dirname(os.path.abspath(__file__))
# Default to SQLite database
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(backend_dir, 'medisense.db')}"

# Connect args needed for SQLite to allow concurrent access across threads in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
