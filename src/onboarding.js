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

  // Enable/disable the bottom "Back" button based on the current slide.
  const backBtn = document.getElementById("onboarding-back-bottom");
  if (backBtn) {
    if (n > 1) {
      backBtn.classList.remove("pointer-events-none", "opacity-50");
      backBtn.classList.add("opacity-100");
      backBtn.disabled = false;
    } else {
      backBtn.classList.add("pointer-events-none", "opacity-50");
      backBtn.classList.remove("opacity-100");
      backBtn.disabled = true;
    }
  }

  // Update the Next button label when on the last slide.
  const maxSlides = document.querySelectorAll("[data-onboarding-slide]").length || 1;
  const nextBtn = document.getElementById("onboarding-next-bottom");
  if (nextBtn) {
    if (n >= maxSlides) {
      nextBtn.textContent = "All Done";
      nextBtn.setAttribute("aria-label", "All Done");
    } else {
      nextBtn.textContent = "Next ›";
      nextBtn.setAttribute("aria-label", "Next");
    }
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
