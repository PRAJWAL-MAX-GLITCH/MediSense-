from typing import List

# Predefined list of common medical symptoms to extract
COMMON_SYMPTOMS = [
    "fever",
    "headache",
    "cough",
    "chest pain",
    "fatigue",
    "breathing issue",
    "body pain"
]

def extract_symptoms(text: str) -> List[str]:
    """
    Analyzes the user input text to extract matches from a predefined list of common symptoms.
    
    Args:
        text (str): The descriptive input containing user symptoms.
        
    Returns:
        List[str]: A list of matched symptoms present in the text.
    """
    if not text:
        return []
    
    # Convert input text to lowercase for case-insensitive matching
    lower_text = text.lower()
    
    # Detect matches from the common symptoms list
    detected = [symptom for symptom in COMMON_SYMPTOMS if symptom in lower_text]
    
    return detected
