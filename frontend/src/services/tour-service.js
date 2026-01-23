import { tourManager } from './tour-manager.js';
import { dashboardTour } from '../tours/dashboard-tour.js';
import { chatTour } from '../tours/chat-tour.js';
import { challengesTour } from '../tours/challenges-tour.js';
import { transactionsTour } from '../tours/transactions-tour.js';
import { profileTour } from '../tours/profile-tour.js';

/**
 * Tour Registry - Maps page IDs to their tour configurations
 */
const tourRegistry = {
  'screen-dashboard': dashboardTour,
  'screen-chat': chatTour,
  'screen-chat-history': null, // No tour for chat history
  'screen-challenges': challengesTour,
  'screen-transactions': transactionsTour,
  'screen-profile': profileTour,
  'screen-account-management': null,
  'screen-notifications': null
};

/**
 * Get tour configuration for the currently visible screen
 */
function getCurrentPageTour() {
  // Find which screen is currently visible
  const screens = document.querySelectorAll('section[id^="screen-"]');
  let activeScreenId = null;

  screens.forEach(screen => {
    if (!screen.classList.contains('hidden')) {
      activeScreenId = screen.id;
    }
  });

  if (!activeScreenId) {
    console.warn('No active screen found');
    return null;
  }

  const tour = tourRegistry[activeScreenId];
  if (!tour) {
    console.info(`No tour available for page: ${activeScreenId}`);
  }

  return tour;
}

/**
 * Main help handler - Called when user clicks help button
 */
export function openHelp() {
  const tour = getCurrentPageTour();

  if (!tour) {
    // Show fallback message if no tour exists
    alert('Help for this page is coming soon!');
    return;
  }

  tourManager.startTour(tour);
}

/**
 * Register a new tour for a page
 * Useful for dynamic page creation
 */
export function registerTour(pageId, tourConfig) {
  tourRegistry[pageId] = tourConfig;
}

/**
 * Unregister a tour
 */
export function unregisterTour(pageId) {
  delete tourRegistry[pageId];
}

export { tourManager };
