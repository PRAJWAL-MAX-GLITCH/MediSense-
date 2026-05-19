import os
import requests
from bs4 import BeautifulSoup
import logging
from urllib.parse import urlparse
import re
import time
import random

# Setup simple logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

def fetch_page(url):
    """Fetches the HTML content of a URL."""
    try:
        # Using a generic User-Agent to avoid being blocked by some websites
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # Raise an exception for bad status codes
        return response.text
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching {url}: {e}")
        return None

def extract_content(html):
    """Extracts useful text from the HTML, removing navigation and noise."""
    if not html:
        return ""
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # Try to locate the main content block to avoid sidebars/menus
    main_content = soup.find('main')
    if not main_content:
        main_content = soup.find('article')
    if not main_content:
        main_content = soup.find('div', id='content')
    if not main_content:
        main_content = soup.body
        
    if not main_content:
        return ""
        
    # Remove unwanted tags (scripts, styles, navigation, footer, forms, etc.)
    for element in main_content(["script", "style", "nav", "footer", "form", "aside", "header", "button", "iframe"]):
        element.decompose()
        
    # Extract text with newlines to preserve some paragraph structure
    text = main_content.get_text(separator='\n', strip=True)
    
    # Clean up excessive whitespace and empty lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text

def generate_filename(url):
    """Automatically generates a clean filename from the URL."""
    parsed_url = urlparse(url)
    path_parts = [p for p in parsed_url.path.split('/') if p]
    name = path_parts[-1] if path_parts else "unknown"
    
    # Simplify common NHS URL patterns
    name = re.sub(r'-in-adults.*$', '', name)
    name = re.sub(r'-in-babies.*$', '', name)
    name = re.sub(r'-in-children.*$', '', name)
    
    # Convert plurals for common symptoms
    name = re.sub(r'aches$', 'ache', name)
    
    # Replace hyphens with underscores
    name = name.replace('-', '_').lower()
    
    return f"{name}.txt"

def save_to_file(filename, content):
    """Saves the extracted content to a text file."""
    if not content:
        logging.warning(f"No content to save for {filename}")
        return
        
    # Define and create output directory (backend/data/raw)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    output_dir = os.path.join(backend_dir, 'data', 'raw')
    
    os.makedirs(output_dir, exist_ok=True)
    
    file_path = os.path.join(output_dir, filename)
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        logging.info(f"Saved: {filename}")
    except IOError as e:
        logging.error(f"Error saving to file {filename}: {e}")

def main():
    # List of 15 trusted NHS medical URLs
    urls = [
        "https://www.nhs.uk/conditions/fever-in-adults/",
        "https://www.nhs.uk/conditions/headaches/",
        "https://www.nhs.uk/conditions/chest-pain/",
        "https://www.nhs.uk/conditions/cough/",
        "https://www.nhs.uk/conditions/fatigue/",
        "https://www.nhs.uk/conditions/sore-throat/",
        "https://www.nhs.uk/conditions/stomach-ache/",
        "https://www.nhs.uk/conditions/diarrhoea-and-vomiting/",
        "https://www.nhs.uk/conditions/back-pain/",
        "https://www.nhs.uk/conditions/joint-pain/",
        "https://www.nhs.uk/conditions/rashes-in-babies-and-children/",
        "https://www.nhs.uk/conditions/dizziness/",
        "https://www.nhs.uk/conditions/shortness-of-breath/",
        "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/",
        "https://www.nhs.uk/conditions/diabetes/"
    ]
    
    for i, url in enumerate(urls):
        filename = generate_filename(url)
        
        logging.info(f"[{i+1}/{len(urls)}] Downloading from: {url}")
        
        html = fetch_page(url)
        if html:
            content = extract_content(html)
            if content:
                save_to_file(filename, content)
            else:
                logging.warning(f"Failed to extract content from {url}")
        else:
            logging.error(f"Failed to fetch HTML for {url}")
            
        # Add delay between requests (1 to 2 seconds) to avoid rate limiting
        if i < len(urls) - 1:
            delay = random.uniform(1, 2)
            logging.info(f"Waiting for {delay:.2f} seconds...")
            time.sleep(delay)
            
if __name__ == "__main__":
    main()
