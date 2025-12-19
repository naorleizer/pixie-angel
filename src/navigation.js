import { state } from "./state.js";

/**
 * Show a screen by id. Optionally push it to stack for back navigation.
 */
export function showScreen(screenId, pushToStack = true) {
  const screens = document.querySelectorAll("[id^='screen-']");
  screens.forEach((s) => s.classList.add("hidden"));

  const target = document.getElementById(screenId);
  if (!target) return;
  target.classList.remove("hidden");

  if (pushToStack) {
    const top = state.screenStack[state.screenStack.length - 1];
    if (top !== screenId) state.screenStack.push(screenId);
  }
}

export function goToScreen(screenId) {
  showScreen(screenId, true);
}

export function goBack() {
  // Keep at least one screen
  if (state.screenStack.length <= 1) return;

  // Pop current
  state.screenStack.pop();
  const prev = state.screenStack[state.screenStack.length - 1];
  showScreen(prev, false);
}
