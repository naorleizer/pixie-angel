import { createChatSession, getChatHistory, sendChatMessage, getChatSessions, apiRequest } from "./api.js";
const DEBUG = (import.meta.env.VITE_DEBUG === 'true') || (localStorage.getItem('pixie_debug') === 'true');
import { showScreen, navigate } from "./navigation.js";
import { syncLocationPermission } from "./services/location-service.js";

let currentSessionId = null;
let isSendingMessage = false;
let chatFormHandler = null;
// Track the last user message DOM element to allow editing only that message
let lastUserMessageEl = null;
// Editing state: {messageEl, originalContent, nextAssistantEl, associatedOperations: [{type, data}]}
let editingMessageData = null;
let isEditingMessage = false;
// Track whether current session is new (editing allowed) vs past (editing disabled)
let isNewSession = false;

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
  isNewSession = false; // Past chat - editing disabled
  navigate("chat");
  
  const chatScroll = document.getElementById("chat-scroll");
  if (chatScroll) {
    chatScroll.innerHTML = ''; // Clear current
    chatScroll.onclick = null;
    lastUserMessageEl = null; // Reset tracking for loaded session
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = "text-center text-slate-400 text-sm py-4";
    loadingDiv.textContent = "Loading history...";
    chatScroll.appendChild(loadingDiv);
    
    try {
      const data = await getChatHistory(sessionId);
      chatScroll.innerHTML = ''; // Clear loading
      
      // Always show welcome message first (consistent with new chats)
      appendMessage('assistant', "Hi! I'm Pixie. How can I help you with your finances today?");
      
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          appendMessage(msg.role, msg.content, msg.id);
        });
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
  
  // Sync location permission state when entering chat
  try {
    await syncLocationPermission();
  } catch (err) {
    console.error('Failed to sync location permission on chat open', err);
  }
  
  // Remove the demo click handler if it exists
  const chatScroll = document.getElementById("chat-scroll");
  if (chatScroll) {
    chatScroll.onclick = null;
    // Clear demo content if it's the first time or reset requested
    if (!currentSessionId || maybeReset) {
      chatScroll.innerHTML = '';
      lastUserMessageEl = null; // Reset tracking for new chat
      isNewSession = true; // New chat - editing allowed
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

      // Don't allow sending messages while editing
      if (!message || isSendingMessage || isEditingMessage) return;

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

// Start inline editing of a message
function startEditingMessage(messageEl, originalContent) {
  if (editingMessageData) return; // Already editing
  
  const bubble = messageEl._bubble;
  if (!bubble) return;
  
  // Only allow editing the latest user message
  if (messageEl !== lastUserMessageEl) {
    window.showToast('You can only edit your most recent message', 'info');
    return;
  }
  
  // Set editing flag to disable form submission
  isEditingMessage = true;
  
  // Find next assistant message (if exists)
  let nextAssistantEl = messageEl.nextElementSibling;
  while (nextAssistantEl && nextAssistantEl.classList.contains('justify-end')) {
    nextAssistantEl = nextAssistantEl.nextElementSibling;
  }
  
  // Get message ID from bubble dataset
  const messageId = bubble.dataset.messageId || null;
  
  // Store editing state - operations will be reverted only on approve, not on start
  editingMessageData = {
    messageEl,
    originalContent,
    nextAssistantEl,
    associatedOperations: [], // Will be populated on approve
    messageId: messageId
  };
  
  // Replace bubble with textarea
  const textarea = document.createElement('textarea');
  textarea.className = 'max-w-[82%] rounded-2xl px-3 py-2 shadow resize-none border border-slate-300 focus:outline-none focus:border-indigo-500';
  textarea.style.backgroundColor = '#f8fafc';
  textarea.style.color = '#1e293b';
  textarea.value = originalContent;
  textarea.rows = Math.max(2, originalContent.split('\n').length);
  textarea.style.minHeight = bubble.offsetHeight + 'px';
  
  // Create action buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-1 ml-2';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.innerHTML = '✕';
  cancelBtn.className = 'w-6 h-6 text-sm text-white bg-slate-500 hover:bg-slate-600 rounded-full flex items-center justify-center';
  cancelBtn.onclick = () => cancelEdit();
  
  const approveBtn = document.createElement('button');
  approveBtn.type = 'button';
  approveBtn.innerHTML = '✓';
  approveBtn.className = 'w-6 h-6 text-sm text-white bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center';
  approveBtn.onclick = () => approveEdit();
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(approveBtn);
  
  // Replace bubble with textarea
  messageEl.replaceChild(textarea, bubble);
  messageEl._bubble = textarea;
  
  // Replace edit button with action buttons
  if (messageEl._editBtn) {
    messageEl.replaceChild(buttonContainer, messageEl._editBtn);
    messageEl._editBtn = buttonContainer;
  } else {
    messageEl.appendChild(buttonContainer);
    messageEl._editBtn = buttonContainer;
  }
  
  // Dim the assistant's response
  if (nextAssistantEl) {
    nextAssistantEl.style.opacity = '0.3';
  }
  
  // Disable chat input while editing
  const input = document.getElementById('chat-input');
  const submitBtn = document.querySelector('#chat-form button[type=\"submit\"]');
  if (input) input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  
  textarea.focus();
  textarea.select();
}

// Detect and revert operations performed by the assistant
function detectAndRevertOperations(assistantEl) {
  const operations = [];
  
  // Find challenge widgets by data-challenge-id attribute
  const widgets = assistantEl.querySelectorAll('[data-challenge-id]');
  
  if (DEBUG) console.log(`Found ${widgets.length} challenge widgets to potentially revert`);
  
  widgets.forEach(widget => {
    const action = widget.dataset.action;
    const challengeId = widget.dataset.challengeId;
    
    if (DEBUG) console.log(`Processing widget: action=${action}, challengeId=${challengeId}`);
    
    if (action === 'create' && challengeId) {
      // Revert challenge creation by PURGING it (hard delete)
      apiRequest(`/api/challenges/${challengeId}/purge`, {
        method: 'DELETE'
      }).then(() => {
        if (DEBUG) console.log(`Purged (hard-deleted) challenge: ${challengeId}`);
        window.showToast?.('Challenge creation reverted', 'info');
      }).catch(err => {
        console.error('Failed to purge challenge:', err);
        window.showToast?.('Failed to revert challenge creation', 'error');
      });
      
      operations.push({
        type: 'challenge_create',
        challengeId: challengeId
      });
    } else if (action === 'add_update' && challengeId) {
      // Revert challenge update by deleting the specific update
      const updateId = widget.dataset.updateId;
      if (updateId) {
        apiRequest(`/api/challenges/${challengeId}/updates/${updateId}`, {
          method: 'DELETE'
        }).then(() => {
          if (DEBUG) console.log(`Reverted challenge update: ${updateId} on challenge ${challengeId}`);
          window.showToast?.('Challenge update reverted', 'info');
        }).catch(err => {
          console.error('Failed to revert challenge update:', err);
          window.showToast?.('Failed to revert challenge update', 'error');
        });
        
        operations.push({
          type: 'challenge_update',
          challengeId: challengeId,
          updateId: updateId
        });
      } else {
        console.warn(`add_update widget missing updateId for challenge ${challengeId}`);
      }
    }
  });
  
  return operations;
}

// Cancel editing and restore original state
export function cancelEdit() {
  if (!editingMessageData) return;
  
  const { messageEl, originalContent, nextAssistantEl } = editingMessageData;
  const textarea = messageEl._bubble;
  
  // Restore original bubble
  const bubble = document.createElement('div');
  bubble.className = 'max-w-[82%] rounded-2xl bg-indigo-600 text-white px-3 py-2 shadow';
  bubble.innerHTML = escapeHtml(originalContent);
  bubble.dataset.content = originalContent;
  
  // Restore edit button
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = 'Edit';
  editBtn.className = 'ml-2 text-xs text-indigo-600 bg-white px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity';
  editBtn.onclick = function(e) {
    e.stopPropagation();
    startEditingMessage(messageEl, originalContent);
  };
  
  messageEl.replaceChild(bubble, textarea);
  if (messageEl._editBtn) {
    messageEl.replaceChild(editBtn, messageEl._editBtn);
  }
  messageEl._bubble = bubble;
  messageEl._editBtn = editBtn;
  
  // Restore assistant response opacity
  if (nextAssistantEl) {
    nextAssistantEl.style.opacity = '1';
  }
  
  // Re-enable chat input
  const input = document.getElementById('chat-input');
  const submitBtn = document.querySelector('#chat-form button[type="submit"]');
  if (input) input.disabled = false;
  if (submitBtn) submitBtn.disabled = false;
  
  editingMessageData = null;
  isEditingMessage = false;
}

// Approve edit and regenerate response
export async function approveEdit() {
  if (!editingMessageData) return;
  
  const { messageEl, nextAssistantEl } = editingMessageData;
  const textarea = messageEl._bubble;
  const newContent = textarea.value.trim();
  
  if (!newContent) {
    window.showToast('Message cannot be empty', 'error');
    return;
  }
  
  // NOW detect and revert operations in the assistant's response (only on confirm)
  const associatedOperations = nextAssistantEl ? detectAndRevertOperations(nextAssistantEl) : [];
  
  // Update message bubble
  const bubble = document.createElement('div');
  bubble.className = 'max-w-[82%] rounded-2xl bg-indigo-600 text-white px-3 py-2 shadow';
  bubble.innerHTML = escapeHtml(newContent);
  bubble.dataset.content = newContent;
  
  // Restore edit button
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = 'Edit';
  editBtn.className = 'ml-2 text-xs text-indigo-600 bg-white px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity';
  editBtn.onclick = function(e) {
    e.stopPropagation();
    startEditingMessage(messageEl, newContent);
  };
  
  messageEl.replaceChild(bubble, textarea);
  if (messageEl._editBtn) {
    messageEl.replaceChild(editBtn, messageEl._editBtn);
  }
  messageEl._bubble = bubble;
  messageEl._editBtn = editBtn;
  
  // Remove old assistant response from DOM
  if (nextAssistantEl) {
    nextAssistantEl.remove();
  }
  
  const messageIdToDelete = editingMessageData.messageId;
  editingMessageData = null;
  isEditingMessage = false;
  
  // Delete old message from backend if we have the ID
  if (messageIdToDelete) {
    try {
      await apiRequest(`/api/chat/sessions/${currentSessionId}/messages/${messageIdToDelete}`, {
        method: 'DELETE'
      });
      if (DEBUG) console.log(`Deleted old message ${messageIdToDelete} from backend`);
    } catch (err) {
      console.error('Failed to delete old message from backend:', err);
      // Continue anyway - frontend state is already updated
    }
  }
  
  // Re-enable chat input
  const input = document.getElementById('chat-input');
  const submitBtn = document.querySelector('#chat-form button[type="submit"]');
  if (input) input.disabled = false;
  if (submitBtn) submitBtn.disabled = false;
  
  // Send new message to LLM
  showLoading();
  try {
    const response = await sendChatMessage(currentSessionId, newContent);
    hideLoading();
    appendMessage('assistant', response.response);
    
    // Reload challenges if operations were reverted
    if (associatedOperations && associatedOperations.length > 0) {
      // Refresh dashboard challenges if needed
      if (typeof window.loadChallenges === 'function') {
        window.loadChallenges();
      }
    }
  } catch (err) {
    hideLoading();
    console.error('Failed to regenerate response:', err);
    appendMessage('assistant', 'Sorry, I encountered an error. Please try again.');
  }
}

function appendMessage(role, content, messageId = null) {
  const container = document.getElementById("chat-scroll");
  if (!container) return;

  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `flex items-start gap-2 ${isUser ? 'justify-end' : ''} chat-appear`;
  
  if (isUser) {
    // Create message bubble and an edit button (visible on hover)
    const bubble = document.createElement('div');
    bubble.className = 'max-w-[82%] rounded-2xl bg-indigo-600 text-white px-3 py-2 shadow';
    bubble.innerHTML = escapeHtml(content);
    // store original content for editing
    bubble.dataset.content = content;
    // store message ID if available
    if (messageId) {
      bubble.dataset.messageId = messageId;
    }

    // Only create edit button for new sessions (editing disabled for past chats)
    let editBtn = null;
    if (isNewSession) {
      editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.className = 'ml-2 text-xs text-indigo-600 bg-white px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity';
      editBtn.onclick = function(e) {
        e.stopPropagation();
        startEditingMessage(div, bubble.dataset.content || '');
      };
    }

    // Make div a group for hover effects (only if edit button exists)
    if (editBtn) {
      div.className += ' group';
    }

    // attach references
    div._bubble = bubble;
    div._editBtn = editBtn;

    div.appendChild(bubble);
    if (editBtn) {
      div.appendChild(editBtn);
    }
  } else {
    // Check if message contains a challenge widget
    const widgetMatch = content.match(/<CHALLENGE_WIDGET>(.*?)<\/CHALLENGE_WIDGET>/s);
    let textContent = content.replace(/<CHALLENGE_WIDGET>.*?<\/CHALLENGE_WIDGET>/s, '').trim();
    
    // Debug: log if widget found
    if (widgetMatch) {
      if (DEBUG) console.log('Widget detected in message:', widgetMatch[1]);
    } else {
      if (DEBUG) console.log('No widget tags found in content');
    }
    
    div.innerHTML = `
      <div class="w-8 h-8 rounded-2xl flex items-center justify-center overflow-hidden bg-indigo-100 flex-shrink-0">
        <img src="assets/images/pixie_avatar_icon.png" alt="Pixie" class="w-6 h-6 object-contain" />
      </div>
      <div class="flex flex-col gap-2 max-w-[82%]">
        <div class="rounded-2xl bg-white border border-slate-200 px-3 py-2 shadow-sm">
          <p class="text-slate-800 text-sm leading-relaxed">${formatMessage(textContent)}</p>
        </div>
      </div>
    `;
    
    // If widget found, render challenge card
    if (widgetMatch) {
      try {
        const widgetData = JSON.parse(widgetMatch[1]);
        if (DEBUG) console.log('Parsed widget data:', widgetData);
        
        if (widgetData.type === 'challenge_widget' && widgetData.challenge) {
          const card = createChallengeCard(widgetData);
          const msgContent = div.querySelector('.flex.flex-col');
          if (msgContent) {
            msgContent.appendChild(card);
            if (DEBUG) console.log('Challenge card appended successfully');
          } else {
            if (DEBUG) console.warn('Could not find message content container');
          }
        }
      } catch (e) {
        console.error('Failed to parse challenge widget:', e);
        if (DEBUG) console.error('Widget content was:', widgetMatch[1]);
      }
    }
  }
  // Append message
  container.appendChild(div);

  // Track last user message and hide edit buttons on previous messages
  if (isUser) {
    // Hide edit button on previous last message
    if (lastUserMessageEl && lastUserMessageEl._editBtn) {
      lastUserMessageEl._editBtn.style.display = 'none';
    }
    // Set this as the new last message
    lastUserMessageEl = div;
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

function createChallengeCard(widgetData) {
  const challenge = widgetData.challenge || {};
  const action = widgetData.action || 'update';
  const deleted = widgetData.deleted || false;
  
  const title = challenge.title || 'Challenge';
  const status = deleted ? 'deleted' : (challenge.status || 'active');
  const target = challenge.target_amount || 0;
  const current = challenge.current_amount || 0;
  const endDate = challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'No deadline';
  const progress = target > 0 ? Math.round((current / target) * 100) : 0;
  
  // Status-based color
  let statusColor = 'bg-blue-100 text-blue-800';
  if (deleted) statusColor = 'bg-gray-100 text-gray-800';
  else if (status === 'completed') statusColor = 'bg-emerald-100 text-emerald-800';
  else if (status === 'failed') statusColor = 'bg-rose-100 text-rose-800';
  else if (status === 'active') statusColor = 'bg-indigo-100 text-indigo-800';
  
  // Progress indicator color
  let progressColor = 'bg-indigo-500';
  if (progress >= 100) progressColor = 'bg-emerald-500';
  else if (progress < 25) progressColor = 'bg-rose-500';
  
  // Action-specific title
  let actionText = 'Challenge Updated';
  if (action === 'create') actionText = '✨ Challenge Created';
  else if (action === 'add_update') actionText = '📝 Challenge Updated';
  else if (action === 'get_details') actionText = '📊 Challenge Details';
  else if (action === 'delete') actionText = '🗑️ Challenge Deleted';
  
  const card = document.createElement('div');
  card.className = 'mt-3 p-4 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-md';
  
  // Create unique ID for this action (for undo/redo tracking)
  const actionId = `${action}_${Math.random().toString(36).substr(2, 9)}`;
  card.dataset.actionId = actionId;
  
  // Add data attributes for operation reversion detection during message editing
  if (challenge.id) {
    card.dataset.challengeId = challenge.id;
    card.dataset.action = action;
    // For add_update, store the update_id so we can revert just that update
    if (action === 'add_update' && widgetData.update_id) {
      card.dataset.updateId = widgetData.update_id;
    }
  }
  
  // Build undo/redo button
  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors';
  undoBtn.textContent = action === 'delete' ? 'Undo Delete' : 'Undo';
  undoBtn.dataset.actionId = actionId;
  undoBtn.dataset.isRedo = 'false';
  undoBtn.dataset.action = action;
  undoBtn.dataset.challengeData = JSON.stringify(challenge);
  
  undoBtn.onclick = async (e) => {
    e.preventDefault();
    const isRedo = undoBtn.dataset.isRedo === 'true';
    const btn = e.target;
    
    try {
      if (action === 'delete') {
        if (!isRedo) {
          // Undo: restore deleted challenge
          const result = await apiRequest(`/api/challenges/${challenge.id}/undo-delete`, {
            method: 'POST',
            body: JSON.stringify({ challenge_data: challenge })
          });
          btn.textContent = 'Redo Delete';
          btn.dataset.isRedo = 'true';
          card.style.opacity = '0.6';
          appendMessage('assistant', `✅ Challenge "${challenge.title}" has been restored.`);
        } else {
          // Redo: delete again
          await apiRequest(`/api/challenges/${challenge.id}`, { method: 'DELETE' });
          btn.textContent = 'Undo Delete';
          btn.dataset.isRedo = 'false';
          card.style.opacity = '1';
          appendMessage('assistant', `🗑️ Challenge "${challenge.title}" has been deleted again.`);
        }
      } else if (action === 'add_update') {
        // For add_update, we need to undo by removing the last update
        const lastUpdate = (challenge.updates && challenge.updates.length > 0) ? challenge.updates[0] : null;
        if (lastUpdate && !isRedo) {
          // Delete the last update (undo)
          await apiRequest(`/api/challenges/${challenge.id}/updates/${lastUpdate.id}`, { method: 'DELETE' });
          btn.textContent = 'Redo';
          btn.dataset.isRedo = 'true';
          appendMessage('assistant', `↩️ Update to "${challenge.title}" has been undone.`);
        }
      }
    } catch (error) {
      console.error('Undo/Redo failed:', error);
      appendMessage('assistant', '❌ Failed to undo/redo action. Please try again.');
    }
  };
  
  card.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <div class="text-lg font-bold text-indigo-600">${actionText}</div>
    </div>
    <div class="space-y-3">
      <div>
        <h3 class="font-bold text-slate-800 text-sm">${escapeHtml(title)}</h3>
        <span class="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">
          ${status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      ${deleted ? '' : `
      <div>
        <div class="flex justify-between items-center mb-1">
          <span class="text-xs font-medium text-slate-600">Progress</span>
          <span class="text-xs font-bold text-slate-800">${current}₪ / ${target}₪</span>
        </div>
        <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full ${progressColor} transition-all" style="width: ${Math.min(progress, 100)}%"></div>
        </div>
        <div class="text-xs text-slate-500 mt-1">${progress}% complete</div>
      </div>
      `}
      <div class="flex justify-between text-xs text-slate-600">
        <span>📅 Deadline: ${endDate}</span>
      </div>
    </div>
  `;
  
  card.appendChild(undoBtn);
  return card;
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
