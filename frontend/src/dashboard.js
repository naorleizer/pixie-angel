import { state } from "./state.js";
import { showScreen, navigate } from "./navigation.js";
import { openChat } from "./chat.js";
import { apiRequest } from "./api.js";

let challenges = [];

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
    challenges = await apiRequest("/api/challenges");
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
            <p class="text-sm font-semibold ${theme.text}">${c.title}</p>
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

// Show challenge detail modal on dashboard
export async function showChallengeDetailOnDashboard(challengeId) {
  try {
    const { getChallengeDetail, addChallengeUpdate } = await import('./api.js');
    const challenge = await getChallengeDetail(challengeId);
    
    const modal = document.getElementById('dashboard-challenge-detail-modal');
    const content = document.getElementById('dashboard-challenge-detail-content');
    
    if (!modal || !content) return;
    
    // Render challenge detail (reuse rendering logic from challenges.js)
    content.innerHTML = renderChallengeDetailContent(challenge);
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Setup handlers
    setupDashboardModalHandlers(challengeId);
  } catch (error) {
    console.error('Failed to load challenge detail:', error);
  }
}

function renderChallengeDetailContent(challenge) {
  const statusBadge = getChallengeStatusBadge(challenge);
  const amountDisplay = getChallengeAmountDisplay(challenge);
  const endDate = challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'No deadline';
  
  return `
    <div class="mb-4 flex justify-between items-start">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 mb-1">${challenge.title}</h2>
        ${challenge.description ? `<p class="text-gray-600">${challenge.description}</p>` : ''}
      </div>
      <button id="close-dashboard-modal-btn" class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    
    <div class="mb-6">
      ${statusBadge}
      <div class="mt-3 text-sm text-gray-600">
        Deadline: ${endDate}
      </div>
    </div>
    
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      ${amountDisplay}
      <div class="mt-2 text-sm text-gray-600">
        Target: ₪${challenge.target_amount.toFixed(0)}
      </div>
    </div>
    
    ${challenge.status === 'active' ? renderDashboardAddUpdateForm() : ''}
    
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">Updates History</h3>
      ${renderDashboardUpdatesTimeline(challenge.updates || [])}
    </div>
  `;
}

function getChallengeStatusBadge(challenge) {
  const status = challenge.status;
  const progressStatus = challenge.progress_status;
  
  if (status === 'completed') {
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>`;
  } else if (status === 'failed') {
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>`;
  } else {
    if (progressStatus === 'on_track') {
      return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">On Track</span>`;
    } else {
      return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Below Target</span>`;
    }
  }
}

function getChallengeAmountDisplay(challenge) {
  const current = challenge.current_amount;
  const target = challenge.target_amount;
  const arrow = current >= 0 ? '↑' : '↓';
  const colorClass = current >= 0 ? 'text-green-600' : 'text-red-600';
  
  return `
    <div class="flex justify-between items-baseline">
      <div class="${colorClass} font-bold text-2xl">
        <span class="mr-1">${arrow}</span>
        ₪${Math.abs(current).toFixed(0)}
      </div>
      <div class="text-gray-500 text-sm">
        / ₪${target.toFixed(0)}
      </div>
    </div>
  `;
}

function renderDashboardAddUpdateForm() {
  return `
    <div class="mb-6 p-4 bg-blue-50 rounded-lg">
      <h3 class="font-semibold text-gray-900 mb-3">Add Update</h3>
      <form id="dashboard-add-update-form">
        <div class="mb-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount (₪)</label>
          <input type="number" id="dashboard-update-amount" step="0.01" required 
                 class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                 placeholder="Enter amount (positive for savings, negative for spending)">
          <p class="text-xs text-gray-500 mt-1">Use positive numbers for savings, negative for spending</p>
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input type="text" id="dashboard-update-description" required 
                 class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                 placeholder="e.g., Saved 10 ILS by not buying coffee">
        </div>
        <button type="submit" class="btn-primary w-full">
          Add Update
        </button>
      </form>
    </div>
  `;
}

function renderDashboardUpdatesTimeline(updates) {
  if (!updates || updates.length === 0) {
    return `<p class="text-gray-500 text-sm">No updates yet.</p>`;
  }
  
  return `
    <div class="space-y-3">
      ${updates.map(update => {
        const arrow = update.amount >= 0 ? '↑' : '↓';
        const colorClass = update.amount >= 0 ? 'text-green-600' : 'text-red-600';
        const date = new Date(update.created_at).toLocaleString();
        
        return `
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div class="${colorClass} font-bold text-xl">
              ${arrow}
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <p class="text-gray-900">${update.description}</p>
                <span class="${colorClass} font-semibold">₪${Math.abs(update.amount).toFixed(2)}</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">${date}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function setupDashboardModalHandlers(challengeId) {
  const closeBtn = document.getElementById('close-dashboard-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDashboardModal);
  }
  
  const form = document.getElementById('dashboard-add-update-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleDashboardAddUpdate(challengeId);
    });
  }
  
  // Close on background click
  const modal = document.getElementById('dashboard-challenge-detail-modal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeDashboardModal();
    }
  });
}

function closeDashboardModal() {
  const modal = document.getElementById('dashboard-challenge-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  
  // Reload challenges to reflect updates
  loadChallenges();
}

async function handleDashboardAddUpdate(challengeId) {
  const amount = parseFloat(document.getElementById('dashboard-update-amount').value);
  const description = document.getElementById('dashboard-update-description').value;
  
  try {
    const { addChallengeUpdate } = await import('./api.js');
    const updatedChallenge = await addChallengeUpdate(challengeId, amount, description);
    
    // Re-render the modal with updated data
    const content = document.getElementById('dashboard-challenge-detail-content');
    if (content) {
      content.innerHTML = renderChallengeDetailContent(updatedChallenge);
      setupDashboardModalHandlers(challengeId);
    }
  } catch (error) {
    console.error('Failed to add update:', error);
    alert('Failed to add update. Please try again.');
  }
}
