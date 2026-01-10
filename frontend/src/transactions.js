import { apiRequest, getCategories, updateTransactionCategory } from "./api.js";
import { navigate } from "./navigation.js";

export function openTransactions() {
  navigate('transactions');
  loadTransactions();
}

export async function loadTransactions() {
  const listContainer = document.getElementById("full-transactions-list");
  if (!listContainer) return;

  listContainer.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">Loading...</p>';

  try {
    const [transactions, catsResp] = await Promise.all([
      apiRequest("/api/transactions"),
      getCategories()
    ]);
    const categories = catsResp.categories || [];
    renderTransactions(transactions, categories);
  } catch (error) {
    console.error("Failed to load transactions", error);
    listContainer.innerHTML = '<p class="text-sm text-red-500 text-center py-4">Failed to load transactions.</p>';
  }
}

function renderTransactions(transactions, categories) {
  const listContainer = document.getElementById("full-transactions-list");
  if (!listContainer) return;

  if (!transactions || transactions.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-8">
        <p class="text-sm text-slate-600">No transactions found</p>
        <p class="text-xs text-slate-500 mt-1">Uploaded transactions will appear here.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = transactions.map(t => {
    const isNegative = t.amount < 0; // Assuming negative is outgoing? Or usually positive in CSV?
    // In the User0 CSV, amounts are positive, implying spending. 
    // Let's assume standard positive = spend for now unless we see "Credit" logic.
    // Actually, usually negative is spend in bank exports, but in that CSV they were positive.
    // Let's just display as is.
    
    const date = new Date(t.date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const opts = categories.map(c => `<option value="${c}" ${t.category === c ? 'selected' : ''}>${c}</option>`).join('');
    const current = t.category || 'Uncategorized';
    return `
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate text-slate-800">${t.merchant}</p>
          <div class="flex items-center gap-2 mt-1">
             <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded" id="tx-cat-badge-${t.id}">
               ${current}
             </span>
             <select id="tx-cat-${t.id}" class="text-xs border border-slate-200 rounded px-2 py-1" onchange="window._onCategoryChange(${t.id})">
               <option value="">Uncategorized</option>
               ${opts}
             </select>
             <span class="text-xs text-slate-400">${date}</span>
          </div>
        </div>
        <div class="text-sm font-semibold text-slate-700 whitespace-nowrap ml-3">
          ${t.amount.toFixed(2)}₪
        </div>
      </div>
    `;
  }).join('');

  // Bind change handler globally once
  window._onCategoryChange = async function (id) {
    try {
      const select = document.getElementById(`tx-cat-${id}`);
      const badge = document.getElementById(`tx-cat-badge-${id}`);
      const val = select.value || null;
      await updateTransactionCategory(id, val);
      if (badge) badge.textContent = val || 'Uncategorized';
    } catch (e) {
      console.error('Failed to update category', e);
      alert(e?.message || 'Failed to update category');
    }
  };

}
