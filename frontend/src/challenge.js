import { state } from "./state.js";
import { goBack } from "./navigation.js";
import { createChallenge as createChallengeAPI } from "./api.js";
import { loadChallenges } from "./dashboard.js";

// Track current duration type
let currentDurationType = 'for-x';

export function updateDurationMax() {
  // Update the max attribute based on selected unit
  const input = document.getElementById('challenge-duration-value');
  const unit = document.getElementById('challenge-duration-unit')?.value || 'months';
  
  if (input) {
    let newMax;
    if (unit === 'days') {
      newMax = 365;
    } else if (unit === 'weeks') {
      newMax = 52;
    } else {
      newMax = 12; // months
    }
    
    input.max = newMax;
    
    // If current value exceeds new max, cap it
    const currentValue = parseInt(input.value || '0', 10);
    if (currentValue > newMax) {
      input.value = newMax;
    }
  }
}

export function validateDurationValue() {
  // Validate and cap the value in real-time as user types
  const input = document.getElementById('challenge-duration-value');
  const unit = document.getElementById('challenge-duration-unit')?.value || 'months';
  
  if (input && input.value) {
    let max;
    if (unit === 'days') {
      max = 365;
    } else if (unit === 'weeks') {
      max = 52;
    } else {
      max = 12; // months
    }
    
    let value = parseInt(input.value, 10);
    
    // Cap at max and show toast if exceeded
    if (value > max) {
      input.value = max;
      // Show friendly toast message
      if (window.showToast) {
        window.showToast('Pixie\'s designed to be short-term! Let\'s keep it under a year 🎯', 'info');
      }
    }
    
    // Cap at min (1)
    if (value < 1) {
      input.value = 1;
    }
  }
}

export function setDateMax() {
  // Set the max date to 1 year from today
  const dateInput = document.getElementById('challenge-end-date');
  if (dateInput) {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    
    // Format as YYYY-MM-DD
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    dateInput.max = `${year}-${month}-${day}`;
  }
}

export function setDurationType(type) {
  currentDurationType = type;
  
  const forXInput = document.getElementById('for-x-input');
  const untilDateInput = document.getElementById('until-date-input');
  const forXBtn = document.querySelector('[onclick="setDurationType(\'for-x\')"]');
  const untilDateBtn = document.querySelector('[onclick="setDurationType(\'until-date\')"]');
  
  if (type === 'for-x') {
    forXInput?.classList.remove('hidden');
    untilDateInput?.classList.add('hidden');
    forXBtn?.classList.add('bg-indigo-600', 'text-white');
    forXBtn?.classList.remove('bg-slate-50', 'text-slate-600', 'border', 'border-slate-200');
    untilDateBtn?.classList.remove('bg-indigo-600', 'text-white');
    untilDateBtn?.classList.add('bg-slate-50', 'text-slate-600', 'border', 'border-slate-200');
    updateDurationMax(); // Update max value based on current unit
  } else {
    forXInput?.classList.add('hidden');
    untilDateInput?.classList.remove('hidden');
    forXBtn?.classList.remove('bg-indigo-600', 'text-white');
    forXBtn?.classList.add('bg-slate-50', 'text-slate-600', 'border', 'border-slate-200');
    untilDateBtn?.classList.add('bg-indigo-600', 'text-white');
    untilDateBtn?.classList.remove('bg-slate-50', 'text-slate-600', 'border', 'border-slate-200');
    
    // Set default date to 2 months from now
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);
    const dateInput = document.getElementById('challenge-end-date');
    if (dateInput) {
      dateInput.valueAsDate = endDate;
      setDateMax(); // Set the max date
    }
  }
}

export async function createChallenge() {
  // Read form values
  const titleEl = document.getElementById("challenge-title");
  const amountEl = document.getElementById("challenge-amount");
  const durValEl = document.getElementById("challenge-duration-value");
  const durUnitEl = document.getElementById("challenge-duration-unit");
  const endDateEl = document.getElementById("challenge-end-date");

  const title = titleEl?.value?.trim();
  const targetAmount = parseFloat(amountEl?.value || "0");

  if (!title || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    alert("Please fill in all required fields with valid values.");
    return;
  }

  // Compute end_date based on duration type
  const now = new Date();
  let end;

  if (currentDurationType === 'for-x') {
    const durationValue = parseInt(durValEl?.value || "0", 10);
    const durationUnit = durUnitEl?.value || "months";

    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      alert("Please fill in all required fields with valid values.");
      return;
    }

    end = new Date(now);
    if (durationUnit === "days") end.setDate(end.getDate() + durationValue);
    else if (durationUnit === "weeks") end.setDate(end.getDate() + durationValue * 7);
    else end.setMonth(end.getMonth() + durationValue); // months default
  } else {
    // until-date
    if (!endDateEl?.value) {
      alert("Please select an end date.");
      return;
    }
    end = new Date(endDateEl.value);
  }

  // Validate: maximum duration is 1 year
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (end > oneYearFromNow) {
    if (window.showToast) {
        window.showToast('Pixie\'s designed to be short-term! Let\'s keep it under a year 🎯', 'info');
    } else {
      alert("Challenges cannot exceed 1 year in duration. Please choose a shorter timeframe.");
    }
    return;
  }

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
