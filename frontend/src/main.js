import "./styles.css";

// Import HTML screens
import loginHtml from "./screens/login.html?raw";
import onboardingHtml from "./screens/onboarding.html?raw";
import dashboardHtml from "./screens/dashboard.html?raw";
import notificationsHtml from "./screens/notifications.html?raw";
import chatHistoryHtml from "./screens/chat-history.html?raw";
import chatHtml from "./screens/chat.html?raw";
import challengeHtml from "./screens/challenge.html?raw";

import { showScreen, goToScreen, goBack } from "./navigation.js";
import { showOnboardingSlide, nextOnboardingSlide, prevOnboardingSlide } from "./onboarding.js";
import { setChallengeSlide, viewChallengeOnDashboard, initChallengeSwipe } from "./dashboard.js";
import { openChat, resetChatDemo, advanceChatDemo, goToChallengeFormFromChat, openChatHistory, initChatUI } from "./chat.js";
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
});
