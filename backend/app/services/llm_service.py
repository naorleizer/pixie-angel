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
from app.services.transaction_history_service import transaction_history

load_dotenv()

logger = logging.getLogger(__name__)

# Provider-specific wiring: allow selecting provider via LLM_PROVIDER and
# map common API key env names so LiteLLM can pick them up.
LLM_PROVIDER = os.getenv('LLM_PROVIDER', '').lower()
if LLM_PROVIDER in ('gemini', 'google'):
    gemini_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if gemini_key:
        os.environ['GEMINI_API_KEY'] = gemini_key
        os.environ['GOOGLE_API_KEY'] = gemini_key
elif LLM_PROVIDER in ('vertex', 'vertex_ai', 'google_vertex', 'vertexai'):
    project = os.getenv('VERTEXAI_PROJECT') or os.getenv('GOOGLE_CLOUD_PROJECT')
    location = os.getenv('VERTEXAI_LOCATION') or 'us-central1'
    credentials = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if project: os.environ['VERTEXAI_PROJECT'] = project
    if location: os.environ['VERTEXAI_LOCATION'] = location
    if credentials: os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials


# ===== Tool Registry Framework =====
TOOLS_REGISTRY = {
    "calculator": {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Perform mathematical calculations. \nSUPPORTED OPERATIONS:\n1. Standard Math: '+', '-', '*', '/', 'sqrt(x)', 'log(x)', etc.\n2. Financial Functions (use positional or keyword arguments):\n   - simple_interest(principal, rate, time)\n   - compound_interest(principal, rate, time, frequency=1)\n   - percentage_of(part, whole)\n   - percentage_change(old_val, new_val)\n\nNOTE: 'rate' should be a number like 5 for 5%. 'frequency' defaults to 1 (annual) if omitted.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The Python-syntax expression to evaluate. Examples: 'compound_interest(1000, 5, 10)', 'compound_interest(principal=1000, rate=5, time=10)', or '500 * 1.17'"
                    }
                },
                "required": ["expression"]
            }
        },
        "retry_limit": 1
    },
    "challenge_manager": {
        "type": "function",
        "function": {
            "name": "challenge_manager",
            "description": "Manage user savings/spending challenges. \nREQUIRED ARGS BY ACTION:\n- 'create': needs 'title', 'target_amount', 'end_date', optional 'description', 'type', 'color'.\n- 'add_update': needs 'challenge_id' (use ID from challenge list), 'amount' (positive=save, negative=spend), 'description' (REQUIRED).\n- 'delete'/'get_details': needs 'challenge_id' (use ID from challenge list). Delete performs a soft-delete (moves to Recycle Bin).\n- 'restore'/'purge': needs 'challenge_id'. Restore undoes soft-delete; purge permanently deletes.\n- 'list': optional 'filter' (current|past|all|deleted).",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["create", "add_update", "get_details", "list", "delete", "restore", "purge"],
                        "description": "Operation to perform"
                    },
                    "challenge_id": {
                        "type": "integer",
                        "description": "Target challenge ID (Required for add_update, get_details, delete)"
                    },
                    "title": {
                        "type": "string",
                        "description": "Challenge title (Required for create)"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount for 'add_update'. Positive adds to savings, negative deducts."
                    },
                    "target_amount": {
                        "type": "number",
                        "description": "Goal amount in local currency (Required for create)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "ISO 8601 date YYYY-MM-DD (Required for create)"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["spending_limit", "savings"],
                        "default": "spending_limit"
                    },
                    "description": {
                        "type": "string",
                        "description": "REQUIRED for 'add_update': reason or note for this transaction (e.g., 'Weekly groceries', 'Salary deposit'). Optional for 'create' action."
                    },
                    "color": {
                        "type": "string",
                        "description": "Optional color tag for UI (e.g. 'indigo', 'red', 'green')"
                    },
                    "filter": {
                        "type": "string",
                        "enum": ["current", "past", "all", "deleted"],
                        "default": "current"
                    }
                },
                "required": ["action"]
            }
        },
        "retry_limit": 1
    },
    "transaction_history": {
        "type": "function",
        "function": {
            "name": "transaction_history",
            "description": "Fetch and filter recent user transactions. Returns a list of transaction objects.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": { "type": "integer", "default": 20 },
                    "start_date": { "type": "string", "description": "ISO 8601 date" },
                    "end_date": { "type": "string", "description": "ISO 8601 date" },
                    "category": { "type": "string", "description": "Filter by category (e.g. 'Groceries', 'Transport')" },
                    "merchant_query": { "type": "string", "description": "Partial match for merchant name" },
                    "min_amount": { "type": "number" },
                    "max_amount": { "type": "number" },
                    "sort_by": { "type": "string", "enum": ["date", "amount", "category", "merchant"], "default": "date" },
                    "sort_order": { "type": "string", "enum": ["asc", "desc"], "default": "desc" }
                },
                "required": []
            }
        },
        "retry_limit": 0
    }
}


# ===== Persona Registry =====
# Define all available personas with their system prompt guidelines
PERSONAS = {
    "the_analyst": {
        "display_name": "The Analyst",
        "description": "Objective, academic, serious. Provides deep dives with tables and detailed breakdowns.",
        "prompt": """**Persona: The Analyst**

You approach financial analysis with logical precision and detailed transparency.

**Tone:** Objective, academic, and serious. Use neutral vocabulary.
**Structure:** Provide deep dives. Use tables for comparisons and bullet points for granular data. Explain the "Why" and "How" behind every insight.
**Approach:** Prioritize accuracy over speed. Give the user space to review the data by ending with: "I will leave these figures for your independent review."

Example: "Based on a 90-day analysis, your grocery spending has a variance of 15% compared to your goal. Here is the breakdown of the specific merchants contributing to this shift."
"""
    },
    "the_driver": {
        "display_name": "The Driver",
        "description": "Assertive, confident, results-focused. Efficiency and ROI focused.",
        "prompt": """**Persona: The Driver**
You are focused on efficiency, results, and bottom-line control.

**Tone:** Assertive, confident, and extremely concise. Use "Power Verbs" (Execute, Target, Win).
**Structure:** Start with the conclusion. Use short, punchy sentences. Present options as a "Mission" or "Decision" for the user to make.
**Approach:** Respect their time by removing all fluff. Focus on ROI (Return on Investment). End with: "Ready to execute?" or "Which option do you choose?"

Example: "Target: 500₪ savings. Status: 40% complete. Action: Cancel 2 unused subscriptions to hit the goal by Friday. Confirm?"
"""
    },
    "the_promoter": {
        "display_name": "The Promoter",
        "description": "Energetic, optimistic, visionary. Celebrates wins and focuses on dreams.",
        "prompt": """**Persona: The Promoter**

You are high energy, focused on vision, and the "Big Picture" of the user's financial dreams.

**Tone:** Energetic, charismatic, and very optimistic. Use emojis and inspiring adjectives.
**Structure:** Focus on the dream and the rewards. Skip technical details unless asked. Use storytelling to explain financial progress.
**Approach:** Start with a compliment or a celebration of a "Win." Frame every saving as a step toward an exciting experience. End with: "Let's make it happen!"

Example: "You're on fire! 🌟 That smart choice today puts you closer to your Paris trip. Imagine the view! Let's keep this momentum going for the rest of the week!"
"""
    },
"the_supportive": {
    "display_name": "The Supportive",
    "description": "Calm, encouraging, and clear. Reduces anxiety by offering context and manageable steps.",
    "prompt": """**Persona: The Supportive**

You are a calm, encouraging financial partner. Your goal is to reduce financial anxiety by providing clarity and manageable next steps.

**Core Tone Guidelines:**
* **Validating:** Acknowledge that money management can be stressful without being overly dramatic.
* **Partnership (The "Side-by-Side" Rule):** Use "We" when analyzing data (e.g., "Let's look at the numbers"). Use "You" when discussing assets or decisions (e.g., "Your savings goal"). Avoid claiming ownership of their money.
* **Calm Confidence:** Avoid alarmist language. Instead of "Warning: Overspending detected!", use "I noticed some higher activity than usual."

**Example Scenarios:**
* *Bad (Too Cringe):* "Hi! I feel like we should look at our spending. It's okay to be worried. How does looking at this graph make you feel?"
* *Good (Natural):* "I noticed the grocery budget is a bit tighter this month. That happens! I've spotted a few places where we can adjust to keep you on track. Want to see them?"
"""
}
}


def execute_tool(tool_name: str, arguments: Dict[str, Any], session_id: Optional[int] = None) -> Dict[str, Any]:
    """Execute a tool by name with given arguments."""
    if tool_name == "calculator":
        expression = arguments.get("expression", "")
        return calculator.calculate(expression)
    
    elif tool_name == "challenge_manager":
        if session_id is None:
            return {"status": "error", "result": None, "error_message": "Missing session context"}
        
        session = ChatSession.query.get(session_id)
        if not session:
            return {"status": "error", "result": None, "error_message": f"Session {session_id} not found"}
            
        return challenge_manager.execute(user_id=session.user_id, **arguments)
        
    elif tool_name == "transaction_history":
        if session_id is None:
            return {"status": "error", "result": None, "error_message": "Missing session context"}
            
        session = ChatSession.query.get(session_id)
        if not session:
            return {"status": "error", "result": None, "error_message": f"Session {session_id} not found"}
            
        return transaction_history.execute(user_id=session.user_id, **arguments)
        
    else:
        return {"status": "error", "result": None, "error_message": f"Unknown tool: {tool_name}"}


class LLMService:
    """Centralized service for LLM interactions using LiteLLM."""
    
    CONTEXT_MESSAGES = 50
    
    def __init__(self, model: Optional[str] = None, temperature: float = 0.7, max_tokens: int = 1000):
        provider = os.getenv('LLM_PROVIDER', '').lower()
        default_model = os.getenv('LLM_MODEL')
        
        if not model:
            if default_model:
                self.model = default_model
            else:
                if provider in ('gemini', 'google'):
                    self.model = 'gemini/gemini-2.5-flash'
                elif provider in ('vertex', 'vertex_ai'):
                    self.model = 'vertex_ai/gemini-1.5-flash-002'
                else:
                    self.model = 'gpt-4'
        else:
            self.model = model
            
        self.temperature = float(os.getenv('LLM_TEMPERATURE', temperature))
        self.max_tokens = int(os.getenv('LLM_MAX_TOKENS', max_tokens))

    def chat_with_session(self, session_id: int, user_message: str, system_prompt: Optional[str] = None, use_tools: bool = True, **kwargs) -> Dict[str, Any]:
        """Chat using a database session for history, with tool calling support.
        
        Returns:
            Dict with 'response' (str) and optional 'metadata' dict containing:
            - 'challenges_created': List of challenge IDs created during this conversation
        """
        session = ChatSession.query.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Build message history
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        history = session.messages.order_by(ChatMessage.timestamp.asc()).limit(self.CONTEXT_MESSAGES).all()
        for msg in history:
            # Skip tool messages - they'll be added dynamically as we process tool calls
            if msg.role == 'tool': 
                continue
            
            # Skip assistant messages with no content (these are tool call responses that were processed)
            # They're not needed in the next iteration since the tool results are included
            if msg.role == 'assistant' and not msg.content:
                continue
            
            messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": user_message})

        # Persist user message
        user_msg = ChatMessage(session_id=session_id, role='user', content=user_message)
        db.session.add(user_msg)
        db.session.flush()

        final_response = None
        max_iterations = 5
        iteration = 0
        
        # Track challenges created during tool execution
        challenges_created = []
        
        # Track widget tags from tool results to append to final response
        widget_tags = []
        
        logger.info(f"[Session {session_id}] Starting chat loop - use_tools={use_tools}")
        logger.info(f"[Session {session_id}] Model: {self.model}")
        logger.info(f"[Session {session_id}] Temperature: {self.temperature}, Max tokens: {self.max_tokens}")
        logger.info(f"[Session {session_id}] Initial message count: {len(messages)}")
        if use_tools:
            tool_names = [t['function']['name'] for t in TOOLS_REGISTRY.values()]
            logger.info(f"[Session {session_id}] Available tools: {tool_names}")
        
        while iteration < max_iterations:
            iteration += 1
            logger.info(f"[Session {session_id}] Iteration {iteration}/{max_iterations}")
            logger.debug(f"[Session {session_id}] Sending {len(messages)} messages to LLM")
            logger.debug(f"[Session {session_id}] Last message: role={messages[-1]['role']}, content_length={len(messages[-1].get('content', ''))}")
            
            # Log all messages for debugging
            for i, msg in enumerate(messages):
                role = msg.get('role', 'unknown')
                content_preview = str(msg.get('content', ''))[:200] if msg.get('content') else '[NO CONTENT]'
                has_tool_calls = bool(msg.get('tool_calls'))
                logger.debug(f"[Session {session_id}] Message {i}: role={role}, has_tool_calls={has_tool_calls}, content_preview={content_preview}")
            
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
            finish_reason = response.choices[0].finish_reason if hasattr(response.choices[0], 'finish_reason') else 'unknown'
            
            logger.info(f"[Session {session_id}] LLM response received - has_tool_calls={hasattr(response_message, 'tool_calls') and bool(response_message.tool_calls)}")
            logger.info(f"[Session {session_id}] finish_reason: {finish_reason}")
            logger.info(f"[Session {session_id}] response_message.content: {response_message.content if response_message.content else '[EMPTY/NULL]'}")
            logger.debug(f"[Session {session_id}] Completion tokens: {response.usage.completion_tokens if hasattr(response, 'usage') else 'unknown'}")
            
            # Check for Vertex AI safety blocks
            if hasattr(response, 'vertex_ai_safety_results') and response.vertex_ai_safety_results:
                logger.warning(f"[Session {session_id}] SAFETY RESULTS DETECTED: {response.vertex_ai_safety_results}")
            
            # Log the raw response for debugging
            if response_message.content is None or response_message.content == '':
                logger.warning(f"[Session {session_id}] EMPTY RESPONSE CONTENT DETECTED!")
                logger.error(f"[Session {session_id}] Model: {self.model} returned 0 tokens - this model may not support function calling properly")
                logger.error(f"[Session {session_id}] Consider switching to: 'vertex_ai/gemini-1.5-flash-002' or 'gemini/gemini-2.0-flash-exp'")
                logger.warning(f"[Session {session_id}] Response usage: {response.usage if hasattr(response, 'usage') else 'N/A'}")
                logger.debug(f"[Session {session_id}] Full response object: {response}")
                logger.debug(f"[Session {session_id}] Response message dict: {response_message.model_dump() if hasattr(response_message, 'model_dump') else str(response_message)}")
            
            if hasattr(response_message, 'tool_calls') and response_message.tool_calls:
                logger.info(f"[Session {session_id}] Processing {len(response_message.tool_calls)} tool calls")
                tool_calls_list = []
                for tool_call in response_message.tool_calls:
                    tool_calls_list.append({
                        "id": tool_call.id if hasattr(tool_call, 'id') else f"call_{iteration}_{tool_call.function.name}",
                        "type": "function",
                        "function": {
                            "name": tool_call.function.name,
                            "arguments": tool_call.function.arguments
                        }
                    })
                
                messages.append({
                    "role": "assistant",
                    "content": response_message.content or "",
                    "tool_calls": tool_calls_list
                })
                
                # Persist assistant step
                asst_msg = ChatMessage(
                    session_id=session_id,
                    role='assistant',
                    content=response_message.content or "",
                    metadata_json={"has_tool_calls": True}
                )
                db.session.add(asst_msg)
                db.session.flush()
                
                for idx, tool_call in enumerate(response_message.tool_calls):
                    tool_name = tool_call.function.name
                    tool_id = tool_calls_list[idx]["id"]
                    
                    try:
                        tool_args = json.loads(tool_call.function.arguments)
                        logger.info(f"[Session {session_id}] Executing tool '{tool_name}' with args: {tool_args}")
                        
                        tool_result = self._execute_tool_with_retry(tool_name, tool_args, session_id=session_id)
                        logger.info(f"[Session {session_id}] Tool '{tool_name}' returned status={tool_result.get('status')}")
                        
                        # Track created challenges
                        if tool_name == "challenge_manager" and tool_args.get("action") == "create" and tool_result.get("status") == "success":
                            challenge_data = tool_result.get("result")
                            if challenge_data and "id" in challenge_data:
                                challenges_created.append(challenge_data["id"])
                                logger.info(f"[Session {session_id}] Tracked challenge creation: ID {challenge_data['id']}")
                        
                        # Extract widget tags from tool result message
                        if tool_result.get("message"):
                            import re
                            widget_match = re.search(r'<CHALLENGE_WIDGET>.*?</CHALLENGE_WIDGET>', tool_result.get("message"), re.DOTALL)
                            if widget_match:
                                widget_tags.append(widget_match.group(0))
                                logger.info(f"[Session {session_id}] Extracted widget tag from {tool_name} result")
                        
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_id,
                            "content": json.dumps(tool_result)
                        })
                        
                        # Persist tool result
                        tool_msg = ChatMessage(
                            session_id=session_id,
                            role='tool',
                            content=json.dumps(tool_result),
                            metadata_json={"tool_name": tool_name, "tool_call_id": tool_id}
                        )
                        db.session.add(tool_msg)
                        db.session.flush()

                        if tool_result.get("status") == "success":
                            logger.debug(f"[Session {session_id}] Tool '{tool_name}' succeeded")
                        
                        # Log tool execution with full details for debugging
                        if tool_result.get("status") == "error":
                            logger.error(f"Tool '{tool_name}' failed: {tool_result.get('error_message')}")
                        else:
                            logger.info(f"Tool executed: {tool_name} - {tool_result.get('status')}")
                        
                    except Exception as e:
                        logger.error(f"[Session {session_id}] Tool execution error for '{tool_name}': {e}")
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_id,
                            "content": json.dumps({"status": "error", "error_message": str(e)})
                        })
            else:
                logger.info(f"[Session {session_id}] No tool calls in response - using LLM content directly")
                final_response = response_message.content
                logger.debug(f"[Session {session_id}] Final response set from LLM (len={len(final_response) if final_response else 0})")
                
                if not final_response:
                    logger.error(f"[Session {session_id}] ERROR: No tool calls AND no content in response!")
                    logger.error(f"[Session {session_id}] This usually means the LLM returned an empty response.")
                    logger.error(f"[Session {session_id}] Check if the model supports tool calling or if there's an API issue.")
                
                break
        
        # Determine which path we took to build the final response
        if final_response is None:
            logger.warning(f"[Session {session_id}] Iteration limit reached without final LLM response")
            logger.warning(f"[Session {session_id}] response_message.content available: {bool(response_message.content)}")
            # Use LLM's last message or a generic acknowledgment - NOT tool results
            final_response = response_message.content or "I've processed your request. Is there anything else you'd like to know?"
            logger.info(f"[Session {session_id}] Using safeguard response (len={len(final_response)})")
        else:
            logger.info(f"[Session {session_id}] Using final_response from LLM loop (len={len(final_response)})")
        
        # Append widget tags to final response
        if widget_tags:
            final_response = final_response + "\n\n" + "\n".join(widget_tags)
            logger.info(f"[Session {session_id}] Appended {len(widget_tags)} widget tag(s) to final response")
        # Persist final response
        logger.info(f"[Session {session_id}] Persisting final response (len={len(final_response)}) to database")
        final_msg = ChatMessage(session_id=session_id, role='assistant', content=final_response)
        db.session.add(final_msg)
        db.session.commit()
        
        logger.info(f"[Session {session_id}] Chat session complete - returning response to user")
        
        # Return response with metadata
        result = {"response": final_response}
        if challenges_created:
            result["metadata"] = {"challenges_created": challenges_created}
            logger.info(f"[Session {session_id}] Returning {len(challenges_created)} created challenge(s): {challenges_created}")
        
        return result

    def _execute_tool_with_retry(self, tool_name: str, arguments: Dict[str, Any], session_id: Optional[int] = None) -> Dict[str, Any]:
        """Execute tool with defined retry logic."""
        if tool_name not in TOOLS_REGISTRY:
            return {"status": "error", "error_message": f"Unknown tool: {tool_name}"}
        
        retry_limit = TOOLS_REGISTRY[tool_name].get("retry_limit", 0)
        last_error = None
        
        for attempt in range(retry_limit + 1):
            try:
                result = execute_tool(tool_name, arguments, session_id=session_id)
                if result.get("status") == "success":
                    return result
                last_error = result
                if attempt == retry_limit: return result
            except Exception as e:
                last_error = {"status": "error", "error_message": f"Attempt {attempt+1} failed: {str(e)}"}
                if attempt == retry_limit: return last_error
        
        return last_error

    # Helper methods (chat_with_system, get_persona_prompt, get_model_info) remain similar
    def chat_with_system(self, user_message: str, system_prompt: str, **kwargs) -> str:
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}]
        return completion(model=self.model, messages=messages, temperature=self.temperature, **kwargs).choices[0].message.content

    def chat_json(self, system_prompt: str, user_message: str, response_schema: Optional[Dict[str, Any]] = None, **kwargs) -> Any:
        """Call the model and enforce a JSON response via LiteLLM response_format.

        If response_schema is provided, it should have shape:
        {"name": "schema_name", "schema": <json schema dict>}.
        """
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}]

        if response_schema:
            response_format = {
                "type": "json_schema",
                "json_schema": {
                    "name": response_schema.get("name", "response"),
                    "schema": response_schema.get("schema", {}),
                    "strict": True,
                },
            }
        else:
            response_format = {"type": "json_object"}

        resp = completion(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            response_format=response_format,
            **kwargs,
        )

        msg = resp.choices[0].message
        # LiteLLM may surface parsed content directly
        parsed = getattr(msg, "parsed", None)
        if parsed is not None:
            return parsed

        content = getattr(msg, "content", None)
        if content:
            try:
                return json.loads(content)
            except Exception:
                pass
        return content

    def get_persona_prompt(self, persona_type: str) -> str:
        return PERSONAS.get(persona_type, PERSONAS['the_supportive'])['prompt']
        
    def get_model_info(self) -> Dict[str, Any]:
        return {"model": self.model, "temperature": self.temperature, "max_tokens": self.max_tokens}

llm = LLMService()