import { state } from "./state.js";
import { advanceChatDemo, scrollChatToBottom } from "./chat.js";

export function calculateChallengeBalance() {
  // Calculate balance based on current challenge states
  // Challenge 1: Save 500₪ for vacation (0 saved, on track)
  // Challenge 2: Eating out budget (depends on budgetAdjusted state)
  
  let saved = 0;
  let overspent = 0;

  // Challenge 1: Vacation savings - no overspending, on track
  // (0 progress so far)

  // Challenge 2: Eating out budget
  if (state.budgetAdjusted) {
    // After adjustment: spent 465₪, new budget is 250₪/week
    // So overspent by 215₪ this week, but adjusted for next week
    overspent = 165; // Net overspend after accounting for adjustment
  } else {
    // Before adjustment: spent 250₪ on week-to-date of 300₪ budget
    // Still 50₪ under budget
    saved = 50;
    overspent = 0;
  }

  return { saved, overspent };
}

export function updateChallengeBalance() {
  const { saved, overspent } = calculateChallengeBalance();
  const total = saved + overspent;

  // Update text
  const savedEl = document.getElementById("balance-saved");
  const overspentEl = document.getElementById("balance-overspent");
  
  if (savedEl) savedEl.textContent = `Saved: ${saved}₪`;
  if (overspentEl) overspentEl.textContent = `Overspent: ${overspent}₪`;

  // Update progress bars
  const savedBar = document.getElementById("balance-bar-saved");
  const overspentBar = document.getElementById("balance-bar-overspent");

  if (total > 0) {
    const savedPct = (saved / total) * 100;
    const overspentPct = (overspent / total) * 100;
    
    if (savedBar) savedBar.style.width = `${savedPct}%`;
    if (overspentBar) overspentBar.style.width = `${overspentPct}%`;
  } else {
    // No activity yet
    if (savedBar) savedBar.style.width = "0%";
    if (overspentBar) overspentBar.style.width = "0%";
  }

  // Update summary message
  const summaryEl = document.getElementById("balance-summary");
  if (summaryEl) {
    let message = "";
    if (saved > overspent) {
      message = `Pixie summary: you're <span class="font-semibold text-emerald-700">on track</span>! Keep it up 💪`;
    } else if (overspent > saved) {
      message = `Pixie summary: you're <span class="font-semibold text-rose-700">off-track</span>. Want help turning this into a plan? Tap the chat bar below.`;
    } else {
      message = `Pixie summary: you're <span class="font-semibold text-slate-700">balanced</span>. Good work!`;
    }
    summaryEl.innerHTML = message;
  }
}

export function acceptBudgetAdjustment(event) {
  if (event) event.preventDefault?.();

  // Mark that budget was adjusted
  state.budgetAdjusted = true;

  // Hide the buttons by showing the user's "Yes" response
  const step11 = document.getElementById("chat-step-11");
  if (step11) {
    step11.classList.remove("hidden");
    step11.classList.add("chat-appear");
    setTimeout(() => step11.classList.remove("chat-appear"), 350);
  }

  scrollChatToBottom();

  // Auto-advance to confirmation after short delay
  setTimeout(() => {
    advanceChatDemo();
    updateDashboardChallenge();
    updateChallengeBalance();
  }, 800);
}

export function declineBudgetAdjustment(event) {
  if (event) event.preventDefault?.();

  // User declined - just show a simple confirmation and end conversation
  const step11 = document.getElementById("chat-step-11");
  if (step11) {
    // Change the text to "No"
    const msgEl = step11.querySelector(".rounded-2xl");
    if (msgEl) msgEl.textContent = "No, keep as is";
    
    step11.classList.remove("hidden");
    step11.classList.add("chat-appear");
    setTimeout(() => step11.classList.remove("chat-appear"), 350);
  }

  scrollChatToBottom();

  // Show a brief acknowledgment
  setTimeout(() => {
    const step12 = document.getElementById("chat-step-12");
    if (step12) {
      const msgContainer = step12.querySelector(".rounded-2xl");
      if (msgContainer) {
        msgContainer.innerHTML = `
          <p>
            No problem! Your eating out budget stays at <span class="font-semibold text-emerald-700">300₪ per week</span>.
          </p>
          <p class="mt-2 text-slate-600 text-xs">
            Let me know if you change your mind — I'm always here to help! 😊
          </p>
        `;
      }
      step12.classList.remove("hidden");
      step12.classList.add("chat-appear");
      setTimeout(() => step12.classList.remove("chat-appear"), 350);
    }
    scrollChatToBottom();
  }, 800);
}

function updateDashboardChallenge() {
  // Update the second challenge card on the dashboard to reflect the new budget
  const challengeCard = document.getElementById("challenge-card-1");
  if (!challengeCard) return;

  const titleEl = challengeCard.querySelector(".text-emerald-900");
  if (titleEl) {
    titleEl.textContent = "Spend up to 250₪ on eating out per week";
  }

  const subtitleEl = challengeCard.querySelector(".text-emerald-700\\/80");
  if (subtitleEl) {
    subtitleEl.textContent = "Track weekly dining to stay under 250₪ (adjusted)";
  }

  const spendEl = challengeCard.querySelector(".text-slate-600 span:last-child");
  if (spendEl) {
    spendEl.textContent = "120₪ / 250₪";
  }

  // Update progress bar (120/250 = 48%)
  const progressBar = challengeCard.querySelector(".bg-emerald-500");
  if (progressBar) {
    progressBar.style.width = "48%";
  }
}
