import "./styles.css";

import { showScreen, goToScreen, goBack } from "./navigation.js";
import { showOnboardingSlide, nextOnboardingSlide, prevOnboardingSlide } from "./onboarding.js";
import { setChallengeSlide, viewChallengeOnDashboard } from "./dashboard.js";
import { openChat, resetChatDemo, advanceChatDemo, goToChallengeFormFromChat } from "./chat.js";
import { createChallenge, deleteChallengeFromChat, undoDeleteChallenge } from "./challenge.js";

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
window.resetChatDemo = resetChatDemo;
window.advanceChatDemo = advanceChatDemo;

window.goToChallengeFormFromChat = goToChallengeFormFromChat;
window.createChallenge = createChallenge;
window.deleteChallengeFromChat = deleteChallengeFromChat;
window.undoDeleteChallenge = undoDeleteChallenge;
window.viewChallengeOnDashboard = viewChallengeOnDashboard;

// Init (mirrors original ordering)
window.addEventListener("DOMContentLoaded", () => {
  showOnboardingSlide(1);
  showScreen("screen-onboarding", false);
  setChallengeSlide(0);
  resetChatDemo();
});
