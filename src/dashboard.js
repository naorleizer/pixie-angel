import { state } from "./state.js";
import { showScreen } from "./navigation.js";
import { openChat } from "./chat.js";

function getChallengeCount() {
  const slides = document.querySelectorAll("[id^='challenge-card-']");
  return Math.max(1, slides.length);
}

export function setChallengeSlide(i) {
  const total = getChallengeCount();
  const clamped = Math.max(0, Math.min(i, total - 1));
  state.challengeCarouselIndex = clamped;

  // Slide track translation
  const track = document.getElementById("challenge-track");
  if (track) {
    track.style.transform = `translateX(-${clamped * 100}%)`;
  }

  // Update dots/buttons if present
  const dots = document.querySelectorAll("[data-challenge-dot]");
  if (dots.length) {
    dots.forEach((d, idx) => {
      const active = idx === clamped;
      d.classList.toggle("opacity-100", active);
      d.classList.toggle("opacity-40", !active);
    });
  }
}

export function initChallengeSwipe() {
  const track = document.getElementById("challenge-track");
  if (!track) return;

  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let isSwiping = false;

  const threshold = 40; // px to trigger a slide change

  track.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      deltaX = 0;
      isSwiping = false;
    },
    { passive: true }
  );

  track.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // Only treat as swipe if horizontal dominates
      if (Math.abs(dx) > Math.abs(dy)) {
        deltaX = dx;
        isSwiping = true;
      }
    },
    { passive: true }
  );

  track.addEventListener(
    "touchend",
    () => {
      if (!isSwiping) return;
      if (Math.abs(deltaX) < threshold) return;

      const direction = deltaX < 0 ? 1 : -1; // left swipe -> next, right swipe -> prev
      setChallengeSlide(state.challengeCarouselIndex + direction);
    },
    { passive: true }
  );
}

export function openChatFromDashboard(story = "challenge", reset = false) {
  openChat(story, reset);
}

export function viewChallengeOnDashboard(event) {
  if (event) event.preventDefault?.();

  showScreen("screen-dashboard", true);
  // Keep demo simple: show the dashboard first card
  setChallengeSlide(0);
}
