import { state, chatSequence } from "./state.js";
import { showScreen } from "./navigation.js";
import { setChallengeSlide } from "./dashboard.js";

export function openChat(reset = false) {
  showScreen("screen-chat", true);
  if (reset) resetChatDemo();
  scrollChatToBottom();
}

export function resetChatDemo() {
  state.chatStepIndex = -1;

  // Hide all chat steps
  chatSequence.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  // Hide loading indicator
  const loadingEl = document.getElementById("chat-loading");
  if (loadingEl) loadingEl.classList.add("hidden");

  scrollChatToBottom();
}

export function scrollChatToBottom() {
  const container = document.getElementById("chat-scroll");
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

function revealWithAnim(el) {
  // Mirror original: reveal + small pop-in animation class
  el.classList.remove("hidden");
  el.classList.add("chat-appear");
  setTimeout(() => el.classList.remove("chat-appear"), 350);
}

export function advanceChatDemo() {
  // Advance to next chat bubble in the sequence.
  const maxIdx = chatSequence.length - 1;

  // If current is beyond last, do nothing
  if (state.chatStepIndex >= maxIdx) return;

  let nextIdx = state.chatStepIndex + 1;
  let next = chatSequence[nextIdx];
  
  // If next message is gated by challenge and challenge not created, block advancement
  if (next?.gatedByChallenge && !state.challengeCreated) {
    return;
  }
  
  // Skip messages that require manual triggers (like delete button)
  if (next?.requiresDelete) {
    nextIdx++;
    if (nextIdx > maxIdx) return;
    next = chatSequence[nextIdx];
  }

  const nextEl = document.getElementById(next.id);
  if (nextEl) revealWithAnim(nextEl);

  state.chatStepIndex = nextIdx;
  
  // If this is a user message (odd-numbered step), auto-reveal AI response after delay
  const stepNum = parseInt(next.id.replace("chat-step-", ""), 10);
  if (stepNum % 2 === 1 && !next?.noAutoAdvance) {
    // User message shown, show loading and auto-show AI response after delay
    const loadingEl = document.getElementById("chat-loading");
    if (loadingEl) {
      loadingEl.classList.remove("hidden");
      scrollChatToBottom();
    }
    
    setTimeout(() => {
      if (state.chatStepIndex === nextIdx) {
        // Hide loading indicator
        if (loadingEl) {
          loadingEl.classList.add("hidden");
        }
        advanceChatDemo();
      }
    }, 1200);
  }
  
  scrollChatToBottom();
}

export function goToChallengeFormFromChat(event, toEdit = false) {
  if (event) event.preventDefault?.();
  showScreen("screen-challenge", true);

  // If editing, show second card (index 1) if it exists
  setChallengeSlide(toEdit ? 1 : 0);
}
