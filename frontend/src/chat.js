import { createChatSession, getChatHistory, sendChatMessage, getChatSessions } from "./api.js";
const DEBUG = (import.meta.env.VITE_DEBUG === 'true') || (localStorage.getItem('pixie_debug') === 'true');
import { showScreen, navigate } from "./navigation.js";

let currentSessionId = null;
let isSendingMessage = false;
let chatFormHandler = null;
// Track the last user message DOM element to allow editing only that message
let lastUserMessageEl = null;
let isEditingMessage = false;
let editingMessageEl = null;

export async function openChatHistory() {
  showScreen("screen-chat-history", true);
  const listEl = document.getElementById("chat-history-list");
  if (!listEl) return;
  
  listEl.innerHTML = '<div class="text-center text-slate-500 mt-10">Loading...</div>';
  
  try {
    const sessions = await getChatSessions();
    listEl.innerHTML = '';
    
    if (sessions.length === 0) {
      listEl.innerHTML = '<div class="text-center text-slate-500 mt-10">No past chats found.</div>';
      return;
    }
    
    sessions.forEach(session => {
      const date = new Date(session.updated_at).toLocaleDateString();
      const el = document.createElement('div');
      el.className = "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm cursor-pointer hover:bg-slate-50 flex justify-between items-center";
      el.onclick = () => loadChatSession(session.id);
      el.innerHTML = `
        <div>
          <p class="text-sm font-semibold text-slate-800">${session.title || 'Untitled Chat'}</p>
          <p class="text-xs text-slate-500 mt-1">Last active: ${date}</p>
        </div>
        <span class="text-indigo-600 text-xl">›</span>
      `;
      listEl.appendChild(el);
    });
    
  } catch (e) {
    console.error("Failed to load chat history", e);
    listEl.innerHTML = '<div class="text-center text-rose-500 mt-10">Failed to load history.</div>';
  }
}

export async function loadChatSession(sessionId) {
  currentSessionId = sessionId;
  navigate("chat");
  
  const chatScroll = document.getElementById("chat-scroll");
  if (chatScroll) {
    chatScroll.innerHTML = ''; // Clear current
    chatScroll.onclick = null;
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = "text-center text-slate-400 text-sm py-4";
    loadingDiv.textContent = "Loading history...";
    chatScroll.appendChild(loadingDiv);
    
    try {
      const data = await getChatHistory(sessionId);
      chatScroll.innerHTML = ''; // Clear loading
      
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          appendMessage(msg.role, msg.content);
        });
      } else {
        appendMessage('assistant', "This chat is empty.");
      }
      
    } catch (e) {
      console.error("Failed to load session messages", e);
      chatScroll.innerHTML = '';
      appendMessage('assistant', "Failed to load chat history.");
    }
  }
  
  setupChatInput();
  scrollChatToBottom();
}

export async function openChat(arg, maybeReset = false) {
  navigate("chat");
  
  // Remove the demo click handler if it exists
  const chatScroll = document.getElementById("chat-scroll");
  if (chatScroll) {
    chatScroll.onclick = null;
    // Clear demo content if it's the first time or reset requested
    if (!currentSessionId || maybeReset) {
      chatScroll.innerHTML = '';
      // Add welcome message
      appendMessage('assistant', "Hi! I'm Pixie. How can I help you with your finances today?");
      
      // Create a new session
      try {
        const session = await createChatSession("New Chat");
        currentSessionId = session.id;
      } catch (e) {
        console.error("Failed to create chat session", e);
        appendMessage('assistant', "Sorry, I'm having trouble connecting to the server.");
      }
    }
  }

  setupChatInput();
  scrollChatToBottom();
}

function setupChatInput() {
  // We need to inject a real input field if it doesn't exist
  // The current mockup might not have a real input form, let's check.
  // If not, we'll add one dynamically or assume the user will add it to HTML.
  // For now, let's look for 'chat-input-area' or similar.
  
  let inputContainer = document.getElementById('chat-input-container');
  if (!inputContainer) {
    // Create input container at the bottom of screen-chat
    const screenChat = document.getElementById('screen-chat');
    if (screenChat) {
      inputContainer = document.createElement('div');
      inputContainer.id = 'chat-input-container';
      inputContainer.className = "p-4 bg-white border-t border-slate-200";
      inputContainer.innerHTML = `
        <form id="chat-form" class="flex gap-2">
          <input type="text" id="chat-input" 
            class="flex-1 px-4 py-2 rounded-full border border-slate-300 focus:outline-none focus:border-indigo-500"
            placeholder="Type a message..." autocomplete="off" />
          <button type="submit" 
            class="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      `;
      screenChat.appendChild(inputContainer);
      
      // Adjust chat-scroll to not be covered
      // The flex layout should handle it if we insert it as a sibling of chat-scroll
      // But chat-scroll is flex-1, so we just need to make sure it's in the flex column
    }
  }

  const form = document.getElementById('chat-form');
  if (form) {
    // Remove old listener if present to avoid duplicates
    try {
      if (chatFormHandler) form.removeEventListener('submit', chatFormHandler);
    } catch (err) {
      // ignore if element changed
    }

    chatFormHandler = async function onChatFormSubmit(e) {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const message = input.value.trim();

      if (!message || isSendingMessage) return;

      if (isEditingMessage && editingMessageEl) {
        // Finish editing the existing last message (client-side only)
        const newContent = message;
        // update DOM
        editingMessageEl.innerHTML = escapeHtml(newContent);
        // store updated content
        editingMessageEl.dataset.content = newContent;
        isEditingMessage = false;
        editingMessageEl = null;
        // clear input
        input.value = '';
        // hide any lingering edit button on the lastUserMessageEl
        if (lastUserMessageEl && lastUserMessageEl._editBtn) lastUserMessageEl._editBtn.style.display = 'none';
        return;
      }

      // Normal new message
      input.value = '';
      await handleUserMessage(message);
    };

    form.addEventListener('submit', chatFormHandler);
  }
}

async function handleUserMessage(content) {
  if (!currentSessionId) return;
  
  isSendingMessage = true;
  appendMessage('user', content);
  showLoading();

  try {
    const response = await sendChatMessage(currentSessionId, content);
    hideLoading();
    appendMessage('assistant', response.response);
  } catch (error) {
    hideLoading();
    console.error("Chat error:", error);
    
    // Display user-friendly error messages
    let errorMessage = "Sorry, something went wrong. Please try again.";
    if (error.statusCode === 429) {
      errorMessage = "⏰ Rate limit reached: The AI service is temporarily unavailable. Please wait a few minutes and try again.";
    } else if (error.statusCode === 500) {
      errorMessage = "❌ Server error: Something went wrong on our end. Please try again in a moment.";
    }
    // In debug mode, append correlation ID for deeper tracing
    if (DEBUG && error.errorId) {
      errorMessage += `\n(ref: ${error.errorId})`;
    }
    
    appendMessage('assistant', errorMessage);
  } finally {
    isSendingMessage = false;
  }
}

function appendMessage(role, content) {
  const container = document.getElementById("chat-scroll");
  if (!container) return;

  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `flex items-start gap-2 ${isUser ? 'justify-end' : ''} chat-appear`;
  
  if (isUser) {
    // Create message bubble and an edit button (only visible for the last user message)
    const bubble = document.createElement('div');
    bubble.className = 'max-w-[82%] rounded-2xl bg-indigo-600 text-white px-3 py-2 shadow';
    bubble.innerHTML = escapeHtml(content);
    // store original content for editing
    bubble.dataset.content = content;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.className = 'ml-2 text-xs text-indigo-600 bg-white px-2 py-0.5 rounded-full';
    editBtn.style.display = 'none';
    editBtn.onclick = function(e) {
      e.stopPropagation();
      // start editing this message (only allowed for the last user message)
      if (div !== lastUserMessageEl) return;
      const input = document.getElementById('chat-input');
      if (!input) return;
      input.value = bubble.dataset.content || '';
      input.focus();
      isEditingMessage = true;
      editingMessageEl = bubble;
      // show visual state if desired
    };

    // attach references so we can hide/show later
    div._bubble = bubble;
    div._editBtn = editBtn;

    div.appendChild(bubble);
    div.appendChild(editBtn);
  } else {
    div.innerHTML = `
      <div class="w-8 h-8 rounded-2xl flex items-center justify-center overflow-hidden bg-indigo-100 flex-shrink-0">
        <img src="assets/images/pixie_avatar_icon.png" alt="Pixie" class="w-6 h-6 object-contain" />
      </div>
      <div class="max-w-[82%] rounded-2xl bg-white border border-slate-200 px-3 py-2 shadow-sm">
        <p class="text-slate-800 text-sm leading-relaxed">${formatMessage(content)}</p>
      </div>
    `;
  }
  // Append message
  container.appendChild(div);

  // If this is a user message, ensure only this last user message shows the edit button
  if (isUser) {
    // hide previous last
    if (lastUserMessageEl && lastUserMessageEl._editBtn) {
      lastUserMessageEl._editBtn.style.display = 'none';
    }
    // show this message's edit button
    lastUserMessageEl = div;
    if (div._editBtn) div._editBtn.style.display = 'inline-block';
  }
  scrollChatToBottom();
}

function showLoading() {
  const container = document.getElementById("chat-scroll");
  const div = document.createElement('div');
  div.id = "chat-loading-indicator";
  div.className = "flex items-start gap-2 chat-appear";
  div.innerHTML = `
    <div class="w-8 h-8 rounded-2xl flex items-center justify-center overflow-hidden bg-indigo-100">
      <img src="assets/images/pixie_avatar_icon.png" alt="Pixie" class="w-6 h-6 object-contain" />
    </div>
    <div class="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm">
      <div class="flex gap-1">
        <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
        <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
        <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      </div>
    </div>
  `;
  container.appendChild(div);
  scrollChatToBottom();
}

function hideLoading() {
  const el = document.getElementById("chat-loading-indicator");
  if (el) el.remove();
}

export function scrollChatToBottom() {
  const container = document.getElementById("chat-scroll");
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessage(text) {
  // Simple formatting: newlines to <br>, bold to <strong>
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\n/g, '<br>');
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return formatted;
}

// Keep these for compatibility with main.js imports, but make them no-ops or redirect
export function resetChatDemo() {
  // No-op in real mode
}

export function advanceChatDemo() {
  // No-op
}

export function goToChallengeFormFromChat() {
  // Placeholder
}

// --- UI Helpers (moved from index.html inline script) ---

const greetings = [
  "I'm all ears! How can I help you today?",
  "Help me help your wallet. What are we looking at today?",
  "Found something tempting? Let's see how it fits into your big picture"
];

export function randomizeChatGreeting() {
  const el = document.getElementById('chat-greeting');
  if (!el) return;
  const pick = greetings[Math.floor(Math.random() * greetings.length)];
  el.textContent = pick;
}

export function chatAreaTapHandler(e) {
  const ignoreSelectors = 'button, a, input, textarea, select, [data-no-advance]';
  if(e.target.closest && e.target.closest(ignoreSelectors)) return;
  if(typeof window.advanceChatDemo === 'function'){
    window.advanceChatDemo();
  }
}

export function initChatUI() {
  randomizeChatGreeting();

  // Re-randomize when the chat screen becomes visible
  const chatScreen = document.getElementById('screen-chat');
  if (chatScreen && window.MutationObserver) {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          const cls = chatScreen.className || '';
          if (!cls.split(/\s+/).includes('hidden')) {
            randomizeChatGreeting();
          }
        }
      }
    });
    obs.observe(chatScreen, { attributes: true });
  }
}

// Expose for HTML onclick handlers
window.chatAreaTapHandler = chatAreaTapHandler;
window.randomizeChatGreeting = randomizeChatGreeting;
