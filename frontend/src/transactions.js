import { apiRequest, getCategories, updateTransactionCategory } from "./api.js";
import { navigate } from "./navigation.js";

let allTransactions = [];
let allCategories = [];

export function openTransactions() {
  navigate('transactions');
  loadTransactions();
}

export async function loadTransactions() {
  const tbody = document.getElementById("transactions-tbody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-slate-500">Loading...</td></tr>';

  try {
    const [transactions, catsResp] = await Promise.all([
      apiRequest("/api/transactions"),
      getCategories()
    ]);
    allTransactions = transactions;
    allCategories = catsResp.categories || [];
    
    // Populate category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      const currentValue = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
        allCategories.map(c => `<option value="${c}">${c}</option>`).join('');
      categoryFilter.value = currentValue;
      
      // Attach filter event listener
      categoryFilter.onchange = applyFilters;
    }
    
    renderTransactions(allTransactions);
  } catch (error) {
    console.error("Failed to load transactions", error);
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-red-500">Failed to load transactions.</td></tr>';
  }
}

function applyFilters() {
  const categoryFilter = document.getElementById('category-filter')?.value;
  
  let filtered = allTransactions;
  
  if (categoryFilter) {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }
  
  renderTransactions(filtered);
}

function renderTransactions(transactions) {
  const tbody = document.getElementById("transactions-tbody");
  if (!tbody) return;

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-8">
          <p class="text-sm text-slate-600">No transactions found</p>
          <p class="text-xs text-slate-500 mt-1">Try adjusting your filters or upload transactions.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const isIncome = t.amount > 0;
    const amountClass = isIncome ? 'text-green-600' : 'text-red-600';
    const amountPrefix = isIncome ? '+' : '';
    
    const date = new Date(t.date).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short'
    });

    const title = t.description || t.merchant || 'Unknown';
    const current = t.category || '';
    const opts = allCategories.map(c => `<option value="${c}" ${t.category === c ? 'selected' : ''}>${c}</option>`).join('');
    
    // Account/Card info
    let accountInfo = '';
    if (t.account_name) {
      accountInfo = t.account_name;
      if (t.card_last_4) {
        accountInfo += ` ••${t.card_last_4}`;
      }
    } else if (t.account_type) {
      accountInfo = t.account_type;
    }
    
    // Additional metadata
    let metadata = [];
    if (t.merchant_country && t.merchant_country !== 'IL') {
      metadata.push(`🌍 ${t.merchant_country}`);
    }
    if (t.is_recurring) {
      metadata.push('🔄 Recurring');
    }
    const metadataStr = metadata.length > 0 ? metadata.join(' • ') : '';
    
    return `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="px-0 py-0 w-20">
          <div class="text-xs font-medium text-slate-900">${date}</div>
        </td>
        <td class="px-0 py-0">
          <div class="text-sm font-medium text-slate-900 line-clamp-1">${title}</div>
        </td>
        <td class="px-0 py-0">
          <select id="tx-cat-${t.id}" 
                  class="text-xs border border-slate-300 rounded px-0 py-0 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full"
                  onchange="window._onCategoryChange(${t.id})">
            <option value="">Uncategorized</option>
            ${opts}
          </select>
        </td>
      </tr>
      <tr class="hover:bg-slate-50 border-b border-slate-300">
        <td colspan="2" class="px-0 py-0">
          <div class="text-xs text-slate-500">
            ${accountInfo ? `<span class="font-medium">${accountInfo}</span>` : ''}
            ${accountInfo && metadataStr ? ' • ' : ''}${metadataStr}
          </div>
        </td>
        <td class="px-0 py-0 text-right">
          <span class="text-sm font-semibold ${amountClass}">${amountPrefix}${Math.abs(t.amount).toFixed(2)}₪</span>
        </td>
      </tr>
    `;
  }).join('');

  // Bind change handler globally
  window._onCategoryChange = async function (id) {
    try {
      const select = document.getElementById(`tx-cat-${id}`);
      const val = select.value || null;
      
      await updateTransactionCategory(id, val);
      
      // Update the transaction in our local array
      const tx = allTransactions.find(t => t.id === id);
      if (tx) {
        tx.category = val;
        tx.categorization_source = 'manual';
        tx.categorization_confidence = 1.0;
      }
      
      // Re-render to update badges
      applyFilters();
      
    } catch (e) {
      console.error('Failed to update category', e);
      alert(e?.message || 'Failed to update category');
    }
  };
}
