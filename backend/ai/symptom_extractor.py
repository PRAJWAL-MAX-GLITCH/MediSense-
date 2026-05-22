from typing import List

COMMON_SYMPTOMS = [
    # Pain
    "chest pain", "back pain", "stomach pain", "abdominal pain", "joint pain",
    "muscle pain", "body pain", "neck pain", "leg pain", "arm pain", "ear pain",
    # Respiratory
    "cough", "dry cough", "breathing issue", "shortness of breath", "wheezing",
    # Fever / Temperature
    "fever", "high temperature", "chills",
    # Head / Neuro
    "headache", "migraine", "dizziness", "fainting", "confusion",
    # Digestive
    "nausea", "vomiting", "diarrhea", "constipation", "bloating", "indigestion",
    # Skin
    "rash", "itching", "swelling", "redness",
    # General
    "fatigue", "weakness", "weight loss", "loss of appetite", "dehydration",
    "sore throat", "runny nose", "sneezing", "blurred vision", "palpitations",
    # Chronic
    "diabetes", "hypertension", "high blood pressure", "blood sugar",
]

def extract_symptoms(text: str) -> List[str]:
    if not text:
        return []
    lower_text = text.lower()
    # Multi-word symptoms first (longer match priority)
    sorted_symptoms = sorted(COMMON_SYMPTOMS, key=len, reverse=True)
    detected = [s for s in sorted_symptoms if s in lower_text]
    return detected
