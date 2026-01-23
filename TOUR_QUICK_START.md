# Tour System Quick Start

## Test It Now

1. Start dev server: `cd frontend && npm run dev`
2. Navigate to Dashboard
3. Click **"?"** button (top-right)
4. Step through the tour → Click Next → Click Done

## Add a Tour to Your Page (2 Steps)

### Step 1: Create Config
```javascript
// frontend/src/tours/your-page-tour.js
export const yourPageTour = {
  title: "Your Page Tour",
  steps: [
    {
      target: "#button-id",           // The element to highlight
      title: "Button Name",           // Bold heading
      description: "What it does.",   // Friendly explanation
      position: "bottom"              // Where tooltip goes
    },
    {
      target: "#list-container",
      title: "Your Items",
      description: "All your data shows here.",
      position: "top"
    }
  ]
};
```

### Step 2: Register It
Edit `frontend/src/services/tour-service.js`:
```javascript
import { yourPageTour } from '../tours/your-page-tour.js';

const tourRegistry = {
  // ... existing tours
  'screen-your-page': yourPageTour,  // Add this line
};
```

**That's it!** Help button now shows your tour.

## Tips for Good Tours

- ✅ **2-3 steps** for simple pages, up to 6 for complex ones
- ✅ **Plain English**: "Save your progress" not "Persist state"
- ✅ **One idea per step**: Don't explain too much
- ✅ **Target interactive elements**: Buttons, inputs, important sections
- ✅ **Keep descriptions short**: 1-2 sentences max

## Common Selectors

```javascript
target: "#help-btn"              // ID
target: ".transaction-list"      // Class (first match)
target: "[data-testid='xyz']"    // Attribute
target: "section:first-child"    // CSS combinator
```

## Fallback Messages

If a page has no tour:
- User clicks help button
- App shows: "Help for this page is coming soon!"
- No error in console

## Mobile Magic (Built-In)

- Tooltips auto-position to bottom on phones (screen < 768px)
- Elements auto-scroll into view
- Large touch buttons (48px+)
- Responsive text sizing
- Works portrait & landscape

## Style Customization

Edit `frontend/src/styles.css`, section `/* Shepherd.js Tour Styling */`:

```css
.shepherd-theme-custom .shepherd-button.shepherd-button-primary {
  background-color: #0ea5e9;  /* Change button color */
}

.shepherd-theme-custom .shepherd-title {
  font-size: 1.2rem;          /* Change title size */
  color: #1e40af;
}
```

## Files to Know

| File | Purpose |
|------|---------|
| `tour-manager.js` | Core Shepherd wrapper (don't edit unless adding features) |
| `tour-service.js` | Tour registry + help handler (add new tours here) |
| `tours/*.js` | Tour configs (edit these!) |
| `styles.css` | Styling (customize colors/sizes here) |

## Troubleshooting

**Tour doesn't appear:**
- Is page ID in `tourRegistry`?
- Does tour config have steps?
- Do elements exist? (`document.querySelector(target)`)

**Wrong position on mobile:**
- It's automatic! Tours use smart positioning
- Clear cache + rebuild if position still wrong

**Text is too long:**
- Keep descriptions to 2 sentences max
- "Keep it short" rule prevents cutoff

---

**Need more help?** See `TOUR_SYSTEM_DOCS.md` for detailed guide.
