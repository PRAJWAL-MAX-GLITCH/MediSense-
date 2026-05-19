from response import get_response

def main():
    """Test the RAG response system with a sample medical query."""
    query = "I have fever and headache"

    print("=" * 50)
    print(f"  MediSense Health Assistant")
    print("=" * 50)
    print(f"\nYour symptoms: {query}\n")
    print("-" * 50)

    response = get_response(query)
    print(response)

    print("-" * 50)
    print("Disclaimer: This is AI-generated guidance, not a medical diagnosis.")
    print("=" * 50)

if __name__ == "__main__":
    main()
