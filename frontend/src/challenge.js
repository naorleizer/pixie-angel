import { state } from "./state.js";
import { goBack } from "./navigation.js";
import { createChallenge as createChallengeAPI } from "./api.js";
import { loadChallenges } from "./dashboard.js";

export async function createChallenge() {
  // Read form values
  const titleEl = document.getElementById("challenge-title");
  const amountEl = document.getElementById("challenge-amount");
  const durValEl = document.getElementById("challenge-duration-value");
  const durUnitEl = document.getElementById("challenge-duration-unit");

  const title = titleEl?.value?.trim();
  const targetAmount = parseFloat(amountEl?.value || "0");
  const durationValue = parseInt(durValEl?.value || "0", 10);
  const durationUnit = durUnitEl?.value || "months";

  if (!title || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(durationValue) || durationValue <= 0) {
    alert("Please fill in all required fields with valid values.");
    return;
  }

  // Compute end_date from duration
  const now = new Date();
  const end = new Date(now);
  if (durationUnit === "days") end.setDate(end.getDate() + durationValue);
  else if (durationUnit === "weeks") end.setDate(end.getDate() + durationValue * 7);
  else end.setMonth(end.getMonth() + durationValue); // months default

  // For now, default to a savings-type challenge with indigo color
  const payload = {
    title,
    description: "",
    type: "savings",
    target_amount: targetAmount,
    color: "indigo",
    end_date: end.toISOString(),
  };

  try {
    // Persist to backend using API wrapper
    await createChallengeAPI(payload);

    // Refresh dashboard challenges and return to previous screen
    await loadChallenges();
    goBack();
  } catch (e) {
    console.error("Failed to create challenge:", e);
    alert(e?.message || "Failed to create challenge");
  }
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
