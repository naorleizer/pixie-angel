import "./styles.css";

// Import HTML screens
import loginHtml from "./screens/login.html?raw";
import onboardingHtml from "./screens/onboarding.html?raw";
import personaQuizHtml from "./screens/persona-quiz.html?raw";
import dashboardHtml from "./screens/dashboard.html?raw";
import notificationsHtml from "./screens/notifications.html?raw";
import chatHistoryHtml from "./screens/chat-history.html?raw";
import chatHtml from "./screens/chat.html?raw";
import challengeHtml from "./screens/challenge.html?raw";
import challengesHtml from "./screens/challenges.html?raw";
import importTransactionsHtml from "./screens/import-transactions.html?raw";
import transactionsHtml from "./screens/transactions.html?raw";
import profileHtml from "./screens/profile.html?raw";
import accountSettingsHtml from "./screens/account-settings.html?raw";
import privacyPolicyHtml from "./screens/privacy-policy.html?raw";
import reportIssueHtml from "./screens/report-issue.html?raw";
import aboutHtml from "./screens/about.html?raw";

import { showScreen, goToScreen, goBack, navigate, initHistoryNavigation } from "./navigation.js";
import { showOnboardingSlide, nextOnboardingSlide, prevOnboardingSlide, authorizeLocationAccess, skipLocationAccess } from "./onboarding.js";
import { setChallengeSlide, viewChallengeOnDashboard, initChallengeSwipe, loadChallenges, loadRecentTransactions, navigateToChallengeDetail, showChallengeDetailOnDashboard } from "./dashboard.js";
import { openChat, resetChatDemo, advanceChatDemo, goToChallengeFormFromChat, openChatHistory, initChatUI, loadChatSession } from "./chat.js";
import { apiRequest, getChatSessions, getChatHistory, updateUserPreferences, getCurrentUser } from "./api.js";
import { createChallenge, deleteChallengeFromChat, undoDeleteChallenge } from "./challenge.js";
import { initChallenges } from "./challenges.js";
import { acceptBudgetAdjustment, declineBudgetAdjustment, updateChallengeBalance } from "./budget.js";
import { openNotifications, openOverspendNotification, updateNotificationBadges, chooseAdjustment, loadNotifications } from "./notifications.js";
import { initAuth, checkAuthAndRedirect } from "./auth.js";
import { initImportTransactions } from "./import-transactions.js";
import { openTransactions } from "./transactions.js";
import { openHelp } from "./services/tour-service.js";

// ===== Toast & Confirmation UI Helpers =====
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none items-center';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  toast.className = `${bgClass} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto animate-slide-up`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('animate-fade-down');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showConfirmation(message, onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center';
  modal.id = 'confirmation-modal';
  
  const content = document.createElement('div');
  content.className = 'bg-white rounded-lg shadow-lg max-w-sm mx-4 p-6';
  
  content.innerHTML = `
    <p class="text-slate-900 text-sm font-medium mb-4">${message}</p>
    <div class="flex gap-3 justify-end">
      <button id="confirm-cancel-btn" class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
        Cancel
      </button>
      <button id="confirm-ok-btn" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
        Confirm
      </button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  const cancelBtn = content.querySelector('#confirm-cancel-btn');
  const okBtn = content.querySelector('#confirm-ok-btn');
  
  const closeModal = () => {
    modal.remove();
  };
  
  cancelBtn.addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });
  
  okBtn.addEventListener('click', async () => {
    closeModal();
    if (onConfirm) {
      try {
        await onConfirm();
      } catch (error) {
        console.error('Error in confirmation callback:', error);
      }
    }
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
      if (onCancel) onCancel();
    }
  });
}

window.showToast = showToast;
window.showConfirmation = showConfirmation;

// Expose functions for existing inline onclick="" handlers in the HTML.
// This keeps the markup unchanged while allowing modular JS.
window.showScreen = showScreen;
window.goToScreen = goToScreen;
window.goBack = goBack;
window.navigate = navigate;

window.showOnboardingSlide = showOnboardingSlide;
window.nextOnboardingSlide = nextOnboardingSlide;
window.prevOnboardingSlide = prevOnboardingSlide;
window.authorizeLocationAccess = authorizeLocationAccess;
window.skipLocationAccess = skipLocationAccess;

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
window.navigateToChallengeDetail = navigateToChallengeDetail;
window.showChallengeDetailOnDashboard = showChallengeDetailOnDashboard;
window.acceptBudgetAdjustment = acceptBudgetAdjustment;
window.declineBudgetAdjustment = declineBudgetAdjustment;
window.openNotifications = openNotifications;
window.openOverspendNotification = openOverspendNotification;
window.chooseAdjustment = chooseAdjustment;
window.openTransactions = openTransactions;
window.openHelp = openHelp;

// Toggle the dashboard hamburger menu visibility
export function toggleDashboardMenu() {
  const el = document.getElementById("dashboard-menu");
  if (!el) return;
  el.classList.toggle("hidden");
}

export function showAbout() {
  // Navigate to dedicated About screen instead of showing an alert
  try { goToScreen('screen-about'); } catch (e) { /* fallback */ }
}

export function showPrivacy() {
  showToast("Privacy policy: This is a mockup. No data is collected.", 'info');
}

window.toggleDashboardMenu = toggleDashboardMenu;
window.showAbout = showAbout;
window.showPrivacy = showPrivacy;

// Simple handler for the Report issue screen submit button.
  window.submitFeedback = async function() {
    const name = document.getElementById('report-name')?.value || '';
    const feedback = document.getElementById('report-feedback')?.value || '';

    if (!feedback.trim()) {
      showToast('Please enter feedback before submitting.', 'error');
      return;
    }

    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() || null, message: feedback.trim() })
      });
      showToast('Thanks for your feedback. Our team will get back to you promptly.', 'success');
      try { goBack(); } catch (e) {}
    } catch (e) {
      console.error('Failed to submit feedback', e);
      showToast('Failed to submit feedback: ' + (e.message || e), 'error');
    }
  };

// Sidebar HTML injected into the app container so it is present across screens.
const sidebarHtml = `
  <div id="app-sidebar-overlay" class="hidden fixed inset-0 bg-black/40 z-30"></div>
  <aside id="app-sidebar" class="fixed left-0 top-0 h-full w-64 transform -translate-x-full transition-transform duration-200 ease-out z-40 bg-white border-r border-slate-200 flex flex-col">
    <div class="p-4 flex-shrink-0">
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
        <button class="text-left px-3 py-2 hover:bg-slate-50 rounded" onclick="navigate('challenges'); toggleSidebar()">
          <div class="flex items-center justify-between">
            <span>All challenges</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </button>
        <button class="text-left px-3 py-2 hover:bg-slate-50 rounded" onclick="navigate('import-transactions'); toggleSidebar()">
          <div class="flex items-center justify-between">
            <span>Import transactions</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        </button>
        <button class="text-left px-3 py-2 hover:bg-slate-50 rounded" onclick="openTransactions(); toggleSidebar()">
          <div class="flex items-center justify-between">
            <span>Transactions history</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          </div>
        </button>
        
      </nav>

      <!-- Chats section header -->
      <h3 class="text-xs font-semibold text-slate-500 mb-2 mt-4">Chats</h3>
    </div>

    <!-- Chats list - expands to fill available space -->
    <div class="flex-1 overflow-auto px-4 pb-4">
      <div id="sidebar-chat-list" class="space-y-2">
        <div class="text-xs text-slate-400">Loading...</div>
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

// Shared challenge detail modal (used by both dashboard and challenges screen)
const challengeDetailModalHtml = `
  <div id="challenge-detail-view" class="hidden fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <!-- Detail content will be inserted dynamically -->
        <div id="challenge-detail-content"></div>
      </div>
    </div>
  </div>
`;

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
        personaQuizHtml +
        dashboardHtml +
        profileHtml +
        aboutHtml +
        reportIssueHtml +
        accountSettingsHtml +
        privacyPolicyHtml +
        notificationsHtml +
        chatHistoryHtml +
        chatHtml +
        challengeHtml +
        challengesHtml +
        importTransactionsHtml + 
        transactionsHtml +
        challengeDetailModalHtml;
  }

  // Initialize Chat UI (greetings, observers)
  initChatUI();

  // Initialize Import Transactions
  initImportTransactions();

  // Initialize Auth Logic
  initAuth();

  // Check if user is logged in and redirect accordingly
  checkAuthAndRedirect();

  // Load data if likely logged in (checkAuth handles redirect, but we can try loading)
  // Or better, let checkAuth callback, but for now safe to call, they fail if no token
  loadChallenges();
  loadRecentTransactions();
  loadNotifications();

  showOnboardingSlide(1);
  setChallengeSlide(0); // Start at first slide (now empty)
  resetChatDemo();
  // Enable swipe on challenges carousel (mobile-like)
  initChallengeSwipe();
  // Initialize history/back integration after DOM is ready
  initHistoryNavigation();
  // Initialize notification badges
  updateNotificationBadges();

  // Copy dashboard username into sidebar (if present)
  const sidebarName = document.getElementById("sidebar-username");
  const dashName = document.getElementById("dashboard-username");
  if (sidebarName) {
    sidebarName.textContent = dashName ? dashName.textContent.trim() : "User";
  }

  // Load sidebar chats initially
  try { loadSidebarChats(); } catch (err) { /* ignore */ }

  // Preference toggles initialization with backend persistence
  window.togglePreference = async function(key, btn) {
    if (!btn) return;
    const isOn = btn.classList.toggle('bg-indigo-600');
    const knob = btn.querySelector('.toggle-knob');
    if (knob) knob.classList.toggle('translate-x-5');
    btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    try { localStorage.setItem('pref_' + key, isOn ? '1' : '0'); } catch (e) {}

    // Aggregate settings and persist to backend
    try {
      const getState = (prefKey) => {
        const el = document.querySelector(`[data-pref="${prefKey}"]`);
        return el ? el.getAttribute('aria-pressed') === 'true' : false;
      };
      const locationEnabled = getState('location');
      const commStyleEnabled = getState('communication_style');
      const interestsOn = getState('interests');
      const motivationsOn = getState('motivations');

      await updateUserPreferences({
        location_enabled: locationEnabled,
        communication_style: commStyleEnabled,
        interests_enabled: interestsOn,
        motivations_enabled: motivationsOn,
      });
    } catch (err) {
      console.error('Failed to save preferences', err);
    }
  };

  // Initialize Privacy Settings from backend
  window.initPrivacySettings = async function() {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      // Map backend fields to toggle keys
      const toggleStates = {
        'interests': user.interests_enabled,
        'motivations': user.motivations_enabled,
        'location': user.location_enabled,
        'communication_style': user.communication_style
      };
      
      // Set toggle states from backend
      Object.entries(toggleStates).forEach(([key, enabled]) => {
        const btn = document.querySelector(`[data-pref="${key}"]`);
        if (!btn) return;
        
        // Remove all state classes first
        btn.classList.remove('bg-indigo-600', 'bg-slate-300');
        const knob = btn.querySelector('.toggle-knob');
        if (knob) knob.classList.remove('translate-x-5');
        
        // Apply correct state
        if (enabled) {
          btn.classList.add('bg-indigo-600');
          if (knob) knob.classList.add('translate-x-5');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.add('bg-slate-300');
          btn.setAttribute('aria-pressed', 'false');
        }
        
        // Sync to localStorage
        try {
          localStorage.setItem('pref_' + key, enabled ? '1' : '0');
        } catch (e) {}
      });
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
      // Fallback to localStorage if backend fails
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
    }
  };

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
