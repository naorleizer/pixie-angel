# Test the LLM service
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.llm_service import llm


def test_basic_chat():
    """Test basic chat functionality"""
    print("Testing LLM Service...")
    print(f"Model: {llm.model}")
    print(f"Temperature: {llm.temperature}")
    print(f"Max Tokens: {llm.max_tokens}\n")
    
    try:
        response = llm.chat_with_system(
            user_message="Hello! Can you help me save money?",
            system_prompt="You are Pixie, a friendly AI money coach. Be brief and encouraging."
        )
        print("✓ LLM Response:")
        print(response)
        print("\n✓ Test successful!")
        
    except Exception as e:
        print(f"✗ Test failed: {str(e)}")
        print("\nMake sure you have:")
        print("1. Created a .env file (copy from .env.example)")
        print("2. Added your API key (e.g., OPENAI_API_KEY)")
        print("3. Installed dependencies: pip install -r requirements.txt")

if __name__ == '__main__':
    test_basic_chat()
