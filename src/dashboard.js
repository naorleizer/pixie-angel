import { state } from "./state.js";
import { showScreen } from "./navigation.js";
import { resetChatDemo, openChat } from "./chat.js";

export function setChallengeSlide(i) {
  state.challengeCarouselIndex = i;

  const slides = document.querySelectorAll("[id^='challenge-card-']");
  slides.forEach((el) => el.classList.add("hidden"));

  const target = document.getElementById(`challenge-card-${i}`);
  if (target) target.classList.remove("hidden");

  // Update dots/buttons if present
  const dots = document.querySelectorAll("[data-challenge-dot]");
  if (dots.length) {
    dots.forEach((d, idx) => {
      const active = idx === i;
      d.classList.toggle("opacity-100", active);
      d.classList.toggle("opacity-40", !active);
    });
  }
}

export function openChatFromDashboard(forceReset = false) {
  if (forceReset) resetChatDemo();
  openChat(forceReset);
}

export function viewChallengeOnDashboard(event) {
  if (event) event.preventDefault?.();

  showScreen("screen-dashboard", true);
  // Keep demo simple: show the dashboard first card
  setChallengeSlide(0);
}
