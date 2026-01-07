import { state } from "./state.js";
import { navigate } from "./navigation.js";
import { openChat, resetChatDemo, advanceChatDemo, scrollChatToBottom } from "./chat.js";
import { updateChallengeBalance } from "./budget.js";
import { apiRequest } from "./api.js";

let notifications = [];

export async function openNotifications() {
  navigate('notifications');
  loadNotifications();
}

export async function loadNotifications() {
  const list = document.getElementById("notifications-list");
  if (!list) return;
  
  try {
    const data = await apiRequest("/api/notifications");
    notifications = data.items;
    state.notificationsUnread = data.unread_count;
    
    renderNotifications(notifications, list);
    updateNotificationBadges();
  } catch (error) {
    console.error("Failed to load notifications:", error);
    list.innerHTML = `<p class="text-center text-sm text-slate-500 py-4">Failed to load notifications.</p>`;
  }
}

function renderNotifications(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-sm text-slate-600">No notifications</p>
        <p class="text-xs text-slate-500 mt-1">You're all caught up!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = items.map(n => {
    const isUnread = !n.is_read;
    const dotClass = isUnread ? "bg-rose-500" : "bg-transparent";
    // For now simple generic click. Later handle action_link.
    return `
      <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm cursor-pointer flex items-start gap-3 hover:bg-slate-50 ${isUnread ? 'bg-slate-50/50' : ''}"
           onclick="handleNotificationClick(${n.id})">
        <div class="mt-1 w-2 h-2 rounded-full ${dotClass}"></div>
        <div class="flex-1">
          <p class="text-sm ${isUnread ? 'font-semibold text-slate-800' : 'text-slate-700'}">${n.title}</p>
          <p class="text-xs text-slate-600 mt-1">${n.message}</p>
        </div>
        <span class="text-[10px] text-slate-400">
          ${new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    `;
  }).join("");
}

window.handleNotificationClick = async function(id) {
  // Mark as read API
  try {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
    // Reload to refresh UI and badges
    loadNotifications();
  } catch (e) {
    console.error(e);
  }
};

export function updateNotificationBadges() {
  const count = state.notificationsUnread;
  const badgeHamburger = document.getElementById("notif-badge-hamburger");
  const badgeMenu = document.getElementById("notif-badge-menu");
  
  if (badgeHamburger) {
    badgeHamburger.textContent = count;
    badgeHamburger.classList.toggle("hidden", count <= 0);
  }
  if (badgeMenu) {
    badgeMenu.textContent = count;
    badgeMenu.classList.toggle("hidden", count <= 0);
  }
}

export function openOverspendNotification(event) {
    // Deprecated? Kept for compatibility if called from elsewhere
    openNotifications();
}

export function chooseAdjustment(option) {
  console.log('chooseAdjustment called with:', option);
  const selection = document.getElementById("chat-step-10");
  const selectionText = document.getElementById("chat-selection-text");
  const confirm = document.getElementById("chat-step-11");
  const confirmText = document.getElementById("chat-confirmation-text");

  if (!selection || !selectionText || !confirm || !confirmText) {
    console.error('Missing elements for chooseAdjustment');
    return;
  }

  let userText = "";
  let confirmHtml = "";

  if (option === "home-movie") {
    userText = "Let's do option 1";
    confirmHtml = `
      <p>Got it. I swapped next week's movie outing for a cozy movie-at-home night. 🍿</p>
      <p class="mt-2 text-slate-600 text-xs">You'll save on tickets and snacks while still having fun.</p>
    `;
  } else if (option === "extend-vacation") {
    userText = "Let's go with option 2";
    confirmHtml = `
      <p>Done! ✅ I extended your vacation savings challenge by 1 week.</p>
      <p class="mt-2 text-slate-600 text-xs">This keeps you on track without the stress. You can adjust anytime.</p>
    `;
    state.challengeExtended = true;
    updateVacationChallengeCard();
  }

  // Show user selection immediately (no animation)
  selectionText.textContent = userText;
  selection.classList.remove("hidden");
  selection.classList.remove("chat-appear");
  scrollChatToBottom();

  // Show confirmation with animation after a short beat
  setTimeout(() => {
    confirmText.innerHTML = confirmHtml;
    confirm.classList.remove("hidden");
    confirm.classList.add("chat-appear");
    setTimeout(() => confirm.classList.remove("chat-appear"), 350);
    scrollChatToBottom();
    updateChallengeBalance();
  }, 400);
}

function updateVacationChallengeCard() {
  const card = document.getElementById("challenge-card-0");
  if (!card) return;

  const subtitle = card.querySelector("[data-challenge-deadline]");
  if (subtitle) subtitle.textContent = "Ends in 3 months (extended)";
}
