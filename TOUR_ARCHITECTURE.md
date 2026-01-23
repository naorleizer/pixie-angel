# Tour System Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pixie Web Application                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐
   │  Dashboard  │  │      Chat        │  │ Challenges   │
   │   Screen    │  │     Screen       │  │   Screen     │
   │             │  │                  │  │              │
   │  [? button] │  │    [? button]    │  │  [? button]  │
   └─────┬───────┘  └────────┬─────────┘  └──────┬───────┘
         │                   │                    │
         │   User clicks     │                    │
         │   help button     │                    │
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  openHelp()        │
                    │  (tour-service.js) │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Detect current     │
                    │ screen ID          │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Look up in         │
                    │ tourRegistry       │
                    └─────────┬──────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────────┐    ┌────────────────┐  ┌─────────────┐
   │ Dashboard    │    │ Chat Tour      │  │ Challenges  │
   │ Tour Config  │    │ Config         │  │ Tour Config │
   └──────┬───────┘    └────────┬───────┘  └──────┬──────┘
          │                     │                  │
          └─────────────────────┼──────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  tourManager.startTour │
                    │  (tour-manager.js)     │
                    └─────────┬──────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────────┐      ┌──────────────────┐
    │ Create Shepherd      │      │ Apply Mobile     │
    │ Tour Instance        │      │ Styles & Sizing  │
    └──────────┬───────────┘      └──────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │ Render Modal Overlay +           │
    │ Highlight Target Element         │
    │ + Tooltip with Step Title/Text   │
    │ + Navigation Buttons             │
    └──────────────┬───────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    User clicks:
    - Next → Show next step
    - Back → Show previous step
    - Skip → End tour
    - Done → End tour
```

## Data Flow: Adding a Tour

```
┌─────────────────────────────────────────────────────┐
│ Developer: Create Tour Configuration                │
│ (frontend/src/tours/my-page-tour.js)                │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
    ┌────────────────────────┐
    │ {                      │
    │   title: "...",        │
    │   steps: [             │
    │     { target, title,   │
    │       description,     │
    │       position }       │
    │   ]                    │
    │ }                      │
    └────────────┬───────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │ Developer: Register Tour                     │
    │ (frontend/src/services/tour-service.js)      │
    │ tourRegistry['screen-my-page'] = myPageTour │
    └────────────┬────────────────────────────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │ User: Click Help Button                      │
    │ → openHelp() function called                │
    └────────────┬────────────────────────────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │ tourManager.startTour(tourConfig)           │
    │ → Shepherd initializes and shows tour       │
    └────────────┬────────────────────────────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │ Tour Runs Interactively                      │
    │ → User navigates steps                      │
    │ → Tour ends (Skip/Done)                     │
    └────────────────────────────────────────────┘
```

## Component Interaction

```
┌──────────────┐
│ main.js      │  Imports & exposes openHelp()
└──────┬───────┘
       │
       ├─► Imports tour-service.js
       │
       └─► Adds window.openHelp = openHelp
           (makes it available to onclick handlers)
           
       HTML: <button onclick="openHelp()">?</button>
                     │
                     ▼
            tour-service.js
            ├─► getCurrentPageTour()
            │   ├─► Find active screen element
            │   └─► Look up in tourRegistry
            │
            └─► tourManager.startTour(tour)
                ├─► Create Shepherd instance
                ├─► Add steps from config
                ├─► Add mobile styling
                └─► Display tour UI
```

## Mobile Optimization Flow

```
User clicks help on mobile (screen < 768px)
         │
         ▼
┌─────────────────────────────────────────┐
│ tourManager.getSmartPosition()          │
├─────────────────────────────────────────┤
│ Check window width:                     │
│  if (window.innerWidth < 768)           │
│    Use 'bottom' position (default)      │
│    Avoids tooltip going off-screen      │
│  else                                   │
│    Use preferred position               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Shepherd Renders with CSS Media Queries │
├─────────────────────────────────────────┤
│ @media (max-width: 768px) {             │
│   .shepherd-button { 48px+ height }     │
│   .shepherd-text { Larger font }        │
│   Buttons wrap to accommodate space     │
│ }                                       │
└──────────────┬──────────────────────────┘
               │
               ▼
     ┌──────────────────────────┐
     │ Element Auto-Scroll      │
     ├──────────────────────────┤
     │ element.scrollIntoView({  │
     │   behavior: 'smooth',    │
     │   block: 'center'        │
     │ })                       │
     └──────────────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Tooltip displays at      │
    │ optimal position without │
    │ cutoff on mobile screen  │
    └──────────────────────────┘
```

## File Organization

```
frontend/
├── src/
│   ├── main.js                    ← Imports & exports openHelp
│   ├── styles.css                 ← Tour styling
│   ├── services/
│   │   ├── tour-manager.js        ← Shepherd wrapper (core logic)
│   │   └── tour-service.js        ← Registry + help handler
│   └── tours/                     ← Tour configurations
│       ├── dashboard-tour.js
│       ├── chat-tour.js
│       ├── challenges-tour.js
│       └── transactions-tour.js
│
└── node_modules/
    └── shepherd.js/               ← Installed library (14.5.1)
```

---

**Note**: This diagram is for reference. See TOUR_QUICK_START.md for practical examples.
