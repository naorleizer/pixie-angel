import "./styles.css";

// Import HTML screens
import loginHtml from "./screens/login.html?raw";
import onboardingHtml from "./screens/onboarding.html?raw";
import dashboardHtml from "./screens/dashboard.html?raw";
import notificationsHtml from "./screens/notifications.html?raw";
import chatHistoryHtml from "./screens/chat-history.html?raw";
import chatHtml from "./screens/chat.html?raw";
import challengeHtml from "./screens/challenge.html?raw";
import importTransactionsHtml from "./screens/import-transactions.html?raw";
import transactionsHtml from "./screens/transactions.html?raw";

import { showScreen, goToScreen, goBack, navigate, initHistoryNavigation } from "./navigation.js";
import { showOnboardingSlide, nextOnboardingSlide, prevOnboardingSlide } from "./onboarding.js";
import { setChallengeSlide, viewChallengeOnDashboard, initChallengeSwipe, loadChallenges } from "./dashboard.js";
import { openChat, resetChatDemo, advanceChatDemo, goToChallengeFormFromChat, openChatHistory, initChatUI } from "./chat.js";
import { createChallenge, deleteChallengeFromChat, undoDeleteChallenge } from "./challenge.js";
import { acceptBudgetAdjustment, declineBudgetAdjustment, updateChallengeBalance } from "./budget.js";
import { openNotifications, openOverspendNotification, updateNotificationBadges, chooseAdjustment, loadNotifications } from "./notifications.js";
import { initAuth, checkAuthAndRedirect } from "./auth.js";
import { initImportTransactions } from "./import-transactions.js";
import { openTransactions } from "./transactions.js";

// Expose functions for existing inline onclick="" handlers in the HTML.
// This keeps the markup unchanged while allowing modular JS.
window.showScreen = showScreen;
window.goToScreen = goToScreen;
window.goBack = goBack;
window.navigate = navigate;

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
window.openTransactions = openTransactions;

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

// Init (mirrors original ordering)
window.addEventListener("DOMContentLoaded", () => {
  // Inject screens
  const appContainer = document.getElementById("app-container");
  if (appContainer) {
    appContainer.innerHTML = 
      loginHtml +
      onboardingHtml +
      dashboardHtml +
      notificationsHtml +
      chatHistoryHtml +
      chatHtml +
      challengeHtml +
      importTransactionsHtml + 
      transactionsHtml;
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
});
