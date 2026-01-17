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
│   ├── challenge.html      # Challenge creation form
│   ├── challenges.html     # All challenges list with filters
│   ├── transactions.html
│   ├── import-transactions.html
│   └── ...
├── main.js              # App initialization & screen injection
├── navigation.js        # URL routing & back button support
├── api.js               # Backend API client wrapper
├── state.js             # Global app state
├── chat.js              # Chat UI logic & message handling
├── dashboard.js         # Dashboard carousel, challenge cards, modal
├── challenge.js         # Challenge creation form logic
├── challenges.js        # Challenges list, filters, detail modal
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

See [src/api.js](../../frontend/src/api.js) for all backend communication functions. Key patterns:
- All functions use `apiRequest()` for JWT injection and error handling
- Signed amounts (positive=savings, negative=spending) passed as numbers
- Filters (current/past/all) as query parameters

**Challenge API Functions** available in [src/api.js](../../frontend/src/api.js):
- `getChallenges(filter)` — List challenges (filter: current, past, all)
- `getChallengeDetail(challengeId)` — Get single challenge with history
- `createChallenge(data)` — Create new challenge
- `addChallengeUpdate(challengeId, amount, description)` — Add signed amount update

### Navigation & URL Routing
**Use `navigate()` for screen changes**, not `showScreen()`. This ensures the URL updates and the back button works.

**Pattern**:
- `navigate(screenName)` = user-initiated navigation → updates URL hash, enables back button
- `showScreen(screenId, setHistory)` = internal app logic only → no URL update

See [src/navigation.js](../../frontend/src/navigation.js) for implementation. Always use `navigate()` from user interactions (button clicks, sidebar links, etc.)

### Challenge UI Patterns

The app has three challenge-related screens/views. See [src/challenges.js](../../frontend/src/challenges.js) and [src/dashboard.js](../../frontend/src/dashboard.js) for implementation details:

1. **Dashboard Challenge Carousel** ([src/dashboard.js](../../frontend/src/dashboard.js)):
   - Swipeable carousel showing current challenges
   - Cards display: title, deadline, status badge, current amount with arrow, progress bar
   - Clicking card opens modal on dashboard (not navigation) for detail view
   - Balance widget shows total: "Saved: X₪" (green) or "Overspent: X₪" (red)
   - Auto-refreshes when returning to dashboard

2. **All Challenges Screen** ([src/challenges.html](../../frontend/src/screens/challenges.html) + [src/challenges.js](../../frontend/src/challenges.js)):
   - Filter tabs: Current / Past / All
   - Card grid showing matching challenges
   - Clicking card opens detail modal within this screen
   - New Challenge button navigates to creation form

3. **Challenge Detail Modal** (shared component on both screens):
   - Shows title, status badge, deadline, current amount, target
   - Updates timeline (newest first) with signed amounts and descriptions
   - Add update form (only for active challenges)
   - Close on background click or close button

**Key UI Details**:
- Status badges: On Track/Below Target (active), Completed/Failed (past)
- Amount arrows: ↑ green for positive (savings), ↓ red for negative (spending)
- Updates display signed amounts; frontend calculates from sum of all updates

### Component Patterns

**Page Initialization** (see [src/challenges.js](../../frontend/src/challenges.js) or similar modules):
- Export `initMyScreen()` function that sets up event listeners and loads initial data
- Called from [src/main.js](../../frontend/src/main.js) or [src/navigation.js](../../frontend/src/navigation.js) after DOM ready
- Always check element exists before binding events

**Event Handling with API**:
- Import API function from [src/api.js](../../frontend/src/api.js)
- Wrap calls in try/catch
- Update UI after successful response
- Show error message to user on failure

**DOM Rendering**:
- Use `innerHTML` with template literals for dynamic content
- Set `onclick` handlers directly on HTML elements or via event delegation
- Keep rendering functions pure (no side effects except DOM updates)

## Common Tasks

### Transaction List Pattern (Mobile-Friendly 2-Row Layout)
The transactions list uses a compact 2-row layout per transaction for optimal mobile readability. See [src/transactions.js](../../frontend/src/transactions.js) for implementation.

**Layout**:
- **Row 1**: Date | Description | Category Dropdown
- **Row 2**: Account/Metadata | Amount (color-coded: green for income, red for expenses)

**Key Patterns**:
- Row 1 has light border (slate-100) separating related rows
- Row 2 has darker border (slate-300) separating transactions
- Compact padding: py-1 throughout
- Amounts color-coded based on sign (income positive green, expenses negative red)

### Adding an API Call
1. Add function to [src/api.js](../../frontend/src/api.js) that calls `apiRequest()`
2. Import and use in your component
3. Handle errors with try/catch

### Adding a New Screen
1. Create `src/screens/my-screen.html` with root `<section id="screen-my-screen">`
2. Import in [src/main.js](../../frontend/src/main.js)
3. Add to `screenMap` in [src/navigation.js](../../frontend/src/navigation.js)
4. Create init function in relevant module or main.js
5. Call `navigate("my-screen")` to show it

### Updating Global State
1. Modify [src/state.js](../../frontend/src/state.js)
2. Update state directly: `state.myVar = value`
3. Re-render UI after state change (manually)

### Styling
- Use Tailwind CSS classes in HTML
- Avoid custom CSS unless necessary (animations, complex layouts)
- Keep custom CSS in `styles.css` minimal and well-documented

## Common Patterns to Follow

### Error Handling
Always wrap async calls in try/catch and show user-friendly error messages.

### Loading States
Disable buttons and show "Loading..." text during API calls. Use finally to re-enable after completion.

### Authentication Check
Auth is handled by [src/auth.js](../../frontend/src/auth.js). `checkAuthAndRedirect()` runs on page load and redirects logged-out users to login. Don't manually check tokens in components.

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

## Maintaining These Instructions

These instructions serve as **style guides and pattern references**, not comprehensive code documentation. Key principles for keeping them current:

### Code Examples vs References
- **Use code examples only for essential patterns** that can't be explained concisely (e.g., JSX-like rendering, event binding patterns)
- **Replace full code blocks with source file references** — e.g., instead of copying entire function code, link to [src/challenges.js](../../frontend/src/challenges.js) and describe what it does
- **Agents should read source code** for implementation details; instructions point them there

### Single Source of Truth
- **Keep actual implementations in source files**, not replicated in docs
- **Update code first**, then update references in instructions
- **Link to specific files** using markdown file paths: `[api.js](../../frontend/src/api.js)` for source references
- Never copy/paste code that will drift from reality

### Structure for New Features
When adding documentation for a new screen or feature:
1. **Create HTML file** in `src/screens/`
2. **Create/update JS module** in `src/` with init function
3. **Add API wrappers** to [src/api.js](../../frontend/src/api.js)
4. **Document in instructions**:
   - List new files in file organization section
   - Describe UI patterns and behavior
   - Link to implementation files
   - Show only critical patterns (data flow, key state updates, modal behavior)

### What to Document vs What to Link
| Should Document | Should Link To Source |
|---|---|
| Navigation patterns (navigate vs showScreen) | Full navigation.js implementation |
| API function signatures | Full function implementations |
| UI layout patterns (2-row, carousel, modal) | Full screen HTML/JS |
| State structure | Full state.js definitions |
| Event handling patterns | Complete event handler code |
| Styling classes & approach (Tailwind) | Full CSS/Tailwind usage |

### Keeping References Fresh
- When moving/renaming files, update all markdown links
- When adding screens, add to the file organization section
- When updating a component, update pattern description AND link to source
- Test that links resolve before submitting

