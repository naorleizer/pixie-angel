# Shepherd.js Tour System Documentation

## Overview

The tour system uses **Shepherd.js** to provide interactive, mobile-friendly walkthroughs for each page. Users can click the **"?" help button** in the top-right corner to start a guided tour of the current page.

## Architecture

```
frontend/src/
├── services/
│   ├── tour-manager.js        # Core Shepherd wrapper
│   └── tour-service.js        # Tour registry & help handler
├── tours/
│   ├── dashboard-tour.js
│   ├── chat-tour.js
│   ├── challenges-tour.js
│   └── transactions-tour.js
└── styles.css                 # Mobile-optimized tour styling
```

## How It Works

1. **User clicks the "?" button** → `openHelp()` is called
2. **Tour service detects current page** → Looks up tour configuration
3. **Shepherd displays tour steps** → Shows highlights + tooltips
4. **User navigates** → Back, Next, Skip, or Done buttons
5. **Tour ends** → Modal overlay closes, normal interaction resumes

## Creating a New Tour

### Step 1: Create Tour Configuration

Create a new file in `frontend/src/tours/`:

```javascript
// tours/profile-tour.js
export const profileTour = {
  title: "Profile Tour",
  steps: [
    {
      target: "#profile-name",
      title: "Your Name",
      description: "Update your personal information here.",
      position: "bottom"
    },
    {
      target: "#profile-email",
      title: "Email Address",
      description: "We use this to send you important updates.",
      position: "bottom"
    },
    {
      target: "#profile-avatar",
      title: "Profile Picture",
      description: "Add a photo so friends recognize you.",
      position: "top"
    }
  ]
};
```

### Step 2: Register Tour in Service

Edit `frontend/src/services/tour-service.js` and add to `tourRegistry`:

```javascript
import { profileTour } from '../tours/profile-tour.js';

const tourRegistry = {
  // ... other tours
  'screen-profile': profileTour,  // Map page ID to tour config
};
```

### Step 3: Test

1. Navigate to your page
2. Click the **"?"** help button
3. Your tour should start!

## Tour Configuration Format

Each tour is an object with:

```javascript
{
  title: "Friendly Name",          // For internal reference
  steps: [
    {
      target: "#element-id",       // CSS selector for element to highlight
      title: "Step Title",         // Bold title shown in tooltip
      description: "Help text",    // Plain English explanation (2-3 sentences max)
      position: "bottom"|"top"     // Where tooltip appears; auto-adjusted for mobile
    },
    // ... more steps
  ]
}
```

### Best Practices

✅ **Do:**
- Use **clear, friendly language** — "Save your progress" not "Commit changes"
- Keep descriptions **2-3 sentences max**
- Target **high-value UI elements** only (4-6 steps per tour)
- Use **human-readable IDs** so steps are easy to maintain

❌ **Avoid:**
- Technical jargon or abbreviations
- Vague instructions ("Click something")
- Targeting hidden elements or elements that move

## Mobile Considerations

The system automatically handles:
- ✅ **Auto-positioning** tooltips to avoid cutoff
- ✅ **Scroll-to-view** for off-screen elements
- ✅ **Touch-friendly buttons** (48px+ minimum)
- ✅ **Responsive text** sizing
- ✅ **Portrait & landscape** orientation support

## Customizing Tour Styling

Edit `frontend/src/styles.css` in the `/* Shepherd.js Tour Styling */` section:

```css
.shepherd-theme-custom .shepherd-button.shepherd-button-primary {
  background-color: var(--fa-success);  /* Change button color */
  color: white;
}

.shepherd-theme-custom .shepherd-title {
  font-size: 1.125rem;                  /* Change title size */
  color: var(--fa-primary);
}
```

## Advanced Usage

### Programmatically Start a Tour

```javascript
import { tourManager } from './services/tour-manager.js';
import { dashboardTour } from './tours/dashboard-tour.js';

// Start dashboard tour manually
tourManager.startTour(dashboardTour);
```

### End a Tour

```javascript
tourManager.endTour();
```

### Check if Tour is Active

```javascript
if (tourManager.isActive()) {
  // Tour is currently running
}
```

### Register Tour Dynamically

```javascript
import { registerTour } from './services/tour-service.js';

registerTour('screen-my-page', myPageTour);
```

## Troubleshooting

### Tour doesn't appear when help button is clicked

1. **Check page ID matches** — Inspect `<section id="screen-xxx">` and ensure it's in `tourRegistry`
2. **Verify tour config** — Make sure `steps` array has at least one step
3. **Check element selectors** — Use DevTools to verify target elements exist (`document.querySelector('...')`)

### Tooltip position is wrong on mobile

- This is automatically handled! Tooltips reposition to `bottom` on screens < 768px
- If an element is too close to viewport bottom, scroll happens automatically

### Next/Back buttons don't work

- Ensure you're using the latest Shepherd.js version
- Clear browser cache and rebuild (`npm run build`)

## Example: Chat Tour

```javascript
// tours/chat-tour.js
export const chatTour = {
  title: "Chat Tour",
  steps: [
    {
      target: "#chat-messages-container",
      title: "Your Conversations",
      description: "See all messages between you and Pixie. She remembers your financial goals!",
      position: "bottom"
    },
    {
      target: "#chat-input-form",
      title: "Ask Pixie Anything",
      description: "Tell her about your finances. Ask for advice. She's always learning.",
      position: "top"
    }
  ]
};
```

## Performance Notes

- Shepherd.js is ~6KB gzipped (included in your bundle)
- Tours load on-demand when help button is clicked
- No impact on page load time
- Minimal memory footprint

## Browser Support

Works on all modern browsers (Chrome, Firefox, Safari, Edge) including mobile browsers.
