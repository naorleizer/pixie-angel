import { state } from "./state.js";
import { showScreen, navigate } from "./navigation.js";
import { openChat } from "./chat.js";
import { apiRequest } from "./api.js";

let challenges = [];

// Helper to truncate text to max length
function truncate(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Navigate to challenge detail from dashboard card
export function navigateToChallengeDetail(challengeId) {
  navigate('challenges');
  // The challenges screen will handle showing the detail
  setTimeout(() => {
    if (window.showChallengeDetail) {
      window.showChallengeDetail(challengeId);
    }
  }, 100);
}

export async function loadChallenges() {
  const track = document.getElementById("challenge-track");
  const dotsContainer = document.getElementById("challenge-dots");
  if (!track) return;
  
  try {
    challenges = await apiRequest("/api/challenges?filter=current");
    renderChallenges(challenges, track, dotsContainer);
    updateChallengeBalanceWidget(challenges);
  } catch (error) {
    console.error("Failed to fetch challenges:", error);
    renderEmptyState(track);
    updateChallengeBalanceWidget([]);
  }
}

export async function loadRecentTransactions() {
  const emptyState = document.getElementById("transactions-empty");
  const list = document.getElementById("transactions-list");
  if (!list || !emptyState) return;

  try {
    const transactions = await apiRequest("/api/transactions");
    
    if (!transactions || transactions.length === 0) {
      emptyState.classList.remove("hidden");
      list.classList.add("hidden");
      return;
    }

    // Show only first 5 recent transactions
    const recent = transactions.slice(0, 5);
    
    emptyState.classList.add("hidden");
    list.classList.remove("hidden");
    
    list.innerHTML = recent.map(t => {
      const isIncome = t.amount > 0;
      const amountClass = isIncome ? 'text-green-600' : 'text-red-600';
      const amountPrefix = isIncome ? '+' : '';
      
      const date = new Date(t.date).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric'
      });
      const title = t.description || t.merchant || 'Unknown';
      
      return `
        <div class="flex items-center justify-between py-1 px-0 border-b border-slate-100 last:border-0">
          <div class="flex-1">
            <p class="text-sm font-medium text-slate-900 truncate">${title}</p>
            <p class="text-xs text-slate-500 mt-0.5">${date}</p>
          </div>
          <p class="text-sm font-semibold ${amountClass} ml-2">${amountPrefix}${Math.abs(t.amount).toFixed(2)}₪</p>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    emptyState.classList.remove("hidden");
    list.classList.add("hidden");
  }
}

function renderChallenges(items, track, dotsContainer) {
  const challenges = items || [];
  
  // Add cards for existing challenges + "create new" card
  const challengeCards = challenges.map((c, i) => createChallengeCard(c, i)).join("");
  const createNewCard = createNewChallengeCard(challenges.length);
  track.innerHTML = challengeCards + createNewCard;
  
  if (dotsContainer) {
    // Regular dots for challenges + plus icon for create card
    const challengeDots = challenges.map((_, i) => `
      <button data-challenge-dot class="h-2.5 w-2.5 rounded-full ${i === 0 && challenges.length > 0 ? 'bg-indigo-600' : 'bg-slate-300'}" 
        onclick="setChallengeSlide(${i})" aria-label="Slide ${i + 1}">
      </button>
    `).join("");
    
    const plusDot = `
      <button data-challenge-dot class="h-2.5 w-2.5 flex items-center justify-center ${challenges.length === 0 ? 'text-indigo-600' : 'text-slate-400'} hover:text-indigo-600" 
        onclick="setChallengeSlide(${challenges.length})" aria-label="Create new challenge">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    `;
    
    dotsContainer.innerHTML = challengeDots + plusDot;
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
  const balanceAmountEl = document.getElementById("balance-amount");
  const savedBar = document.getElementById("balance-bar-saved");
  const overspentBar = document.getElementById("balance-bar-overspent");
  const summaryEl = document.getElementById("balance-summary");

  // Calculate total balance across all challenges
  let totalBalance = 0;
  (items || []).forEach((c) => {
    totalBalance += Number(c.current_amount || 0);
  });

  // Update amount display with color based on positive/negative
  if (balanceAmountEl) {
    if (totalBalance >= 0) {
      balanceAmountEl.textContent = `Saved: ${Math.round(totalBalance)}₪`;
      balanceAmountEl.className = "font-semibold text-emerald-700";
    } else {
      balanceAmountEl.textContent = `Overspent: ${Math.round(Math.abs(totalBalance))}₪`;
      balanceAmountEl.className = "font-semibold text-rose-700";
    }
  }

  // Update progress bars
  if (totalBalance >= 0) {
    if (savedBar) savedBar.style.width = "100%";
    if (overspentBar) overspentBar.style.width = "0%";
  } else {
    if (savedBar) savedBar.style.width = "0%";
    if (overspentBar) overspentBar.style.width = "100%";
  }

  if (summaryEl) {
    let message = "";
    if (totalBalance > 0) {
      message = `Pixie summary: you're <span class="font-semibold text-emerald-700">on track</span>! Keep it up 💪`;
    } else if (totalBalance < 0) {
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
        <p class="text-xs text-slate-500 mt-1">Create your first challenge to get started!</p>
      </div>
    </div>
  `;
}

function createNewChallengeCard(index) {
  return `
    <div class="min-w-full pr-2" id="challenge-card-${index}">
      <div class="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-200 px-4 py-8 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all" onclick="navigate('challenge')">
        <div class="flex flex-col items-center justify-center gap-3 text-center">
          <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-indigo-900">Create New Challenge</p>
            <p class="text-xs text-indigo-600 mt-1">Set a new savings or spending goal</p>
          </div>
        </div>
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
  
  // Status badge styling
  let statusBadge = '';
  if (c.status === 'completed') {
    statusBadge = '<span class="text-[10px] bg-green-100 text-green-800 px-2 py-1 rounded-full uppercase tracking-wide">Completed</span>';
  } else if (c.status === 'failed') {
    statusBadge = '<span class="text-[10px] bg-red-100 text-red-800 px-2 py-1 rounded-full uppercase tracking-wide">Failed</span>';
  } else if (c.progress_status === 'on_track') {
    statusBadge = '<span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded-full uppercase tracking-wide">On Track</span>';
  } else {
    statusBadge = '<span class="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full uppercase tracking-wide">Below Target</span>';
  }
  
  // Amount display with arrow and color
  const arrow = c.current_amount >= 0 ? '↑' : '↓';
  const amountClass = c.current_amount >= 0 ? 'text-green-600' : 'text-red-600';

  return `
    <div class="${wrapperClass}" id="challenge-card-${index}">
      <div class="rounded-2xl ${theme.bg} ${theme.border} px-4 py-4 border cursor-pointer hover:shadow-md transition-shadow" onclick="showChallengeDetailOnDashboard(${c.id})">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold ${theme.text}">${truncate(c.title, 100)}</p>
            <p class="text-xs ${theme.sub} opacity-80 mt-1">${deadlineText}</p>
          </div>
          ${statusBadge}
        </div>
        <div class="mt-3 flex justify-between items-baseline">
          <span class="${amountClass} font-bold text-xl">${arrow} ₪${Math.abs(c.current_amount).toFixed(0)}</span>
          <span class="text-xs text-slate-500">/ ₪${c.target_amount.toFixed(0)}</span>
        </div>
        <div class="mt-3 space-y-1">
          <div class="flex justify-between text-[11px] text-slate-600">
            <span>Progress</span>
            <span>${percent.toFixed(0)}%</span>
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
    // Regular dots
    if (d.classList.contains('rounded-full')) {
      d.classList.toggle("bg-indigo-600", active);
      d.classList.toggle("bg-slate-300", !active);
    } else {
      // Plus icon - highlight when active
      if (active) {
        d.classList.add('text-indigo-600');
        d.classList.remove('text-slate-400');
      } else {
        d.classList.add('text-slate-400');
        d.classList.remove('text-indigo-600');
      }
    }
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

// Show challenge detail modal on dashboard
export async function showChallengeDetailOnDashboard(challengeId) {
  try {
    // Use the challenges screen modal (same as "View All Challenges")
    if (window.showChallengeDetail) {
      await window.showChallengeDetail(challengeId);
    }
  } catch (error) {
    console.error('Failed to load challenge detail:', error);
  }
}
