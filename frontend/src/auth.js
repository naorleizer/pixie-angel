import { login, register, isAuthenticated, getCurrentUser, clearAuthToken, updateUserPreferences } from './api.js';
import { resetTo } from './navigation.js';
import { state } from './state.js';

// Valid enum values for user preferences
const VALID_INTERESTS = [
  "restaurants",
  "food_delivery",
  "travel",
  "fitness",
  "fashion",
  "technology",
  "entertainment",
  "sports",
  "gaming",
  "education",
  "family",
  "home_improvement",
  "health"
];

const VALID_MOTIVATIONS = [
  "saving_money",
  "financial_independence",
  "family_time",
  "minimalism",
  "financial_security",
  "long_term_stability",
  "freedom",
  "peace_of_mind",
  "family_support",
  "goal_achievement"
];

// Format label from snake_case
function formatLabel(str) {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function initAuth() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const toggleAuthLink = document.getElementById('toggle-auth-mode');
  const authTitle = document.getElementById('auth-title');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  
  let isLoginMode = true;

  if (toggleAuthLink) {
    toggleAuthLink.addEventListener('click', (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      
      if (isLoginMode) {
        authTitle.textContent = 'Welcome Back';
        authSubmitBtn.textContent = 'Log In';
        toggleAuthLink.innerHTML = 'New to Pixie? <span class="text-indigo-600 font-semibold">Sign Up</span>';
        document.getElementById('email-group').classList.add('hidden');
      } else {
        authTitle.textContent = 'Create Account';
        authSubmitBtn.textContent = 'Sign Up';
        toggleAuthLink.innerHTML = 'Already have an account? <span class="text-indigo-600 font-semibold">Log In</span>';
        document.getElementById('email-group').classList.remove('hidden');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('auth-username').value;
      const password = document.getElementById('auth-password').value;
      const email = document.getElementById('auth-email').value;
      const errorMsg = document.getElementById('auth-error');
      
      errorMsg.classList.add('hidden');
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = 'Processing...';

      try {
        if (isLoginMode) {
          await login(username, password);
        } else {
          await register(username, email, password);
          // Auto login after register
          await login(username, password);
        }
        
        // Success!
        console.log('Auth successful');
        checkAuthAndRedirect();
        
      } catch (error) {
        console.error('Auth failed:', error);
        errorMsg.textContent = error.message;
        errorMsg.classList.remove('hidden');
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = isLoginMode ? 'Log In' : 'Sign Up';
      }
    });
  }
}

export async function checkAuthAndRedirect() {
  if (isAuthenticated()) {
    try {
      const user = await getCurrentUser();
      console.log('Logged in as:', user.username);
      state.currentUser = user;
      
      // Update dashboard username
      const usernameEl = document.getElementById('dashboard-username');
      if (usernameEl) {
        usernameEl.textContent = `Hi ${user.username} 👋`;
      }
      
      // Update sidebar username
      const sidebarUsernameEl = document.getElementById('sidebar-username');
      if (sidebarUsernameEl) {
        sidebarUsernameEl.textContent = `Hi ${user.username}`;
      }

      if (!user.has_completed_persona_quiz) {
        // New users see onboarding first, then quiz
        resetTo('onboarding');
        // Onboarding will navigate to quiz on completion
      } else {
        // Reset app root to dashboard so Back never reveals onboarding
        resetTo('dashboard');
      }
    } catch (e) {
      console.error('Session invalid', e);
      state.currentUser = null;
      resetTo('login');
    }
  } else {
    state.currentUser = null;
    resetTo('login');
  }
}

export function logout() {
  try {
    clearAuthToken();
  } catch (e) {
    console.error('Failed to clear auth token during logout', e);
  }
  resetTo('login');
}

// Expose for inline onclick handlers in HTML (keeps markup simple)
window.logout = logout;
export async function savePersonaPreference() {
  const personaSelect = document.getElementById('acct-persona-select');
  const messageEl = document.getElementById('acct-persona-message');
  
  if (!personaSelect) {
    console.error('Persona select element not found');
    return;
  }
  
  const selectedPersona = personaSelect.value;
  messageEl.textContent = 'Saving...';
  messageEl.className = 'mt-2 text-sm text-slate-500';
  
  try {
    const updatedUser = await updateUserPreferences({ preferred_persona: selectedPersona });
    messageEl.textContent = `✓ Persona updated to "${updatedUser.preferred_persona}"`;
    messageEl.className = 'mt-2 text-sm text-green-600';
    setTimeout(() => {
      messageEl.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Failed to save persona preference:', error);
    messageEl.textContent = `✗ Error: ${error.message}`;
    messageEl.className = 'mt-2 text-sm text-red-600';
  }
}

// Expose for inline onclick handlers in HTML
window.savePersonaPreference = savePersonaPreference;

export async function initAccountManagement() {
  const personaSelect = document.getElementById('acct-persona-select');
  const interestsContainer = document.getElementById('acct-interests-container');
  const motivationsContainer = document.getElementById('acct-motivations-container');
  
  if (!personaSelect || !interestsContainer || !motivationsContainer) {
    console.warn('Account management elements not found');
    return;
  }
  
  try {
    const user = await getCurrentUser();
    
    // Populate persona select
    if (user && user.preferred_persona) {
      personaSelect.value = user.preferred_persona;
    }
    
    // Generate interests pills
    interestsContainer.innerHTML = '';
    const selectedInterests = user.interests || [];
    VALID_INTERESTS.forEach(interest => {
      const isSelected = selectedInterests.includes(interest);
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.dataset.interest = interest;
      pill.dataset.selected = isSelected ? 'true' : 'false';
      pill.className = `px-3 py-1 rounded-full text-sm font-medium transition cursor-pointer ${
        isSelected 
          ? 'bg-indigo-600 text-white' 
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
      }`;
      pill.innerHTML = `${formatLabel(interest)} ${isSelected ? '<span class="ml-1">✕</span>' : ''}`;
      pill.onclick = (e) => {
        e.preventDefault();
        toggleInterest(interest);
      };
      interestsContainer.appendChild(pill);
    });
    
    // Generate motivations pills
    motivationsContainer.innerHTML = '';
    const selectedMotivations = user.motivations || [];
    VALID_MOTIVATIONS.forEach(motivation => {
      const isSelected = selectedMotivations.includes(motivation);
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.dataset.motivation = motivation;
      pill.dataset.selected = isSelected ? 'true' : 'false';
      pill.className = `px-3 py-1 rounded-full text-sm font-medium transition cursor-pointer ${
        isSelected 
          ? 'bg-indigo-600 text-white' 
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
      }`;
      pill.innerHTML = `${formatLabel(motivation)} ${isSelected ? '<span class="ml-1">✕</span>' : ''}`;
      pill.onclick = (e) => {
        e.preventDefault();
        toggleMotivation(motivation);
      };
      motivationsContainer.appendChild(pill);
    });
    
    // Update summary displays
    updateInterestsSummaryFromArray(selectedInterests);
    updateMotivationsSummaryFromArray(selectedMotivations);
    
  } catch (error) {
    console.error('Failed to load account management:', error);
  }
}

function toggleInterest(interest) {
  const interestsContainer = document.getElementById('acct-interests-container');
  const pills = interestsContainer.querySelectorAll('button');
  const pill = Array.from(pills).find(p => p.dataset.interest === interest);
  
  if (pill) {
    const isCurrentlySelected = pill.dataset.selected === 'true';
    
    if (isCurrentlySelected) {
      // Deselect
      pill.classList.remove('bg-indigo-600', 'text-white');
      pill.classList.add('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
      pill.innerHTML = formatLabel(interest);
      pill.dataset.selected = 'false';
    } else {
      // Select
      pill.classList.remove('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
      pill.classList.add('bg-indigo-600', 'text-white');
      pill.innerHTML = `${formatLabel(interest)} <span class="ml-1">✕</span>`;
      pill.dataset.selected = 'true';
    }
  }
}

function toggleMotivation(motivation) {
  const motivationsContainer = document.getElementById('acct-motivations-container');
  const pills = motivationsContainer.querySelectorAll('button');
  const pill = Array.from(pills).find(p => p.dataset.motivation === motivation);
  
  if (pill) {
    const isCurrentlySelected = pill.dataset.selected === 'true';
    
    if (isCurrentlySelected) {
      // Deselect
      pill.classList.remove('bg-indigo-600', 'text-white');
      pill.classList.add('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
      pill.innerHTML = formatLabel(motivation);
      pill.dataset.selected = 'false';
    } else {
      // Select
      pill.classList.remove('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
      pill.classList.add('bg-indigo-600', 'text-white');
      pill.innerHTML = `${formatLabel(motivation)} <span class="ml-1">✕</span>`;
      pill.dataset.selected = 'true';
    }
  }
}

function getSelectedInterests() {
  const interestsContainer = document.getElementById('acct-interests-container');
  const selectedPills = interestsContainer.querySelectorAll('button[data-selected="true"]');
  return Array.from(selectedPills).map(pill => pill.dataset.interest);
}

function getSelectedMotivations() {
  const motivationsContainer = document.getElementById('acct-motivations-container');
  const selectedPills = motivationsContainer.querySelectorAll('button[data-selected="true"]');
  return Array.from(selectedPills).map(pill => pill.dataset.motivation);
}

// Update summary text for interests/motivations cards (from DOM)
function updateInterestsSummary() {
  updateInterestsSummaryFromArray(getSelectedInterests());
}

function updateMotivationsSummary() {
  updateMotivationsSummaryFromArray(getSelectedMotivations());
}

// Update summary from array (used during init and after save)
function updateInterestsSummaryFromArray(selected) {
  const summaryEl = document.getElementById('acct-interests-summary');
  if (!summaryEl) return;
  if (selected.length === 0) {
    summaryEl.textContent = 'No interests selected';
  } else if (selected.length <= 3) {
    summaryEl.textContent = selected.map(formatLabel).join(', ');
  } else {
    summaryEl.textContent = `${selected.slice(0, 2).map(formatLabel).join(', ')} +${selected.length - 2} more`;
  }
}

function updateMotivationsSummaryFromArray(selected) {
  const summaryEl = document.getElementById('acct-motivations-summary');
  if (!summaryEl) return;
  if (selected.length === 0) {
    summaryEl.textContent = 'No motivations selected';
  } else if (selected.length <= 3) {
    summaryEl.textContent = selected.map(formatLabel).join(', ');
  } else {
    summaryEl.textContent = `${selected.slice(0, 2).map(formatLabel).join(', ')} +${selected.length - 2} more`;
  }
}

// Modal open/close functions
export function openInterestsModal() {
  const modal = document.getElementById('interests-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

export function closeInterestsModal() {
  const modal = document.getElementById('interests-modal');
  const messageEl = document.getElementById('acct-interests-message');
  if (modal) {
    modal.classList.add('hidden');
  }
  if (messageEl) {
    messageEl.textContent = '';
  }
}

export function openMotivationsModal() {
  const modal = document.getElementById('motivations-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

export function closeMotivationsModal() {
  const modal = document.getElementById('motivations-modal');
  const messageEl = document.getElementById('acct-motivations-message');
  if (modal) {
    modal.classList.add('hidden');
  }
  if (messageEl) {
    messageEl.textContent = '';
  }
}

export async function saveInterests() {
  const messageEl = document.getElementById('acct-interests-message');
  const selectedInterests = getSelectedInterests();
  
  messageEl.textContent = 'Saving...';
  messageEl.className = 'px-4 pb-3 text-sm text-slate-500';
  
  try {
    const updatedUser = await updateUserPreferences({ interests: selectedInterests });
    messageEl.textContent = `✓ Interests saved`;
    messageEl.className = 'px-4 pb-3 text-sm text-green-600';
    updateInterestsSummary();
    setTimeout(() => {
      closeInterestsModal();
    }, 1000);
  } catch (error) {
    console.error('Failed to save interests:', error);
    messageEl.textContent = `✗ Error: ${error.message}`;
    messageEl.className = 'px-4 pb-3 text-sm text-red-600';
  }
}

export async function saveMotivations() {
  const messageEl = document.getElementById('acct-motivations-message');
  const selectedMotivations = getSelectedMotivations();
  
  messageEl.textContent = 'Saving...';
  messageEl.className = 'px-4 pb-3 text-sm text-slate-500';
  
  try {
    const updatedUser = await updateUserPreferences({ motivations: selectedMotivations });
    messageEl.textContent = `✓ Motivations saved`;
    messageEl.className = 'px-4 pb-3 text-sm text-green-600';
    updateMotivationsSummary();
    setTimeout(() => {
      closeMotivationsModal();
    }, 1000);
  } catch (error) {
    console.error('Failed to save motivations:', error);
    messageEl.textContent = `✗ Error: ${error.message}`;
    messageEl.className = 'px-4 pb-3 text-sm text-red-600';
  }
}

// Expose for inline onclick handlers in HTML
window.initAccountManagement = initAccountManagement;
window.saveInterests = saveInterests;
window.saveMotivations = saveMotivations;
window.openInterestsModal = openInterestsModal;
window.closeInterestsModal = closeInterestsModal;
window.openMotivationsModal = openMotivationsModal;
window.closeMotivationsModal = closeMotivationsModal;
