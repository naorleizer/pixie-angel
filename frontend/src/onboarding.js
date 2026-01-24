import { state } from "./state.js";
import { requestLocationPermission, saveLocationPreference } from "./services/location-service.js";

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
        topExit.onclick = () => { 
          try { 
            window.goToScreen('screen-persona-quiz'); 
          } catch (e) {} 
        };
      }
    }
  } catch (e) {
    // ignore in non-browser test contexts
  }
}

export function nextOnboardingSlide(bypassLocationCheck = false) {
  const maxSlides = document.querySelectorAll("[data-onboarding-slide]").length || 1;
  const next = state.currentOnboardingSlide + 1;
  
  // Prevent advancing from location slide (slide 5 = index 4) without explicit choice
  // Unless bypassed by authorize/skip handlers
  if (state.currentOnboardingSlide === 5 && !bypassLocationCheck) {
    window.showToast && window.showToast('Please choose whether to allow location access', 'info');
    return;
  }
  
  if (next > maxSlides) {
    // After onboarding, new users go to persona quiz
    try {
      const { navigate } = require('./navigation.js');
      navigate('persona-quiz');
    } catch (e) {
      goToScreen('screen-persona-quiz');
    }
  } else {
    showOnboardingSlide(next);
  }
}

export function prevOnboardingSlide() {
  const prev = Math.max(state.currentOnboardingSlide - 1, 1);
  showOnboardingSlide(prev);
}

export async function authorizeLocationAccess() {
  // Show loading state
  const locationSlide = document.querySelector('[data-onboarding-slide="4"]');
  const buttonsContainer = locationSlide?.querySelector('.flex.flex-col.sm\\:flex-row');
  const originalButtons = buttonsContainer?.innerHTML;
  
  if (buttonsContainer) {
    buttonsContainer.innerHTML = '<div class="text-center text-white text-sm py-2">Requesting permission...</div>';
  }
  
  try {
    await requestLocationPermission();
    // Permission granted successfully
    await saveLocationPreference(true);
    window.showToast && window.showToast('Location access enabled', 'success');
    nextOnboardingSlide(true); // Bypass location check
  } catch (err) {
    console.error("Location permission denied or unavailable", err);
    
    // Restore buttons
    if (buttonsContainer && originalButtons) {
      buttonsContainer.innerHTML = originalButtons;
    }
    
    // Check if permission was explicitly denied or just unavailable
    const errorMsg = err.code === 1 
      ? 'Location access was denied. You can enable it later in Settings.'
      : 'Location access is not available on this device.';
    
    window.showConfirmation && window.showConfirmation(
      errorMsg + ' Would you like to try again?',
      async () => {
        // User wants to retry
        await authorizeLocationAccess();
      },
      async () => {
        // User chooses to continue without location
        await saveLocationPreference(false);
        nextOnboardingSlide(true); // Bypass location check
      }
    );
  }
}

export async function skipLocationAccess() {
  try {
    await saveLocationPreference(false);
  } catch (err) {
    console.error("Failed to save skipped location preference", err);
  } finally {
    // Always advance even if save fails
    nextOnboardingSlide(true); // Bypass location check
  }
}
