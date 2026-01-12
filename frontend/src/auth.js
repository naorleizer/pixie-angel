import { login, register, isAuthenticated, getCurrentUser, clearAuthToken } from './api.js';
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
