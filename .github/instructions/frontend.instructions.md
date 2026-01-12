---
applyTo: "frontend/**"
excludeAgent: ["code-review"]
---

# Frontend Instructions for Pixie

These instructions apply to all work in the `frontend/` directory.

## Frontend Architecture

### File Organization
```
frontend/src/
├── screens/              # HTML templates (one per view)
│   ├── login.html
│   ├── dashboard.html
│   ├── chat.html
│   ├── challenge.html
│   ├── transactions.html
│   ├── import-transactions.html
│   └── ...
├── main.js              # App initialization & screen injection
├── navigation.js        # URL routing & back button support
├── api.js               # Backend API client wrapper
├── state.js             # Global app state
├── chat.js              # Chat UI logic & message handling
├── dashboard.js         # Dashboard carousel & challenge display
├── challenge.js         # Challenge form logic (currently mock)
├── auth.js              # Login/register/auth logic
├── transactions.js      # Transactions UI & filtering
├── import-transactions.js # Import flow UI
├── budget.js            # Budget adjustment logic
├── notifications.js     # Notification handling
├── onboarding.js        # Onboarding flow
└── styles.css           # Minimal custom CSS (use Tailwind mostly)
```

### How Screens Work
1. HTML templates are stored in `src/screens/` as plain HTML files
2. `main.js` imports all screens using `import screenHtml from "./screens/screen-name.html?raw"`
3. At DOMContentLoaded, `main.js` injects all screen HTML into `#app-container`
4. Each screen has a unique `id="screen-*"` for CSS display toggling
5. Navigation uses `navigate(screenName)` to show/hide screens and update the URL hash

**When adding a new screen:**
1. Create `src/screens/my-screen.html` with a root `<section id="screen-my-screen">`
2. Import it in `main.js`: `import myScreenHtml from "./screens/my-screen.html?raw";`
3. Add to injection: `appContainer.innerHTML = ... + myScreenHtml + ...;`
4. Add to screenMap in `navigation.js`: `"my-screen": "screen-my-screen",`
5. Call `navigate("my-screen")` to show it

### State Management Pattern
- **No Redux/MobX** — Just a simple global object in `src/state.js`
- Example:
  ```javascript
  export const state = {
    screenStack: [],
    currentUser: null,
    challenges: [],
  };
  ```
- Update state directly: `state.currentUser = userData`
- No watchers/observers — manually update UI after state changes

### API Communication Pattern
**ALWAYS use `src/api.js`** — Never call `fetch()` directly in components.

```javascript
// ✅ CORRECT
import { apiRequest, createChatSession } from "./api.js";
const response = await apiRequest("/api/challenges");
const session = await createChatSession("New Chat");

// ❌ WRONG
const response = await fetch("/api/challenges");
```

The `api.js` wrapper handles:
- JWT token injection in headers
- CORS
- Error handling & 401 redirects to login
- Response parsing

### Navigation & URL Routing
**Use `navigate()` for screen changes**, not `showScreen()`. This ensures the URL updates and the back button works.

```javascript
// ✅ CORRECT: Use navigate() for user-initiated navigation
import { navigate } from "./navigation.js";
navigate("chat");  // Updates URL to #/chat

// ✅ OK: Use showScreen() internally only (for init, after auth checks, etc)
showScreen("screen-dashboard", false);  // No URL update, no history push

// ❌ WRONG: Using showScreen() for user actions breaks back button
button.onclick = () => showScreen("screen-chat", true);
```

**Recent Updates (Jan 12, 2026)**: 
- Transaction UI now uses compact 2-row layout for mobile readability
- Dashboard displays recent transactions from real API
- Chat and challenge forms use `navigate()` for proper back button support

### Component Patterns

#### Page Initialization
```javascript
export function initMyScreen() {
  const el = document.getElementById("my-screen");
  if (!el) return;
  
  // Bind event listeners
  el.querySelector("#my-button").onclick = handleClick;
  
  // Load initial data
  loadMyData();
}

// Called from main.js after DOM ready
```

#### Event Handling with API
```javascript
async function handleSave() {
  try {
    const data = { title: input.value };
    const result = await apiRequest("/api/endpoint", { method: "POST", body: data });
    
    // Update UI
    state.myData = result;
    renderMyData();
  } catch (error) {
    console.error("Save failed:", error);
    showErrorMessage("Failed to save. Please try again.");
  }
}
```

#### DOM Rendering
```javascript
function renderItems(items) {
  const container = document.getElementById("items-list");
  container.innerHTML = items.map(item => `
    <div class="item-card">
      <h3>${item.title}</h3>
      <button onclick="deleteItem(${item.id})">Delete</button>
    </div>
  `).join('');
}
```

## Common Tasks

### Transaction List Pattern (Mobile-Friendly 2-Row Layout)
The transactions list uses a compact 2-row layout per transaction for optimal mobile readability:

**Row 1**: Date | Description | Category Dropdown
**Row 2**: Account/Metadata | Amount (color-coded)

Example implementation:
```javascript
// Each transaction renders as 2 table rows
tbody.innerHTML = transactions.map(t => {
  const date = new Date(t.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const isIncome = t.amount > 0;
  
  return `
    <tr class="hover:bg-slate-50 border-b border-slate-100">
      <td class="px-3 py-1 w-20"><div class="text-xs font-medium">${date}</div></td>
      <td class="px-3 py-1"><div class="text-sm font-medium line-clamp-1">${t.description}</div></td>
      <td class="px-3 py-1">
        <select onchange="updateCategory(${t.id}, this.value)" class="text-xs border rounded px-2 py-0.5">
          <option>Category</option>
        </select>
      </td>
    </tr>
    <tr class="hover:bg-slate-50 border-b border-slate-300">
      <td colspan="2" class="px-3 py-1"><div class="text-xs text-slate-500">${t.account_name}</div></td>
      <td class="px-3 py-1 text-right"><span class="text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}">${isIncome ? '+' : ''}${Math.abs(t.amount).toFixed(2)}₪</span></td>
    </tr>
  `;
}).join('');
```

**Key Pattern Details**:
- Row 1 has light border (slate-100) separating related rows
- Row 2 has darker border (slate-300) separating different transactions
- Amounts are color-coded: green for income (+), red for expenses (-)
- Metadata (account_name, card_last_4, country, recurring) shown below description
- Compact padding: py-1 throughout, select dropdown py-0.5
- No confidence badges or source indicators (backend-only concerns)

### Adding an API Call
1. Add function to `frontend/src/api.js`:
   ```javascript
   export async function getMyData() {
     return apiRequest("/api/my-endpoint");
   }
   ```
2. Import and use in your component:
   ```javascript
   import { getMyData } from "./api.js";
   const data = await getMyData();
   ```

### Adding a New Screen
1. Create `src/screens/my-screen.html`
2. Import in `main.js`
3. Add to `screenMap` in `navigation.js`
4. Create init function in `my-screen.js` or relevant module
5. Call `navigate("my-screen")` to show it

### Updating Global State
1. Modify `src/state.js`
2. Update state directly in code: `state.myVar = value`
3. Re-render UI after state change (manually, not reactive)

### Styling
- Use Tailwind CSS classes in HTML
- Avoid custom CSS unless necessary (animations, complex layouts)
- Keep custom CSS in `styles.css` minimal and well-documented

## Common Patterns to Follow

### Error Handling
Always wrap async calls in try/catch:
```javascript
try {
  await apiRequest("/api/endpoint");
} catch (error) {
  console.error("Error:", error);
  // Show user-friendly message
}
```

### Loading States
```javascript
const button = document.getElementById("save-btn");
button.disabled = true;
button.textContent = "Saving...";

try {
  await apiRequest("/api/endpoint");
  button.textContent = "Saved!";
} finally {
  button.disabled = false;
}
```

### Authentication Check
Auth is handled by `src/auth.js`. On page load, `checkAuthAndRedirect()` runs and sends logged-out users to login. Don't manually check tokens in components; trust the auth system.

## Testing & Debugging

- **Browser DevTools**: F12 → Console to see logs and errors
- **Network Tab**: Check API requests and responses
- **localStorage**: Check `pixie_auth_token` is present after login
- **Component State**: Add `console.log(state)` to debug state issues

## Before Submitting

1. ✅ No direct `fetch()` calls — use `api.js` wrappers
2. ✅ New screens use `navigate()` for routing (URL-aware)
3. ✅ Error handling on all async/await calls
4. ✅ Manual testing in browser (login → navigate → check console)
5. ✅ No hardcoded user data (mock OK for demo, but flag for real API integration)

---

**Remember**: Frontend is Vanilla JS with no build artifacts. Keep it simple, use patterns from existing code, and trust the navigation system for routing.
