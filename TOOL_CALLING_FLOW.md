# Tool Calling Flow Diagram

## User Conversation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PIXIE CHAT WITH TOOLS                       │
└─────────────────────────────────────────────────────────────────┘

1. USER SENDS MESSAGE
   ┌──────────────────────────────────────┐
   │ "How much interest will I earn on    │
   │  $10,000 over 5 years at 3% annual?" │
   └──────────────────────────────────────┘
                      ↓

2. BACKEND RECEIVES REQUEST
   ┌──────────────────────────────────────────┐
   │ POST /chat/sessions/<id>/messages         │
   │ Content: user message                     │
   └──────────────────────────────────────────┘
                      ↓

3. LOAD CONTEXT
   ┌──────────────────────────────────────────┐
   │ - Load last 50 messages from DB           │
   │ - Add system prompt with tool description│
   │ - Add current user message               │
   └──────────────────────────────────────────┘
                      ↓

4. CALL GEMINI WITH TOOLS
   ┌──────────────────────────────────────────┐
   │ LiteLLM.completion(                       │
   │   model="gemini-2.5-flash",              │
   │   messages=[...],                         │
   │   tools=[calculator_schema],              │
   │   tool_choice="auto"                      │
   │ )                                         │
   └──────────────────────────────────────────┘
                      ↓
         Gemini decides to use tool ✓
                      ↓

5. EXTRACT TOOL CALL
   ┌──────────────────────────────────────────┐
   │ response.tool_calls = [                  │
   │   {                                       │
   │     id: "call_123",                      │
   │     function: "calculator",               │
   │     arguments: "{                         │
   │       \"expression\": \"10000*0.03*5\"    │
   │     }"                                    │
   │   }                                       │
   │ ]                                         │
   └──────────────────────────────────────────┘
                      ↓

6. EXECUTE CALCULATOR
   ┌──────────────────────────────────────────┐
   │ calculator.calculate("10000*0.03*5")     │
   │ Result: 1500                              │
   │ Response: {                               │
   │   "status": "success",                    │
   │   "result": 1500,                         │
   │   "error_message": null                   │
   │ }                                         │
   └──────────────────────────────────────────┘
                      ↓

7. SAVE TOOL RESULT TO DB
   ┌──────────────────────────────────────────┐
   │ ChatMessage(                              │
   │   role="tool",                            │
   │   content="{...result...}",               │
   │   metadata_json={                         │
   │     "tool_name": "calculator",            │
   │     "status": "success"                   │
   │   }                                       │
   │ )                                         │
   └──────────────────────────────────────────┘
                      ↓

8. FEED RESULT BACK TO GEMINI
   ┌──────────────────────────────────────────┐
   │ Call completion() again with:             │
   │ - Original messages                       │
   │ - Assistant's tool call request           │
   │ - Tool execution result                   │
   │ - No tools this time (get text response)  │
   └──────────────────────────────────────────┘
                      ↓
         Gemini returns text response ✓
                      ↓

9. SAVE FINAL RESPONSE
   ┌──────────────────────────────────────────┐
   │ ChatMessage(                              │
   │   role="assistant",                       │
   │   content="Based on the calculation,      │
   │   your $10,000 will earn $1,500 in       │
   │   interest over 5 years at 3% annual      │
   │   compound interest."                     │
   │ )                                         │
   └──────────────────────────────────────────┘
                      ↓

10. FILTER & RETURN TO USER
    ┌──────────────────────────────────────────┐
    │ API Response:                             │
    │ {                                         │
    │   "response": "Based on the calculation..│
    │   "messages": [                           │
    │     {"role": "user", "content": "..."},   │
    │     {"role": "assistant", "content": "..."} │
    │     (tool messages filtered out)          │
    │   ]                                       │
    │ }                                         │
    └──────────────────────────────────────────┘
                      ↓

11. DISPLAY TO USER
    ┌──────────────────────────────────────────┐
    │ ╔══════════════════════════════════════╗  │
    │ ║ USER: How much interest will I earn  ║  │
    │ ║ on $10,000 over 5 years at 3% annual?║  │
    │ ╚══════════════════════════════════════╝  │
    │                                           │
    │ ╔══════════════════════════════════════╗  │
    │ ║ PIXIE: Based on the calculation, your║  │
    │ ║ $10,000 will earn $1,500 in interest ║  │
    │ ║ over 5 years at 3% annual compound   ║  │
    │ ║ interest.                             ║  │
    │ ╚══════════════════════════════════════╝  │
    │                                           │
    │ (User never sees the calculator tool     │
    │  operations - completely transparent!)    │
    └──────────────────────────────────────────┘
```

## Database Message Storage

```
┌─────────────────────────────────────────────┐
│         DATABASE: chat_messages             │
├─────────────────────────────────────────────┤
│ id │ session_id │ role      │ content       │
├────┼────────────┼───────────┼───────────────┤
│ 1  │ 42         │ user      │ "How much..." │
├────┼────────────┼───────────┼───────────────┤
│ 2  │ 42         │ assistant │ "I'll calc..."│ ← Has metadata
│    │            │           │ metadata: {   │   with tool info
│    │            │           │   "has_tools" │
│    │            │           │ }             │
├────┼────────────┼───────────┼───────────────┤
│ 3  │ 42         │ tool      │ "{"status":..│ ← Filtered out
│    │            │           │ metadata: {   │   before API
│    │            │           │   "tool_name" │   response
│    │            │           │ }             │
├────┼────────────┼───────────┼───────────────┤
│ 4  │ 42         │ assistant │ "Based on..  │
│    │            │           │ interest..."  │
└────┴────────────┴───────────┴───────────────┘

FRONTEND API RESPONSE FILTERING:
─────────────────────────────────

messages = [msg for msg in all_messages if msg.role != 'tool']

Result:
  - Message 1 (user) ✓ included
  - Message 2 (assistant) ✓ included  
  - Message 3 (tool) ✗ filtered out
  - Message 4 (assistant) ✓ included

User sees: Natural conversation flow without tool implementation details
```

## Tool Registry Architecture

```
┌────────────────────────────────────────────────────────┐
│                   TOOLS_REGISTRY                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  "calculator"                                         │
│  ├── type: "function"                                │
│  ├── function:                                        │
│  │   ├── name: "calculator"                           │
│  │   ├── description: "Perform math calculations..."  │
│  │   └── parameters:                                  │
│  │       ├── type: "object"                           │
│  │       └── properties:                              │
│  │           └── expression (string)                  │
│  └── retry_limit: 0                                  │
│                                                        │
│  "challenge_manager" (Future)                         │
│  ├── type: "function"                                │
│  ├── function:                                        │
│  │   ├── name: "challenge_manager"                    │
│  │   ├── description: "Create/update challenges..."   │
│  │   └── parameters: {...}                            │
│  └── retry_limit: 1                                  │
│                                                        │
│  "budget_advisor" (Future)                            │
│  ├── type: "function"                                │
│  ├── function: {...}                                 │
│  └── retry_limit: 2                                  │
│                                                        │
└────────────────────────────────────────────────────────┘

Adding New Tools:
  1. Add to TOOLS_REGISTRY dict
  2. Add handler in execute_tool()
  3. Create corresponding service file
```

## Error Handling Flow

```
CALCULATOR EXECUTION
│
├─ Expression Valid?
│  ├─ YES → Evaluate with numexpr
│  │  ├─ Success → Return {status: "success", result: value}
│  │  └─ Error (div by 0, etc) → Return {status: "error", error_message: "..."}
│  └─ NO → Return {status: "error", error_message: "Invalid syntax"}
│
└─ Result saved to DB with metadata
   └─ Logged in application logs
   └─ LLM sees error and handles naturally
```

## Context Window & Message Management

```
CHAT HISTORY (Database)
┌───────────────────────┐
│ Message 1             │
│ Message 2             │
│ ...                   │
│ Message 47            │
│ Message 48            │
│ Message 49            │
│ Message 50 ← LIMIT    │
└───────────────────────┘
      ↓
Only last 50 messages loaded into context
      ↓
INCLUDES: All message types (user, assistant, system, tool)
      ↓
SENT TO LLM: Full context for decision-making
      ↓
API RESPONSE: Tool messages filtered out
```

## Comparison: Before vs After Tool Calling

```
BEFORE IMPLEMENTATION:
─────────────────────
User: "10000 * 0.03 * 5"
Pixie: "That would be 1500. Let me calculate...
       10000 times 0.03 is 300, times 5 is 1500."
       (LLM tries to do math, may make errors)

AFTER IMPLEMENTATION:
───────────────────
User: "10000 * 0.03 * 5"
Pixie: "Let me calculate that for you..."
       [Uses calculator tool]
       "The result is exactly 1500."
       (Accurate, fast, verifiable)
```

## Tool Call Retry Mechanism

```
EXECUTE_TOOL_WITH_RETRY(tool_name, arguments)
│
├─ Get retry_limit from TOOLS_REGISTRY[tool_name]
│
├─ FOR attempt in range(retry_limit + 1):
│  │
│  ├─ Try:
│  │  └─ result = execute_tool(tool_name, arguments)
│  │
│  ├─ If result.status == "success":
│  │  └─ RETURN result immediately
│  │
│  └─ If attempt < retry_limit:
│     └─ Continue to next attempt
│
└─ RETURN last error (after all retries exhausted)

Example: calculator (retry_limit=0)
  - 1 attempt only
  - Fails? Returns error immediately
  - Perfect for local tools

Example: external_api (retry_limit=3)
  - Up to 4 attempts
  - Transient failures handled automatically
  - Reliable for network operations
```

---

**Key Insight**: The tool calling loop is completely transparent to users - they see clean conversation, accurate calculations, and natural responses. All the orchestration happens behind the scenes!
