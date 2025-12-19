import { state } from "./state.js";

export function showOnboardingSlide(n) {
  state.currentOnboardingSlide = n;

  const slides = document.querySelectorAll("[data-onboarding-slide]");
  slides.forEach((el) => el.classList.add("hidden"));

  const target = document.querySelector(`[data-onboarding-slide="${n - 1}"]`);
  if (target) target.classList.remove("hidden");

  // Optional: update dots if present
  const dots = document.querySelectorAll("[data-onboarding-dot]");
  if (dots.length) {
    dots.forEach((d, idx) => {
      const active = idx + 1 === n;
      d.classList.toggle("opacity-100", active);
      d.classList.toggle("opacity-40", !active);
    });
  }
}

export function nextOnboardingSlide() {
  const maxSlides = document.querySelectorAll("[data-onboarding-slide]").length || 1;
  const next = state.currentOnboardingSlide + 1;
  
  if (next > maxSlides) {
    goToScreen('screen-dashboard');
  } else {
    showOnboardingSlide(next);
  }
}

export function prevOnboardingSlide() {
  const prev = Math.max(state.currentOnboardingSlide - 1, 1);
  showOnboardingSlide(prev);
}
