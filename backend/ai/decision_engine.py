def get_risk(symptoms: list) -> str:
    """
    Determines the medical risk level based on a list of symptoms.
    
    Rules:
    - If "chest pain" OR "breathing issue" → HIGH
    - If "fever" AND "headache" → MEDIUM
    - If only "fever" → LOW
    - Default → LOW
    
    Args:
        symptoms (list): A list of extracted symptoms.
        
    Returns:
        str: The risk level classification ("HIGH", "MEDIUM", or "LOW").
    """
    if not symptoms:
        return "LOW"
        
    # Convert all symptoms to lowercase to ensure case-insensitive matching
    symptoms_set = {s.lower().strip() for s in symptoms}
    
    # Rule 1: High-risk indicators
    if "chest pain" in symptoms_set or "breathing issue" in symptoms_set:
        return "HIGH"
        
    # Rule 2: Medium-risk indicator combination
    if "fever" in symptoms_set and "headache" in symptoms_set:
        return "MEDIUM"
        
    # Rule 3 & Default: "fever" only or other combinations fall back to LOW
    return "LOW"

def is_emergency(risk: str) -> bool:
    """
    Determines if the risk level is classified as a medical emergency.
    
    Rules:
    - HIGH → True
    - MEDIUM / LOW → False
    
    Args:
        risk (str): The assessed risk level ("HIGH", "MEDIUM", "LOW").
        
    Returns:
        bool: True if emergency, False otherwise.
    """
    return risk.upper() == "HIGH"
