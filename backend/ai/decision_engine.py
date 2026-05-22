HIGH_RISK_SYMPTOMS = {
    "chest pain", "shortness of breath", "breathing issue", "palpitations",
    "fainting", "confusion", "blurred vision",
}

MEDIUM_RISK_SYMPTOMS = {
    "fever", "headache", "dizziness", "vomiting", "nausea", "rash",
    "sore throat", "wheezing", "swelling", "high blood pressure", "hypertension",
}

def get_risk(symptoms: list) -> str:
    if not symptoms:
        return "LOW"
    symptoms_set = {s.lower().strip() for s in symptoms}

    # HIGH: any single high-risk symptom
    if symptoms_set & HIGH_RISK_SYMPTOMS:
        return "HIGH"

    # MEDIUM: any medium-risk symptom OR 2+ symptoms total
    if symptoms_set & MEDIUM_RISK_SYMPTOMS or len(symptoms_set) >= 2:
        return "MEDIUM"

    return "LOW"

def is_emergency(risk: str) -> bool:
    return risk.upper() == "HIGH"
