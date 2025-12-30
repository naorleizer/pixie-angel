import { login, register, isAuthenticated, getCurrentUser } from './api.js';
import { showScreen } from './navigation.js';

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

      // Go to dashboard or onboarding
      // For now, let's go to dashboard directly to skip onboarding if logged in
      showScreen('screen-dashboard');
    } catch (e) {
      console.error('Session invalid', e);
      showScreen('screen-login');
    }
  } else {
    showScreen('screen-login');
  }
}
