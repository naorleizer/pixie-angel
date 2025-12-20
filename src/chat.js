import { state, chatStories } from "./state.js";
import { showScreen } from "./navigation.js";
import { setChallengeSlide } from "./dashboard.js";

const defaultStory = "challenge";

function getActiveChatSequence() {
  return chatStories[state.activeChatStory] || chatStories[defaultStory];
}

function getAllChatSteps() {
  return Object.values(chatStories).flat();
}

export function openChat(arg, maybeReset = false) {
  let story = state.activeChatStory || defaultStory;
  let reset = false;

  if (typeof arg === "string") {
    story = chatStories[arg] ? arg : defaultStory;
    reset = !!maybeReset;
  } else if (typeof arg === "boolean") {
    reset = arg;
  } else if (arg && typeof arg === "object") {
    story = chatStories[arg.story] ? arg.story : story;
    reset = !!arg.reset;
  }

  state.activeChatStory = story;

  showScreen("screen-chat", true);
  if (reset) resetChatDemo();
  scrollChatToBottom();
}

export function resetChatDemo() {
  state.chatStepIndex = -1;
  state.challengeCreated = false;

  // Hide all chat steps
  getAllChatSteps().forEach(({ id }) => {
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
  const sequence = getActiveChatSequence();
  const maxIdx = sequence.length - 1;

  if (maxIdx < 0) return;

  // If current is beyond last, do nothing
  if (state.chatStepIndex >= maxIdx) return;

  let nextIdx = state.chatStepIndex + 1;
  let next = sequence[nextIdx];
  
  // If next message is gated by challenge and challenge not created, block advancement
  if (next?.gatedByChallenge && !state.challengeCreated) {
    return;
  }
  
  // Skip messages that require manual triggers (like delete button)
  if (next?.requiresDelete || next?.requiresButton) {
    nextIdx++;
    if (nextIdx > maxIdx) return;
    next = sequence[nextIdx];
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
    
    const delayMs = (next?.delayMultiplier || 1) * 1200;
    setTimeout(() => {
      if (state.chatStepIndex === nextIdx) {
        // Hide loading indicator
        if (loadingEl) {
          loadingEl.classList.add("hidden");
        }
        advanceChatDemo();
      }
    }, delayMs);
  }
  
  scrollChatToBottom();
}

export function goToChallengeFormFromChat(event, toEdit = false) {
  if (event) event.preventDefault?.();
  // Reset stack so back from the form returns to the dashboard
  state.screenStack = ["screen-dashboard"];
  showScreen("screen-challenge", true);

  // If editing, show second card (index 1) if it exists
  setChallengeSlide(toEdit ? 1 : 0);
}
