import Shepherd from 'shepherd.js';

/**
 * TourManager - Wrapper around Shepherd.js for page-specific tours
 * Provides mobile-friendly onboarding/tutorial functionality
 */
class TourManager {
  constructor() {
    this.tour = null;
    this.currentPageTour = null;
  }

  /**
   * Initialize and start a tour for the current page
   * @param {Object} tourConfig - Tour configuration with steps
   */
  startTour(tourConfig) {
    if (!tourConfig || !tourConfig.steps || tourConfig.steps.length === 0) {
      console.warn('Invalid tour configuration');
      return;
    }

    // End any existing tour
    if (this.tour) {
      this.tour.cancel();
    }

    // Disable interactive elements on the page
    this.disablePageElements();

    // Create new tour with mobile-optimized defaults
    this.tour = new Shepherd.Tour({
      defaultStepOptions: {
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true }
      },
      useModalOverlay: true  // Re-enable to show shadow/dimming effect
    });

    // Add steps from config
    tourConfig.steps.forEach((step, index) => {
      this.tour.addStep({
        id: `step-${index}`,
        title: step.title,
        text: step.description,
        attachTo: {
          element: step.target,
          on: this.getSmartPosition(step.position)
        },
        buttons: this.getStepButtons(index, tourConfig.steps.length),
        beforeShowPromise: () => {
          // Auto-scroll element into view if needed
          const element = document.querySelector(step.target);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return Promise.resolve();
        }
      });
    });

    // Event handlers
    this.tour.on('cancel', () => this.onTourEnd());
    this.tour.on('complete', () => this.onTourEnd());

    // Start the tour
    this.tour.start();
  }

  /**
   * Get smart positioning for tooltips (mobile-aware)
   */
  getSmartPosition(preferredPosition) {
    // On mobile, prefer top/bottom over left/right to avoid cutoff
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      return ['top', 'bottom'].includes(preferredPosition) 
        ? preferredPosition 
        : 'bottom';
    }

    return preferredPosition || 'bottom';
  }

  /**
   * Generate navigation buttons for each step
   */
  getStepButtons(currentIndex, totalSteps) {
    const buttons = [];

    // Back button (if not first step)
    if (currentIndex > 0) {
      buttons.push({
        action: () => this.tour.back(),
        classes: 'shepherd-button-secondary',
        text: '←'
      });
    }

    // Next or Complete button
    if (currentIndex < totalSteps - 1) {
      buttons.push({
        action: () => this.tour.next(),
        classes: 'shepherd-button-primary',
        text: '→'
      });
    } else {
      buttons.push({
        action: () => this.tour.complete(),
        classes: 'shepherd-button-primary',
        text: '✓'
      });
    }

    return buttons;
  }

  /**
   * Cleanup when tour ends
   */
  onTourEnd() {
    this.tour = null;
    this.currentPageTour = null;
    // Re-enable interactive elements
    this.enablePageElements();
  }

  /**
   * End the current tour
   */
  endTour() {
    if (this.tour) {
      this.tour.cancel();
    }
  }

  /**
   * Check if a tour is currently active
   */
  isActive() {
    return this.tour !== null;
  }

  /**
   * Disable interactive elements on the page (except sidebar close button)
   */
  disablePageElements() {
    // Disable all interactive elements
    const interactiveElements = document.querySelectorAll(
      'button:not(.shepherd-button):not(.shepherd-cancel-icon), ' +
      'a, [onclick]:not(.shepherd-button), ' +
      'input, textarea, select, ' +
      '[role="button"]'
    );

    interactiveElements.forEach(el => {
      // Skip sidebar overlay and close button
      if (el.id === 'app-sidebar-overlay' || el.getAttribute('aria-label') === 'Close sidebar') {
        return;
      }
      // Mark as disabled for tour and apply opacity
      el.setAttribute('data-tour-disabled', 'true');
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.5';
    });
  }

  /**
   * Re-enable interactive elements after tour ends
   */
  enablePageElements() {
    const disabledElements = document.querySelectorAll('[data-tour-disabled="true"]');
    disabledElements.forEach(el => {
      el.removeAttribute('data-tour-disabled');
      el.style.pointerEvents = '';
      el.style.opacity = '';
    });
  }
}

// Export singleton instance
export const tourManager = new TourManager();
