import os
import glob
import logging
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

def load_text_documents(data_dir):
    """Loads all TXT files from the specified directory."""
    if not os.path.exists(data_dir):
        logging.error(f"Data directory does not exist: {data_dir}")
        return []

    documents = []
    
    # Process only TXT files
    txt_files = glob.glob(os.path.join(data_dir, "*.txt"))
    
    if not txt_files:
        logging.warning("No .txt files found in the directory.")
        return []

    for txt_file in txt_files:
        try:
            # Check if file is empty to handle safely
            if os.path.getsize(txt_file) == 0:
                logging.warning(f"Skipping empty file: {txt_file}")
                continue
                
            loader = TextLoader(txt_file, encoding='utf-8')
            loaded_docs = loader.load()
            if loaded_docs:
                documents.extend(loaded_docs)
        except Exception as e:
            logging.error(f"Error loading TXT {txt_file}: {e}")
            
    logging.info(f"Loaded {len(documents)} TXT documents from {len(txt_files)} files.")
    
    return documents

def chunk_documents(documents):
    """Splits documents into smaller chunks for RAG."""
    if not documents:
        logging.warning("No documents to chunk.")
        return []
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len
    )
    
    chunks = text_splitter.split_documents(documents)
    logging.info(f"Split documents into {len(chunks)} chunks.")
    
    return chunks

def get_processed_chunks():
    """Main pipeline function to load and chunk txt data."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(current_dir), 'data', 'raw')
    
    documents = load_text_documents(data_dir)
    chunks = chunk_documents(documents)
    return chunks

if __name__ == "__main__":
    get_processed_chunks()
