"""
LLM Service - Central interface for LiteLLM communication
Provides a unified API for interacting with multiple LLM providers
"""
import os
from typing import List, Dict, Optional, Any
from litellm import completion, acompletion
from dotenv import load_dotenv
from app.extensions import db
from app.models.chat import ChatSession, ChatMessage

load_dotenv()

# Provider-specific wiring: allow selecting provider via LLM_PROVIDER and
# map common API key env names so LiteLLM can pick them up.
LLM_PROVIDER = os.getenv('LLM_PROVIDER', '').lower()
if LLM_PROVIDER in ('gemini', 'google'):
    # If user provided a GEMINI_API_KEY, also expose it as GOOGLE_API_KEY
    # so downstream libraries that expect that variable can find it.
    gemini_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if gemini_key:
        os.environ['GEMINI_API_KEY'] = gemini_key
        os.environ['GOOGLE_API_KEY'] = gemini_key


class LLMService:
    """
    Centralized service for LLM interactions using LiteLLM.
    Supports multiple providers: OpenAI, Anthropic, Azure, Cohere, etc.
    """
    
    def __init__(
        self,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ):
        """
        Initialize the LLM service.
        
        Args:
            model: LLM model name (e.g., 'gpt-4', 'claude-3-opus-20240229', 'gpt-3.5-turbo')
            temperature: Response randomness (0.0 to 1.0)
            max_tokens: Maximum tokens in response
        """
        # Allow provider-specific default model selection
        provider = os.getenv('LLM_PROVIDER', '').lower()
        default_model = os.getenv('LLM_MODEL')
        if not model:
            if default_model:
                self.model = default_model
            else:
                if provider in ('gemini', 'google'):
                    # Use Gemini Flash 2.0 as a sensible default for Gemini
                    self.model = 'gemini/gemini-2.5-flash'
                else:
                    self.model = 'gpt-4'
        else:
            self.model = model
        self.temperature = float(os.getenv('LLM_TEMPERATURE', temperature))
        self.max_tokens = int(os.getenv('LLM_MAX_TOKENS', max_tokens))
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        Send a chat completion request to the LLM.
        """
        response = completion(
            model=self.model,
            messages=messages,
            temperature=temperature or self.temperature,
            max_tokens=max_tokens or self.max_tokens,
            **kwargs
        )
        
        return response.choices[0].message.content
    
    def chat_with_session(
        self,
        session_id: int,
        user_message: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Chat using a database session for history.
        """
        session = ChatSession.query.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Build message history (excluding current user message from the DB query)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # Get last 10 messages for context
        history = session.messages.order_by(ChatMessage.timestamp.asc()).limit(10).all()
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})

        # Add the current user message explicitly to the in-memory context
        messages.append({"role": "user", "content": user_message})

        # Save user message to the database
        user_msg = ChatMessage(session_id=session_id, role='user', content=user_message)
        db.session.add(user_msg)
        # Get LLM response
        response_content = self.chat(messages, **kwargs)

        # Save assistant message
        assistant_msg = ChatMessage(session_id=session_id, role='assistant', content=response_content)
        db.session.add(assistant_msg)
        db.session.commit()

        return response_content

    def chat_with_system(
        self,
        user_message: str,
        system_prompt: str,
        **kwargs
    ) -> str:

        """
        Convenience method for chat with a system prompt.
        
        Args:
            user_message: The user's message
            system_prompt: System prompt to set context
            **kwargs: Additional parameters
        
        Returns:
            The LLM's response
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        return self.chat(messages, **kwargs)
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get current configuration info.
        
        Returns:
            Dictionary with model settings
        """
        return {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens
        }


# Singleton instance for easy import
llm = LLMService()


# Example usage functions for different Pixie features

def generate_budget_advice(spending_data: Dict[str, Any]) -> str:
    """
    Generate personalized budget advice based on spending data.
    
    Args:
        spending_data: Dict with spending patterns, goals, etc.
    
    Returns:
        LLM-generated budget advice
    """
    system_prompt = """You are Pixie, a friendly AI money coach. 
    You help users make smart financial decisions with empathy and positivity.
    Always be encouraging and provide actionable advice."""
    
    user_message = f"""Based on this spending data, provide budget advice:
    {spending_data}
    
    Give 2-3 specific, actionable suggestions."""
    
    return llm.chat_with_system(user_message, system_prompt)


def generate_challenge_suggestions(goal: str, timeframe: str, budget: float) -> str:
    """
    Generate creative challenge ideas for a savings goal.
    
    Args:
        goal: The savings goal description
        timeframe: Time period (e.g., "2 months")
        budget: Target amount
    
    Returns:
        LLM-generated challenge suggestions
    """
    system_prompt = """You are Pixie, an AI money coach who makes saving fun.
    Create creative, achievable savings challenges with specific trade-offs."""
    
    user_message = f"""Create a savings plan for:
    Goal: {goal}
    Timeframe: {timeframe}
    Target: {budget}₪
    
    Suggest 2-3 specific spending adjustments to reach this goal."""
    
    return llm.chat_with_system(user_message, system_prompt)


def analyze_spending_alert(transaction: Dict[str, Any], context: Dict[str, Any]) -> str:
    """
    Generate a proactive spending alert with adjustment options.
    
    Args:
        transaction: Recent transaction details
        context: User's goals, budget, patterns
    
    Returns:
        Alert message with suggested adjustments
    """
    system_prompt = """You are Pixie, a proactive money coach.
    When users overspend, gently alert them and suggest 2 specific trade-offs
    that fit their lifestyle and goals."""
    
    user_message = f"""Transaction: {transaction}
    Context: {context}
    
    Create a friendly alert with 2 specific adjustment options."""
    
    return llm.chat_with_system(user_message, system_prompt)
