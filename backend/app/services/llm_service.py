"""
LLM Service - Central interface for LiteLLM communication
Provides a unified API for interacting with multiple LLM providers
Includes tool calling support for calculator and future extensible tools
"""
import os
import json
import logging
from typing import List, Dict, Optional, Any
from litellm import completion, acompletion
from dotenv import load_dotenv
from app.extensions import db
from app.models.chat import ChatSession, ChatMessage
from app.services.calculator_service import calculator
from app.services.challenge_manager_service import challenge_manager

load_dotenv()

logger = logging.getLogger(__name__)

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


# ===== Tool Registry Framework =====
# Define all available tools with their schemas and retry limits

TOOLS_REGISTRY = {
    "calculator": {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Perform mathematical and financial calculations. Supports basic arithmetic (+, -, *, /, %, **), math functions (sqrt, abs, sin, cos, tan, log, exp, ceil, floor), and financial calculations (percentage_of, percentage_change, compound_interest, simple_interest).",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression to evaluate (e.g., '10 + 5', 'sqrt(100)', '150 * 0.15')"
                    }
                },
                "required": ["expression"]
            }
        },
        "retry_limit": 0  # Local tool, no retries needed
    },
    "challenge_manager": {
        "type": "function",
        "function": {
            "name": "challenge_manager",
            "description": "Manage user savings/spending challenges: create new challenges, add savings/spending updates, list challenges, and get challenge details with update history.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["create", "add_update", "get_details", "list"],
                        "description": "Operation to perform"
                    },
                    "challenge_id": {
                        "type": "integer",
                        "description": "Target challenge ID (required for add_update and get_details)"
                    },
                    "title": {
                        "type": "string",
                        "description": "Challenge title (required for create)"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description for challenge or required description for add_update"
                    },
                    "type": {
                        "type": "string",
                        "description": "Challenge type (e.g., spending_limit, savings)",
                        "default": "spending_limit"
                    },
                    "target_amount": {
                        "type": "number",
                        "description": "Target amount in shekels (required for create)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date in ISO format (YYYY-MM-DD or full ISO)"
                    },
                    "color": {
                        "type": "string",
                        "description": "Optional color tag for UI",
                        "default": "indigo"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Signed update amount (positive=savings, negative=spending) for add_update"
                    },
                    "filter": {
                        "type": "string",
                        "enum": ["current", "past", "all"],
                        "description": "Filter for list action"
                    }
                },
                "required": ["action"]
            }
        },
        "retry_limit": 1
    }
}


def execute_tool(tool_name: str, arguments: Dict[str, Any], session_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Execute a tool by name with given arguments.
    
    Args:
        tool_name: Name of the tool to execute
        arguments: Arguments to pass to the tool
    
    Returns:
        Tool execution result as structured JSON
    """
    if tool_name == "calculator":
        expression = arguments.get("expression", "")
        return calculator.calculate(expression)
    elif tool_name == "challenge_manager":
        # Derive user_id securely from the session
        if session_id is None:
            return {
                "status": "error",
                "result": None,
                "error_message": "Missing session context for challenge_manager",
                "error_code": "MISSING_SESSION"
            }

        session = ChatSession.query.get(session_id)
        if not session:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Session {session_id} not found",
                "error_code": "SESSION_NOT_FOUND"
            }

        user_id = session.user_id
        return challenge_manager.execute(user_id=user_id, **arguments)
    else:
        return {
            "status": "error",
            "result": None,
            "error_message": f"Unknown tool: {tool_name}"
        }


class LLMService:
    """
    Centralized service for LLM interactions using LiteLLM.
    Supports multiple providers: OpenAI, Anthropic, Azure, Cohere, etc.
    Includes tool calling support for calculator and extensible future tools.
    """
    
    # Context window configuration
    CONTEXT_MESSAGES = 50  # Last 50 messages for context
    MAX_TOOL_CALLS = 10    # Maximum tool calls per conversation turn
    
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
        use_tools: bool = False,
        **kwargs
    ) -> str:
        """
        Send a chat completion request to the LLM with optional tool calling support.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max tokens
            use_tools: Enable tool calling (default False)
            **kwargs: Additional parameters for completion
        
        Returns:
            The LLM's text response
        """
        completion_kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens,
            **kwargs
        }
        
        # Add tools if enabled
        if use_tools:
            completion_kwargs["tools"] = list(TOOLS_REGISTRY.values())
            completion_kwargs["tool_choice"] = "auto"
        
        response = completion(**completion_kwargs)
        
        return response.choices[0].message.content if response.choices[0].message.content else ""
    
    def chat_with_session(
        self,
        session_id: int,
        user_message: str,
        system_prompt: Optional[str] = None,
        use_tools: bool = True,
        **kwargs
    ) -> str:
        """
        Chat using a database session for history, with tool calling support.
        
        Implements the tool calling loop:
        1. Get context from last CONTEXT_MESSAGES messages
        2. Send messages with tools to LLM
        3. If LLM requests tool calls, execute them with retry logic
        4. Send tool results back to LLM
        5. Repeat until LLM returns text response
        6. Save all messages to database (excluding tool messages from user view)
        
        Args:
            session_id: Chat session ID
            user_message: User's message
            system_prompt: Optional custom system prompt
            use_tools: Enable tool calling (default True)
            **kwargs: Additional parameters
        
        Returns:
            The LLM's final text response
        """
        session = ChatSession.query.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Build message history from database
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # Get last CONTEXT_MESSAGES for context
        # NOTE: We filter out tool messages because they're only valid within a single conversation turn
        # when paired with their corresponding tool_calls array. When reloading from DB, we don't have
        # that array, so including them would cause Gemini to reject the messages as orphaned tool responses.
        history = session.messages.order_by(ChatMessage.timestamp.asc()).limit(self.CONTEXT_MESSAGES).all()
        for msg in history:
            # Skip tool messages - they don't belong in subsequent conversation turns
            if msg.role == 'tool':
                continue
            # Include user, assistant, and system messages
            messages.append({"role": msg.role, "content": msg.content})

        # Add the current user message
        messages.append({"role": "user", "content": user_message})

        # Save user message to database
        user_msg = ChatMessage(session_id=session_id, role='user', content=user_message)
        db.session.add(user_msg)
        db.session.flush()  # Flush to get ID but don't commit yet

        # Tool calling loop
        final_response = None
        last_tool_success_message = None
        tool_call_count = 0
        max_iterations = 5  # Prevent infinite loops
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            
            # Get LLM response with tool support
            response = completion(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                tools=list(TOOLS_REGISTRY.values()) if use_tools else None,
                tool_choice="auto" if use_tools else None,
                **kwargs
            )
            
            response_message = response.choices[0].message
            
            # Check if LLM wants to call tools
            if hasattr(response_message, 'tool_calls') and response_message.tool_calls:
                # Construct tool_calls array for the message (needed by Gemini to match tool responses)
                tool_calls_list = []
                for tool_call in response_message.tool_calls:
                    tool_calls_list.append({
                        "id": tool_call.id if hasattr(tool_call, 'id') else f"call_{tool_call_count + len(tool_calls_list)}",
                        "type": "function",
                        "function": {
                            "name": tool_call.function.name,
                            "arguments": tool_call.function.arguments
                        }
                    })
                
                # Append assistant message with tool calls to conversation
                # IMPORTANT: Must include tool_calls array so Gemini can match tool responses
                messages.append({
                    "role": "assistant",
                    "content": response_message.content or "",
                    "tool_calls": tool_calls_list
                })
                
                # Save assistant message with tool metadata
                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role='assistant',
                    content=response_message.content or "",
                    metadata_json={
                        "has_tool_calls": True,
                        "tool_call_count": len(response_message.tool_calls)
                    }
                )
                db.session.add(assistant_msg)
                db.session.flush()
                
                # Execute each tool call
                for idx, tool_call in enumerate(response_message.tool_calls):
                    tool_call_count += 1
                    tool_name = tool_call.function.name
                    # Use the same ID from the tool_calls_list we constructed
                    tool_id = tool_calls_list[idx]["id"]
                    
                    try:
                        # Parse tool arguments
                        tool_args = json.loads(tool_call.function.arguments)
                        
                        # Execute tool with retry logic
                        tool_result = self._execute_tool_with_retry(tool_name, tool_args, session_id=session_id)
                        
                        # Append tool result to conversation (following LiteLLM/Gemini format)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_id,  # Must match the tool call ID from assistant message
                            "content": json.dumps(tool_result)
                        })
                        
                        # Save tool result message to database
                        tool_msg = ChatMessage(
                            session_id=session_id,
                            role='tool',
                            content=json.dumps(tool_result),
                            metadata_json={
                                "tool_name": tool_name,
                                "tool_call_id": tool_id,
                                "status": tool_result.get("status", "unknown")
                            }
                        )
                        db.session.add(tool_msg)
                        db.session.flush()

                        # Capture a human-readable success message to use as fallback reply
                        if tool_result.get("status") == "success":
                            msg_text = tool_result.get("message")
                            if isinstance(msg_text, str) and msg_text.strip():
                                last_tool_success_message = msg_text.strip()
                        
                        logger.info(f"Tool executed: {tool_name} - {tool_result.get('status', 'unknown')}")
                        
                    except json.JSONDecodeError as e:
                        error_msg = f"Failed to parse tool arguments: {str(e)}"
                        logger.error(error_msg)
                        
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_id,
                            "content": json.dumps({
                                "status": "error",
                                "result": None,
                                "error_message": error_msg
                            })
                        })
                    except Exception as e:
                        error_msg = f"Tool execution error: {str(e)}"
                        logger.error(error_msg)
                        
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_id,
                            "content": json.dumps({
                                "status": "error",
                                "result": None,
                                "error_message": error_msg
                            })
                        })
            else:
                # LLM returned a text response (no tool calls)
                final_response = response_message.content
                break
        
        # If we hit max iterations without a response
        if final_response is None:
            # Prefer a descriptive tool success message if available
            if last_tool_success_message:
                final_response = last_tool_success_message
            else:
                final_response = response_message.content or "I encountered an issue processing your request. Please try again."
        
        # Save final assistant response
        assistant_msg = ChatMessage(session_id=session_id, role='assistant', content=final_response)
        db.session.add(assistant_msg)
        db.session.commit()

        return final_response
    
    def _execute_tool_with_retry(self, tool_name: str, arguments: Dict[str, Any], session_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute a tool with retry logic based on tool configuration.
        
        Args:
            tool_name: Name of the tool to execute
            arguments: Arguments to pass to the tool
        
        Returns:
            Tool execution result
        """
        if tool_name not in TOOLS_REGISTRY:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Unknown tool: {tool_name}"
            }
        
        tool_config = TOOLS_REGISTRY[tool_name]
        retry_limit = tool_config.get("retry_limit", 0)
        
        last_error = None
        for attempt in range(retry_limit + 1):
            try:
                result = execute_tool(tool_name, arguments, session_id=session_id)
                
                # If execution was successful, return immediately
                if result.get("status") == "success":
                    return result
                
                # If it's an error but not retryable, return it
                last_error = result
                if attempt == retry_limit:
                    return result
                
                # Otherwise, retry on next iteration
            except Exception as e:
                last_error = {
                    "status": "error",
                    "result": None,
                    "error_message": f"Attempt {attempt + 1} failed: {str(e)}"
                }
                if attempt == retry_limit:
                    return last_error
        
        return last_error or {
            "status": "error",
            "result": None,
            "error_message": "Tool execution failed"
        }

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
