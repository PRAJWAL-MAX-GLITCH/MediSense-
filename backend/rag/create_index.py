import os
import logging
from process_data import get_processed_chunks
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

def create_and_save_index():
    """Creates a FAISS index from the processed text data and saves it."""
    
    logging.info("Loading data...")
    chunks = get_processed_chunks()
    
    if not chunks:
        logging.error("No data chunks found. Cannot create index.")
        return
        
    current_dir = os.path.dirname(os.path.abspath(__file__))
    vector_store_dir = os.path.join(os.path.dirname(current_dir), 'data', 'vector_store')
    
    os.makedirs(vector_store_dir, exist_ok=True)
    
    logging.info("Creating embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    try:
        vector_store = FAISS.from_documents(chunks, embeddings)
        
        logging.info("Saving index...")
        vector_store.save_local(vector_store_dir)
        logging.info(f"Done! Index successfully saved to {vector_store_dir}")
    except Exception as e:
        logging.error(f"Error creating/saving index: {e}")

if __name__ == "__main__":
    create_and_save_index()
