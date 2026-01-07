import "./styles.css";

// Import HTML screens
import loginHtml from "./screens/login.html?raw";
import onboardingHtml from "./screens/onboarding.html?raw";
import dashboardHtml from "./screens/dashboard.html?raw";
import notificationsHtml from "./screens/notifications.html?raw";
import chatHistoryHtml from "./screens/chat-history.html?raw";
import chatHtml from "./screens/chat.html?raw";
import challengeHtml from "./screens/challenge.html?raw";
import profileHtml from "./screens/profile.html?raw";
import accountManagementHtml from "./screens/account-management.html?raw";
import privacyHtml from "./screens/privacy.html?raw";
import privacyPolicyHtml from "./screens/privacy-policy.html?raw";

import { showScreen, goToScreen, goBack } from "./navigation.js";
import { showOnboardingSlide, nextOnboardingSlide, prevOnboardingSlide } from "./onboarding.js";
import { setChallengeSlide, viewChallengeOnDashboard, initChallengeSwipe } from "./dashboard.js";
import { openChat, resetChatDemo, advanceChatDemo, goToChallengeFormFromChat, openChatHistory, initChatUI, loadChatSession } from "./chat.js";
import { getChatSessions, getChatHistory } from "./api.js";
import { createChallenge, deleteChallengeFromChat, undoDeleteChallenge } from "./challenge.js";
import { acceptBudgetAdjustment, declineBudgetAdjustment, updateChallengeBalance } from "./budget.js";
import { openNotifications, openOverspendNotification, updateNotificationBadges, chooseAdjustment } from "./notifications.js";
import { initAuth, checkAuthAndRedirect } from "./auth.js";

// Expose functions for existing inline onclick="" handlers in the HTML.
// This keeps the markup unchanged while allowing modular JS.
window.showScreen = showScreen;
window.goToScreen = goToScreen;
window.goBack = goBack;

window.showOnboardingSlide = showOnboardingSlide;
window.nextOnboardingSlide = nextOnboardingSlide;
window.prevOnboardingSlide = prevOnboardingSlide;

window.setChallengeSlide = setChallengeSlide;
window.openChat = openChat;
window.openChatHistory = openChatHistory;
window.resetChatDemo = resetChatDemo;
window.advanceChatDemo = advanceChatDemo;

window.goToChallengeFormFromChat = goToChallengeFormFromChat;
window.createChallenge = createChallenge;
window.deleteChallengeFromChat = deleteChallengeFromChat;
window.undoDeleteChallenge = undoDeleteChallenge;
window.viewChallengeOnDashboard = viewChallengeOnDashboard;
window.acceptBudgetAdjustment = acceptBudgetAdjustment;
window.declineBudgetAdjustment = declineBudgetAdjustment;
window.openNotifications = openNotifications;
window.openOverspendNotification = openOverspendNotification;
window.chooseAdjustment = chooseAdjustment;

// Toggle the dashboard hamburger menu visibility
export function toggleDashboardMenu() {
  const el = document.getElementById("dashboard-menu");
  if (!el) return;
  el.classList.toggle("hidden");
}

export function showAbout() {
  // Minimal placeholder — replace with modal or screen as needed
  alert("Pixie mockup — About: Prototype app for demo purposes.");
}

export function showPrivacy() {
  alert("Privacy policy: This is a mockup. No data is collected.");
}

window.toggleDashboardMenu = toggleDashboardMenu;
window.showAbout = showAbout;
window.showPrivacy = showPrivacy;

// Sidebar HTML injected into the app container so it is present across screens.
const sidebarHtml = `
  <div id="app-sidebar-overlay" class="hidden fixed inset-0 bg-black/40 z-30"></div>
  <aside id="app-sidebar" class="fixed left-0 top-0 h-full w-64 transform -translate-x-full transition-transform duration-200 ease-out z-40 bg-white border-r border-slate-200">
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <img src="assets/images/pixie_avatar_icon.png" alt="Pixie" class="w-9 h-9 rounded-xl" />
          <div>
            <div class="text-sm font-semibold">Pixie</div>
            <div class="text-xs text-slate-500">Your Guardian Angel</div>
          </div>
        </div>
        <button aria-label="Close sidebar" onclick="toggleSidebar()" class="p-2">✕</button>
      </div>

      <nav class="flex flex-col gap-1">
        <button class="text-left px-3 py-2 hover:bg-slate-50 rounded" onclick="openChat(null, true); toggleSidebar()">
          <div class="flex items-center justify-between">
            <span>New chat</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </div>
        </button>
        <button class="text-left px-3 py-2 hover:bg-slate-50 rounded" onclick="goToScreen('screen-challenge'); toggleSidebar()">
          <div class="flex items-center justify-between">
            <span>New challenge</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 21h8M12 17v4M5 8l2-3 3-1 3 1 3 1 2 3v6a2 2 0 01-2 2H7a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        </button>
        
      </nav>

      <!-- Chats list rendered inline in sidebar -->
      <div class="mt-4">
        <h3 class="text-xs font-semibold text-slate-500 mb-2">Chats</h3>
        <div id="sidebar-chat-list" class="space-y-2 max-h-40 overflow-auto">
          <div class="text-xs text-slate-400">Loading...</div>
        </div>
      </div>
      <!-- Profile shortcut fixed to bottom-left of sidebar -->
      <div class="absolute left-4 bottom-4 flex items-center gap-3">
        <div class="relative">
          <button id="sidebar-profile-btn" aria-label="Profile" onclick="goToScreen('screen-profile'); toggleSidebar()" class="flex items-center gap-2 p-2 rounded-full hover:bg-slate-100 relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
            </svg>
            <span id="notification-dot" class="hidden absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center font-semibold">1</span>
          </button>
        </div>
        <div>
          <div id="sidebar-username" class="text-sm font-medium text-slate-800">Hi there</div>
          <div id="notification-title" class="text-xs text-slate-500">Profile</div>
        </div>
      </div>
      <!-- Onboarding CTA fixed to bottom-right of sidebar -->
      <div class="absolute right-4 bottom-4">
        <button onclick="showOnboardingSlide(1); goToScreen('screen-onboarding'); toggleSidebar()" class="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200">
          Onboarding
        </button>
      </div>
    </div>
  </aside>
`;

export function toggleSidebar() {
  const sb = document.getElementById("app-sidebar");
  const overlay = document.getElementById("app-sidebar-overlay");
  if (!sb || !overlay) return;
  const open = sb.classList.contains("translate-x-0");
  if (open) {
    sb.classList.remove("translate-x-0");
    sb.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  } else {
    sb.classList.remove("-translate-x-full");
    sb.classList.add("translate-x-0");
    overlay.classList.remove("hidden");
    // Refresh chats when opening
    try { loadSidebarChats(); } catch (err) { /* ignore */ }
    // clicking overlay closes sidebar
    overlay.onclick = () => toggleSidebar();
  }
}

window.toggleSidebar = toggleSidebar;

// Populate the sidebar with chat sessions
export async function loadSidebarChats() {
  const container = document.getElementById('sidebar-chat-list');
  if (!container) return;
  container.innerHTML = '<div class="text-xs text-slate-400">Loading...</div>';

  try {
    const sessions = await getChatSessions();
    container.innerHTML = '';
    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div class="text-xs text-slate-400">No past chats.</div>';
      return;
    }

    // Fetch histories in parallel and filter out sessions with no messages
    const details = await Promise.all(sessions.map(async (s) => {
      try {
        const res = await getChatHistory(s.id);
        return { session: s, messages: res.messages || [] };
      } catch (e) {
        return { session: s, messages: [] };
      }
    }));

    const nonEmpty = details.filter(d => d.messages && d.messages.length > 0);
    if (nonEmpty.length === 0) {
      container.innerHTML = '<div class="text-xs text-slate-400">No past chats.</div>';
      return;
    }

    nonEmpty.forEach(({ session, messages }) => {
      const date = session.updated_at ? new Date(session.updated_at).toLocaleDateString() : '';
      const el = document.createElement('div');
      el.className = 'rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm cursor-pointer hover:bg-slate-50';
      el.onclick = () => { loadChatSession(session.id); toggleSidebar(); };
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-slate-800">${session.title || 'Untitled'}</div>
            <div class="text-xs text-slate-400">${date}</div>
          </div>
          <div class="text-slate-300">›</div>
        </div>
      `;
      container.appendChild(el);
    });

  } catch (e) {
    console.error('Failed to load sidebar chats', e);
    container.innerHTML = '<div class="text-xs text-rose-500">Failed to load chats</div>';
  }
}

// Init (mirrors original ordering)
window.addEventListener("DOMContentLoaded", () => {
  // Inject screens
  const appContainer = document.getElementById("app-container");
  if (appContainer) {
    appContainer.innerHTML =
      sidebarHtml +
      loginHtml +
      onboardingHtml +
      dashboardHtml +
      profileHtml +
      accountManagementHtml +
      privacyHtml +
      privacyPolicyHtml +
      notificationsHtml +
      chatHistoryHtml +
      chatHtml +
      challengeHtml;
  }

  // Initialize Chat UI (greetings, observers)
  initChatUI();

  // Initialize Auth Logic
  initAuth();

  // Check if user is logged in and redirect accordingly
  checkAuthAndRedirect();

  showOnboardingSlide(1);
  setChallengeSlide(1); // Start at eating out challenge (index 1)
  resetChatDemo();
  // Enable swipe on challenges carousel (mobile-like)
  initChallengeSwipe();
  // Initialize challenge balance widget
  updateChallengeBalance();
  // Initialize notification badges
  updateNotificationBadges();

  // Copy dashboard username into sidebar (if present)
  const sidebarName = document.getElementById("sidebar-username");
  const dashName = document.getElementById("dashboard-username");
  if (sidebarName) {
    sidebarName.textContent = dashName ? dashName.textContent.trim() : "RutSavi";
  }

  // Load sidebar chats initially
  try { loadSidebarChats(); } catch (err) { /* ignore */ }

  // Preference toggles initialization
  window.togglePreference = function(key, btn) {
    if (!btn) return;
    const isOn = btn.classList.toggle('bg-indigo-600');
    const knob = btn.querySelector('.toggle-knob');
    if (knob) knob.classList.toggle('translate-x-5');
    btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    try { localStorage.setItem('pref_' + key, isOn ? '1' : '0'); } catch (e) {}
  };

  // Restore saved preferences
  try {
    const prefs = ['interests','location','motivations','communication_style'];
    prefs.forEach((k) => {
      const btn = document.querySelector(`[data-pref="${k}"]`);
      if (!btn) return;
      const v = localStorage.getItem('pref_' + k);
      if (v === '1') {
        btn.classList.add('bg-indigo-600');
        const knob = btn.querySelector('.toggle-knob');
        if (knob) knob.classList.add('translate-x-5');
        btn.setAttribute('aria-pressed', 'true');
      }
    });
  } catch (e) {
    // ignore
  }

  // Populate Account Management screen fields from localStorage (with fallbacks)
  try {
    const interestsEl = document.getElementById('acct-interests');
    const commEl = document.getElementById('acct-comm-style');
    const motEl = document.getElementById('acct-motivations');

    const savedInterests = localStorage.getItem('user_interests');
    const savedComm = localStorage.getItem('user_communication_style');
    const savedMots = localStorage.getItem('user_motivations');

    if (interestsEl) interestsEl.textContent = savedInterests || 'Sports, Shows';
    if (commEl) commEl.textContent = savedComm || 'Communicator';
    if (motEl) motEl.textContent = savedMots || 'Financial Security, freedom';
  } catch (e) {
    // ignore
  }
});
