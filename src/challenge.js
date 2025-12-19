import { state } from "./state.js";
import { showScreen } from "./navigation.js";
import { resetChatDemo, scrollChatToBottom, advanceChatDemo } from "./chat.js";

export function createChallenge() {
  state.challengeCreated = true;

  // In the original, creating a challenge returns you to chat and unlocks chat-step-5
  showScreen("screen-chat", true);

  // Reveal the "created" UI if present
  const createdBadge = document.getElementById("challenge-created-banner");
  if (createdBadge) createdBadge.classList.remove("hidden");

  // Auto-show the confirmation message
  scrollChatToBottom();
  setTimeout(() => {
    const step5 = document.getElementById("chat-step-5");
    if (step5) {
      step5.classList.remove("hidden");
      step5.classList.add("chat-appear");
      setTimeout(() => step5.classList.remove("chat-appear"), 350);
    }
    state.chatStepIndex = 4;
    scrollChatToBottom();
  }, 100);
}

export function deleteChallengeFromChat(event) {
  if (event) event.preventDefault?.();

  // Hide the challenge item, show undo banner if present
  const item = document.getElementById("chat-challenge-item");
  if (item) item.classList.add("hidden");

  const undo = document.getElementById("chat-undo-banner");
  if (undo) undo.classList.remove("hidden");

  scrollChatToBottom();
  
  // Directly show the deleted message without advancing through the sequence
  setTimeout(() => {
    const deletedMsg = document.getElementById("chat-step-6");
    if (deletedMsg) {
      deletedMsg.classList.remove("hidden");
      deletedMsg.classList.add("chat-appear");
      setTimeout(() => deletedMsg.classList.remove("chat-appear"), 350);
    }
    state.chatStepIndex = 5;
    scrollChatToBottom();
  }, 100);
}

export function undoDeleteChallenge(event) {
  if (event) event.preventDefault?.();

  const item = document.getElementById("chat-challenge-item");
  if (item) item.classList.remove("hidden");

  const undo = document.getElementById("chat-undo-banner");
  if (undo) undo.classList.add("hidden");

  scrollChatToBottom();
}
