import { state } from "./state.js";
import { showScreen } from "./navigation.js";
import { openChat } from "./chat.js";
import { apiRequest } from "./api.js";

let challenges = [];

export async function loadChallenges() {
  const track = document.getElementById("challenge-track");
  const dotsContainer = document.getElementById("challenge-dots");
  if (!track) return;
  
  try {
    challenges = await apiRequest("/api/challenges");
    renderChallenges(challenges, track, dotsContainer);
    updateChallengeBalanceWidget(challenges);
  } catch (error) {
    console.error("Failed to fetch challenges:", error);
    renderEmptyState(track);
    updateChallengeBalanceWidget([]);
  }
}

function renderChallenges(items, track, dotsContainer) {
  if (!items || items.length === 0) {
    renderEmptyState(track);
    if (dotsContainer) dotsContainer.innerHTML = '';
    return;
  }

  track.innerHTML = items.map((c, i) => createChallengeCard(c, i)).join("");
  
  if (dotsContainer) {
    dotsContainer.innerHTML = items.map((_, i) => `
      <button data-challenge-dot class="h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-indigo-600' : 'bg-slate-300'}" 
        onclick="setChallengeSlide(${i})" aria-label="Slide ${i + 1}">
      </button>
    `).join("");
  }
  
  state.challengeCarouselIndex = 0;
  track.style.transform = `translateX(0%)`;
  
  // Re-init swipe logic on the live elements
  // We attach it to the container #challenge-track which persists in DOM?
  // No, we modify innerHTML of #challenge-track.
  // The event listeners were attached to #challenge-track node in `main.js` calling `initChallengeSwipe`.
  // As long as #challenge-track node itself is not replaced (we only change its innerHTML), listeners stay.
}

function updateChallengeBalanceWidget(items) {
  const savedEl = document.getElementById("balance-saved");
  const overspentEl = document.getElementById("balance-overspent");
  const savedBar = document.getElementById("balance-bar-saved");
  const overspentBar = document.getElementById("balance-bar-overspent");
  const summaryEl = document.getElementById("balance-summary");

  let saved = 0;
  let overspent = 0;

  (items || []).forEach((c) => {
    if (c.type === "savings") {
      saved += Number(c.current_amount || 0);
    } else if (c.type === "spending_limit") {
      const curr = Number(c.current_amount || 0);
      const target = Number(c.target_amount || 0);
      if (curr > target) overspent += (curr - target);
      else saved += (target - curr);
    }
  });

  const total = saved + overspent;
  if (savedEl) savedEl.textContent = `Saved: ${Math.round(saved)}₪`;
  if (overspentEl) overspentEl.textContent = `Overspent: ${Math.round(overspent)}₪`;

  if (total > 0) {
    const savedPct = (saved / total) * 100;
    const overspentPct = (overspent / total) * 100;
    if (savedBar) savedBar.style.width = `${savedPct}%`;
    if (overspentBar) overspentBar.style.width = `${overspentPct}%`;
  } else {
    if (savedBar) savedBar.style.width = "0%";
    if (overspentBar) overspentBar.style.width = "0%";
  }

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

function renderEmptyState(track) {
  track.innerHTML = `
    <div class="min-w-full pr-2">
      <div class="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-8 text-center">
        <p class="text-sm text-slate-600">No challenges yet</p>
        <p class="text-xs text-slate-500 mt-1">Tap "New via chat" to create your first challenge!</p>
      </div>
    </div>
  `;
}

function createChallengeCard(c, index) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-900', sub: 'text-indigo-700', barBg: 'bg-indigo-100', barFill: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', sub: 'text-emerald-700', barBg: 'bg-emerald-100', barFill: 'bg-emerald-500' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-900', sub: 'text-rose-700', barBg: 'bg-rose-100', barFill: 'bg-rose-500' },
  };
  
  const theme = colors[c.color] || colors.indigo;
  const percent = c.target_amount > 0 ? Math.min(100, (c.current_amount / c.target_amount) * 100) : 0;
  const wrapperClass = "min-w-full pr-2"; 
  const progressLabel = c.type === 'spending_limit' ? 'Spent' : 'Saved';
  const deadlineText = c.end_date ? `Ends ${new Date(c.end_date).toLocaleDateString()}` : 'Ongoing';

  return `
    <div class="${wrapperClass}" id="challenge-card-${index}">
      <div class="rounded-2xl ${theme.bg} ${theme.border} px-4 py-4 border">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold ${theme.text}">${c.title}</p>
            <p class="text-xs ${theme.sub} opacity-80 mt-1">${deadlineText}</p>
          </div>
          <span class="text-[10px] ${theme.sub} bg-white/50 px-2 py-1 rounded-full uppercase tracking-wide">
            ${c.status}
          </span>
        </div>
        <div class="mt-3 space-y-1">
          <div class="flex justify-between text-[11px] text-slate-600">
            <span>${progressLabel}</span>
            <span>${c.current_amount} / ${c.target_amount}₪</span>
          </div>
          <div class="w-full h-2 rounded-full ${theme.barBg}">
            <div class="h-2 rounded-full ${theme.barFill}" style="width: ${percent}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setChallengeSlide(i) {
  const slides = document.querySelectorAll("[id^='challenge-card-']");
  const total = Math.max(1, slides.length);
  const clamped = Math.max(0, Math.min(i, total - 1));
  state.challengeCarouselIndex = clamped;

  const track = document.getElementById("challenge-track");
  if (track) {
    track.style.transform = `translateX(-${clamped * 100}%)`;
  }

  const dots = document.querySelectorAll("[data-challenge-dot]");
  dots.forEach((d, idx) => {
    const active = idx === clamped;
    d.classList.toggle("bg-indigo-600", active);
    d.classList.toggle("bg-slate-300", !active);
  });
}

// Kept for backward compat if main.js calls it
export function updateChallengeCarousel() {
  loadChallenges();
}

export function initChallengeSwipe() {
  const track = document.getElementById("challenge-track");
  if (!track) return;

  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let isSwiping = false;

  const threshold = 40; 

  track.addEventListener("touchstart", (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
    deltaX = 0;
    isSwiping = false;
  }, { passive: true });

  track.addEventListener("touchmove", (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy)) {
      deltaX = dx;
      isSwiping = true;
    }
  }, { passive: true });

  track.addEventListener("touchend", () => {
    if (!isSwiping || Math.abs(deltaX) < threshold) return;
    const direction = deltaX < 0 ? 1 : -1;
    setChallengeSlide(state.challengeCarouselIndex + direction);
  }, { passive: true });
}

export function openChatFromDashboard(story = "challenge", reset = false) {
  openChat(story, reset);
}

export function viewChallengeOnDashboard(event) {
  if (event) event.preventDefault?.();

  showScreen("screen-dashboard", true);
  setChallengeSlide(0);
}
