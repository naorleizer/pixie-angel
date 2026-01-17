import { getChallenges, getChallengeDetail, addChallengeUpdate } from './api.js';
import { navigate } from './navigation.js';

let currentFilter = 'current';
let currentDetailId = null;

export function initChallenges() {
  setupFilterTabs();
  setupNewChallengeButton();
  loadChallenges(currentFilter);
}

function setupFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      currentFilter = filter;
      
      // Update tab styling - pill buttons with solid/outline style
      tabs.forEach(t => {
        t.classList.remove('border-indigo-600', 'bg-indigo-600', 'text-white');
        t.classList.add('border', 'border-slate-300', 'text-slate-600');
      });
      tab.classList.remove('border', 'border-slate-300', 'text-slate-600');
      tab.classList.add('border-indigo-600', 'bg-indigo-600', 'text-white');
      
      loadChallenges(filter);
    });
  });
}

function setupNewChallengeButton() {
  const btn = document.getElementById('new-challenge-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      navigate('challenge');
    });
  }
}

async function loadChallenges(filter = 'current') {
  try {
    const challenges = await getChallenges(filter);
    renderChallenges(challenges);
  } catch (error) {
    console.error('Failed to load challenges:', error);
  }
}

function renderChallenges(challenges) {
  const grid = document.getElementById('challenges-grid');
  const emptyState = document.getElementById('empty-state');
  
  if (!challenges || challenges.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  grid.classList.remove('hidden');
  emptyState.classList.add('hidden');
  
  grid.innerHTML = challenges.map(challenge => renderChallengeCard(challenge)).join('');
  
  // Add click handlers to cards
  grid.querySelectorAll('[data-challenge-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.challengeId);
      showChallengeDetail(id);
    });
  });
}

function renderChallengeCard(challenge) {
  const progress = challenge.target_amount > 0 
    ? Math.min(100, (challenge.current_amount / challenge.target_amount) * 100)
    : 0;
  
  const statusBadge = getStatusBadge(challenge);
  const amountDisplay = getAmountDisplay(challenge);
  
  const endDate = challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'No deadline';
  
  return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow" data-challenge-id="${challenge.id}">
      <div class="flex justify-between items-start mb-3">
        <h3 class="font-semibold text-slate-900 text-sm">${challenge.title}</h3>
        ${statusBadge}
      </div>
      
      ${amountDisplay}
      
      <div class="mt-3">
        <div class="flex justify-between text-xs text-slate-600 mb-1">
          <span>Progress</span>
          <span>${progress.toFixed(0)}%</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-2">
          <div class="bg-${challenge.color}-600 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
        </div>
      </div>
      
      <div class="mt-3 text-xs text-slate-500">
        Ends: ${endDate}
      </div>
    </div>
  `;
}

function getStatusBadge(challenge) {
  const status = challenge.status;
  const progressStatus = challenge.progress_status;
  
  if (status === 'completed') {
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>`;
  } else if (status === 'failed') {
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>`;
  } else {
    // Active challenge
    if (progressStatus === 'on_track') {
      return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">On Track</span>`;
    } else {
      return `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Below Target</span>`;
    }
  }
}

function getAmountDisplay(challenge) {
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

async function showChallengeDetail(challengeId) {
  try {
    currentDetailId = challengeId;
    const challenge = await getChallengeDetail(challengeId);
    renderChallengeDetail(challenge);
    
    const detailView = document.getElementById('challenge-detail-view');
    detailView.classList.remove('hidden');
  } catch (error) {
    console.error('Failed to load challenge detail:', error);
  }
}

function renderChallengeDetail(challenge) {
  const content = document.getElementById('challenge-detail-content');
  const statusBadge = getStatusBadge(challenge);
  const amountDisplay = getAmountDisplay(challenge);
  const endDate = challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'No deadline';
  
  content.innerHTML = `
    <div class="mb-4 flex justify-between items-start">
      <div>
        <h2 class="text-xl font-bold text-slate-900 mb-1">${challenge.title}</h2>
        ${challenge.description ? `<p class="text-sm text-slate-600">${challenge.description}</p>` : ''}
      </div>
      <button id="close-detail-btn" class="text-slate-400 hover:text-slate-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    
    <div class="mb-4">
      ${statusBadge}
      <div class="mt-2 text-xs text-slate-600">
        Deadline: ${endDate}
      </div>
    </div>
    
    <div class="mb-6 p-4 bg-slate-50 rounded-xl">
      ${amountDisplay}
      <div class="mt-2 text-xs text-slate-600">
        Target: ₪${challenge.target_amount.toFixed(0)}
      </div>
    </div>
    
    ${challenge.status === 'active' ? renderAddUpdateForm() : ''}
    
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-slate-900 mb-3">Updates History</h3>
      ${renderUpdatesTimeline(challenge.updates || [])}
    </div>
    
    <div class="mt-6 flex gap-3">
      <button id="back-to-challenges-btn" class="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
        Close
      </button>
    </div>
  `;
  
  setupDetailHandlers();
}

function renderAddUpdateForm() {
  return `
    <div class="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
      <h3 class="text-sm font-semibold text-slate-900 mb-3">Add Update</h3>
      <form id="add-update-form">
        <div class="mb-3">
          <label class="block text-xs font-medium text-slate-700 mb-1">Amount (₪)</label>
          <input type="number" id="update-amount" step="0.01" required 
                 class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                 placeholder="Enter amount (positive for savings, negative for spending)">
          <p class="text-xs text-slate-500 mt-1">Use positive numbers for savings, negative for spending</p>
        </div>
        <div class="mb-3">
          <label class="block text-xs font-medium text-slate-700 mb-1">Description</label>
          <input type="text" id="update-description" required 
                 class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                 placeholder="e.g., Saved 10 ILS by not buying coffee">
        </div>
        <button type="submit" class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          Add Update
        </button>
      </form>
    </div>
  `;
}

function renderUpdatesTimeline(updates) {
  if (!updates || updates.length === 0) {
    return `<p class="text-slate-500 text-xs">No updates yet.</p>`;
  }
  
  return `
    <div class="space-y-2">
      ${updates.map(update => {
        const arrow = update.amount >= 0 ? '↑' : '↓';
        const colorClass = update.amount >= 0 ? 'text-green-600' : 'text-red-600';
        const date = new Date(update.created_at).toLocaleString();
        
        return `
          <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <div class="${colorClass} font-bold text-lg">
              ${arrow}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start gap-2">
                <p class="text-sm text-slate-900 flex-1">${update.description}</p>
                <span class="${colorClass} font-semibold text-sm whitespace-nowrap">₪${Math.abs(update.amount).toFixed(2)}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1">${date}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function setupDetailHandlers() {
  const closeBtn = document.getElementById('close-detail-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeChallengeDetail);
  }
  
  const backBtn = document.getElementById('back-to-challenges-btn');
  if (backBtn) {
    backBtn.addEventListener('click', closeChallengeDetail);
  }
  
  const form = document.getElementById('add-update-form');
  if (form) {
    form.addEventListener('submit', handleAddUpdate);
  }
  
  // Close on background click
  const detailView = document.getElementById('challenge-detail-view');
  detailView.addEventListener('click', (e) => {
    if (e.target === detailView) {
      closeChallengeDetail();
    }
  });
}

function closeChallengeDetail() {
  const detailView = document.getElementById('challenge-detail-view');
  detailView.classList.add('hidden');
  currentDetailId = null;
  
  // Reload challenges to reflect any updates
  loadChallenges(currentFilter);
}

async function handleAddUpdate(e) {
  e.preventDefault();
  
  const amount = parseFloat(document.getElementById('update-amount').value);
  const description = document.getElementById('update-description').value;
  
  try {
    const updatedChallenge = await addChallengeUpdate(currentDetailId, amount, description);
    
    // Re-render the detail view with updated data
    renderChallengeDetail(updatedChallenge);
    
    // Clear form
    document.getElementById('add-update-form').reset();
  } catch (error) {
    console.error('Failed to add update:', error);
    alert('Failed to add update. Please try again.');
  }
}

// Make function available globally for onclick handlers
window.showChallengeDetail = showChallengeDetail;
