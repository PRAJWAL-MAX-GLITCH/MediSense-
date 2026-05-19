import os
import logging
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

def test_retrieval(query):
    """Loads the FAISS index and performs a similarity search."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    vector_store_dir = os.path.join(os.path.dirname(current_dir), 'data', 'vector_store')
    
    if not os.path.exists(vector_store_dir):
        logging.error("Vector store not found. Please run create_index.py first.")
        return

    try:
        logging.info("Loading FAISS index...")
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # allow_dangerous_deserialization=True is required for local FAISS pickles
        vector_store = FAISS.load_local(
            vector_store_dir, 
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        logging.info(f"\nSearching for: '{query}'")
        logging.info("-" * 40)
        
        results = vector_store.similarity_search(query, k=3)
        
        if not results:
            logging.info("No relevant results found.")
            return
            
        for i, doc in enumerate(results, 1):
            source = doc.metadata.get('source', 'Unknown source')
            filename = os.path.basename(source)
            
            logging.info(f"RESULT {i} (Source: {filename})")
            
            # Clean up the output formatting for readability
            content = doc.page_content.replace('\n', ' ').strip()
            logging.info(f"{content}\n")
            
    except Exception as e:
        logging.error(f"Error during retrieval: {e}")

if __name__ == "__main__":
    sample_query = "I have fever and headache"
    test_retrieval(sample_query)
