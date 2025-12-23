import { state } from "./state.js";
import { showScreen } from "./navigation.js";
import { openChat, resetChatDemo, advanceChatDemo, scrollChatToBottom } from "./chat.js";
import { updateChallengeBalance } from "./budget.js";

export function updateNotificationBadges() {
  const count = state.notificationsUnread;
  const badgeHamburger = document.getElementById("notif-badge-hamburger");
  const badgeMenu = document.getElementById("notif-badge-menu");
  const dot = document.getElementById("notification-dot");
  const title = document.getElementById("notification-title");

  if (badgeHamburger) {
    badgeHamburger.textContent = count;
    badgeHamburger.classList.toggle("hidden", count <= 0);
  }
  if (badgeMenu) {
    badgeMenu.textContent = count;
    badgeMenu.classList.toggle("hidden", count <= 0);
  }
  if (dot) dot.classList.toggle("hidden", count <= 0);
  if (title) title.classList.toggle("font-semibold", count > 0);
}

export function openNotifications() {
  showScreen("screen-notifications", true);
  updateNotificationBadges();
}

export function openOverspendNotification(event) {
  if (event) event.preventDefault?.();
  // Mark as read
  state.notificationsUnread = 0;
  updateNotificationBadges();

  // Open the decision chat story and auto-start it
  openChat({ story: "decision", reset: true });
  // Auto-advance first message to show alert
  setTimeout(() => {
    advanceChatDemo();
  }, 150);
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
