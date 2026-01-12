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
      nextBtn.textContent = "All Done!";
      nextBtn.setAttribute("aria-label", "All Done");
    } else {
      nextBtn.textContent = "Next";
      nextBtn.setAttribute("aria-label", "Next");
    }
  }

  // When showing the very first onboarding page, make the whole onboarding
  // section use the warm gradient instead of the default #264653 color.
  const onboardingSection = document.getElementById("screen-onboarding");
  if (onboardingSection) {
    if (n === 1) {
      onboardingSection.style.background = "linear-gradient(to bottom, #f4b8a9, #f5af9c)";
    } else {
      onboardingSection.style.background = "#264653";
    }
  }

  // Update the top-right exit button: if onboarding was opened from another
  // screen (e.g. profile) show an 'X' that returns to that screen. Otherwise
  // keep the default Skip -> dashboard behavior.
  try {
    const topExit = document.getElementById("onboarding-exit-top");
    if (topExit) {
      if (window.onboardingReturnScreen) {
        topExit.textContent = "✕";
        topExit.setAttribute('aria-label', 'Close');
        topExit.onclick = () => {
          const target = window.onboardingReturnScreen || 'screen-profile';
          // clear the return target so future opens behave normally
          window.onboardingReturnScreen = null;
          try { window.goToScreen(target); } catch (e) { /* ignore */ }
        };
      } else {
        topExit.textContent = "Skip";
        topExit.setAttribute('aria-label', 'Skip');
        topExit.onclick = () => { try { window.goToScreen('screen-dashboard'); } catch (e) {} };
      }
    }
  } catch (e) {
    // ignore in non-browser test contexts
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
