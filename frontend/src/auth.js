import { login, register, isAuthenticated, getCurrentUser, clearAuthToken, updateUserPreferences } from './api.js';
import { resetTo } from './navigation.js';

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
      
      // Update dashboard username
      const usernameEl = document.getElementById('dashboard-username');
      if (usernameEl) {
        usernameEl.textContent = `Hi ${user.username} 👋`;
      }

      // Reset app root to dashboard so Back never reveals onboarding
      resetTo('dashboard');
    } catch (e) {
      console.error('Session invalid', e);
      resetTo('login');
    }
  } else {
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
  
  if (!personaSelect) {
    console.warn('Persona select element not found');
    return;
  }
  
  try {
    const user = await getCurrentUser();
    if (user && user.preferred_persona) {
      personaSelect.value = user.preferred_persona;
    }
  } catch (error) {
    console.error('Failed to load user preferences:', error);
  }
}

// Expose for inline onclick handlers in HTML
window.initAccountManagement = initAccountManagement;
