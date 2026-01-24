import { state } from "./state.js";

// Screen name <-> id map
const screenMap = {
  login: "screen-login",
  onboarding: "screen-onboarding",
  dashboard: "screen-dashboard",
  notifications: "screen-notifications",
  "chat-history": "screen-chat-history",
  chat: "screen-chat",
  "persona-quiz": "screen-persona-quiz",
  challenge: "screen-challenge",
  challenges: "screen-challenges",
  "import-transactions": "import-transactions-screen",
  transactions: "screen-transactions",
  profile: "screen-profile",
};
const idToName = Object.entries(screenMap).reduce((acc, [name, id]) => {
  acc[id] = name;
  return acc;
}, {});

/**
 * Navigate to a screen (new system using screen names)
 */
export function navigate(screenName) {
  const screenId = screenMap[screenName] || screenName;
  showScreen(screenId, true);
  try {
    history.pushState({ screenId }, "", `#/${screenName}`);
  } catch {}
}

/**
 * Show a screen by id. Optionally push it to stack for back navigation.
 */
export function showScreen(screenId, pushToStack = true) {
  const screens = document.querySelectorAll("[id^='screen-'], [id$='-screen']");
  screens.forEach((s) => s.classList.add("hidden"));

  const target = document.getElementById(screenId);
  if (!target) return;
  target.classList.remove("hidden");

  if (pushToStack) {
    const top = state.screenStack[state.screenStack.length - 1];
    if (top !== screenId) state.screenStack.push(screenId);
  }
  
  // Initialize screen-specific logic
  initScreenHandlers(screenId);
}

function initScreenHandlers(screenId) {
  // Import screen initializers dynamically when needed
  if (screenId === 'screen-challenges') {
    import('./challenges.js').then(({ initChallenges }) => {
      initChallenges();
    }).catch(err => console.error('Failed to init challenges:', err));
  } else if (screenId === 'screen-dashboard') {
    // Refresh dashboard data when returning to it
    import('./dashboard.js').then(({ loadChallenges, loadRecentTransactions }) => {
      loadChallenges();
      loadRecentTransactions();
    }).catch(err => console.error('Failed to refresh dashboard:', err));
  } else if (screenId === 'screen-persona-quiz') {
    import('./persona-quiz.js').then(({ initPersonaQuiz }) => {
      initPersonaQuiz();
    }).catch(err => console.error('Failed to init persona quiz:', err));
  } else if (screenId === 'screen-account-management') {
    // Initialize account management preferences
    import('./auth.js').then(({ initAccountManagement }) => {
      initAccountManagement();
    }).catch(err => console.error('Failed to init account management:', err));
  } else if (screenId === 'screen-privacy') {
    // Initialize privacy settings from backend
    if (window.initPrivacySettings) {
      window.initPrivacySettings().catch(err => console.error('Failed to init privacy settings:', err));
    }
    // Sync location permission when entering privacy settings
    import('./services/location-service.js').then(({ syncLocationPermission }) => {
      syncLocationPermission().catch(err => console.error('Failed to sync location:', err));
    }).catch(err => console.error('Failed to load location service:', err));
  } else if (screenId === 'screen-profile') {
    // Update profile username from state
    import('./state.js').then(({ state }) => {
      const user = state.currentUser;
      if (user && user.username) {
        const usernameEl = document.getElementById('profile-username');
        const handleEl = document.getElementById('profile-handle');
        const avatarEl = document.getElementById('profile-avatar');
        if (usernameEl) usernameEl.textContent = user.username;
        if (handleEl) handleEl.textContent = `@${user.username}`;
        if (avatarEl) avatarEl.textContent = user.username.charAt(0).toUpperCase();
      }
    }).catch(err => console.error('Failed to update profile:', err));
  }
}

export function goToScreen(screenId) {
  showScreen(screenId, true);
  const name = idToName[screenId] || screenId.replace(/^screen-/, "");
  try {
    history.pushState({ screenId }, "", `#/${name}`);
  } catch {}
}

export function goBack() {
  try {
    history.back();
  } catch {
    // Fallback to internal stack
    if (state.screenStack.length <= 1) return;
    state.screenStack.pop();
    const prev = state.screenStack[state.screenStack.length - 1];
    showScreen(prev, false);
  }
}

export function initHistoryNavigation() {
  // On first load, show screen from hash if present
  const hash = (location.hash || "").replace(/^#\/?/, "");
  if (hash && screenMap[hash]) {
    const screenId = screenMap[hash];
    showScreen(screenId, true);
    try { history.replaceState({ screenId }, "", `#/${hash}`); } catch {}
  } else {
    // Ensure we have initial state reflecting current top screen
    const current = state.screenStack[state.screenStack.length - 1] || "screen-onboarding";
    const name = idToName[current] || current.replace(/^screen-/, "");
    try { history.replaceState({ screenId: current }, "", `#/${name}`); } catch {}
  }

  window.addEventListener("popstate", (e) => {
    const screenId = e.state?.screenId || (() => {
      const h = (location.hash || "").replace(/^#\/?/, "");
      return screenMap[h] || state.screenStack[state.screenStack.length - 1] || "screen-onboarding";
    })();
    showScreen(screenId, false);
  });
}

export function resetTo(screenNameOrId) {
  const screenId = screenMap[screenNameOrId] || screenNameOrId;
  // Hide others and show target without pushing to stack
  const screens = document.querySelectorAll("[id^='screen-'], [id$='-screen']");
  screens.forEach((s) => s.classList.add("hidden"));
  const target = document.getElementById(screenId);
  if (target) target.classList.remove("hidden");

  // Reset stack to only this screen
  state.screenStack = [screenId];

  // Replace current history entry
  const name = idToName[screenId] || screenId.replace(/^screen-/, "");
  try { history.replaceState({ screenId }, "", `#/${name}`); } catch {}
}
