import { apiRequest, getCategories, updateTransactionCategory, createTransaction, updateTransaction, deleteTransaction } from "./api.js";
import { navigate } from "./navigation.js";

let allTransactions = [];
let allCategories = [];
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let isExpense = true; // Toggle state for expense/income

export function openTransactions() {
  navigate('transactions');
  currentPage = 1;
  loadTransactions();
}

export async function loadTransactions(page = 1) {
  const tbody = document.getElementById("transactions-tbody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">Loading...</td></tr>';

  try {
    const categoryFilter = document.getElementById('category-filter')?.value || null;
    
    const [transactionsResp, catsResp] = await Promise.all([
      apiRequest(`/api/transactions?page=${page}&limit=50${categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : ''}`),
      getCategories()
    ]);
    
    // Handle new paginated response format
    allTransactions = transactionsResp.transactions || transactionsResp;
    currentPage = transactionsResp.page || 1;
    totalPages = transactionsResp.pages || 1;
    totalItems = transactionsResp.total || allTransactions.length;
    
    allCategories = catsResp.categories || [];
    
    // Populate category filter
    const categoryFilterEl = document.getElementById('category-filter');
    if (categoryFilterEl) {
      const currentValue = categoryFilterEl.value;
      categoryFilterEl.innerHTML = '<option value="">All Categories</option>' + 
        allCategories.map(c => `<option value="${c}">${c}</option>`).join('');
      categoryFilterEl.value = currentValue;
      
      // Attach filter event listener
      categoryFilterEl.onchange = () => {
        currentPage = 1;
        loadTransactions(1);
      };
    }
    
    // Populate modal category dropdown
    const modalCategorySelect = document.getElementById('transaction-category');
    if (modalCategorySelect) {
      modalCategorySelect.innerHTML = '<option value="">Auto-detect</option>' +
        allCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    renderTransactions(allTransactions);
    updatePaginationUI();
    setupEventListeners();
  } catch (error) {
    console.error("Failed to load transactions", error);
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">Failed to load transactions.</td></tr>';
  }
}

function updatePaginationUI() {
  const paginationInfo = document.getElementById('pagination-info');
  const paginationPages = document.getElementById('pagination-pages');
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');
  
  if (paginationInfo) {
    const start = totalItems === 0 ? 0 : (currentPage - 1) * 50 + 1;
    const end = Math.min(currentPage * 50, totalItems);
    paginationInfo.textContent = `Showing ${start}-${end} of ${totalItems}`;
  }
  
  if (paginationPages) {
    paginationPages.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  
  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        loadTransactions(currentPage - 1);
      }
    };
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        loadTransactions(currentPage + 1);
      }
    };
  }
}

function setupEventListeners() {
  // Add transaction button
  const addBtn = document.getElementById('add-transaction-btn');
  if (addBtn) {
    addBtn.onclick = () => openTransactionModal();
  }
  
  // Modal close button
  const closeBtn = document.getElementById('transaction-modal-close');
  if (closeBtn) {
    closeBtn.onclick = closeTransactionModal;
  }
  
  // Modal backdrop click
  const modal = document.getElementById('transaction-modal');
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeTransactionModal();
    };
  }
  
  // Delete confirmation modal
  const deleteModal = document.getElementById('delete-confirm-modal');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  
  if (deleteModal) {
    deleteModal.onclick = (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    };
  }
  if (deleteCancelBtn) {
    deleteCancelBtn.onclick = closeDeleteModal;
  }
  if (deleteConfirmBtn) {
    deleteConfirmBtn.onclick = confirmDelete;
  }
  
  // Toggle buttons
  const toggleExpense = document.getElementById('toggle-expense');
  const toggleIncome = document.getElementById('toggle-income');
  
  if (toggleExpense) {
    toggleExpense.onclick = () => setAmountType(true);
  }
  if (toggleIncome) {
    toggleIncome.onclick = () => setAmountType(false);
  }
  
  // Form submission
  const form = document.getElementById('transaction-form');
  if (form) {
    form.onsubmit = handleFormSubmit;
  }
}

function setAmountType(expense) {
  isExpense = expense;
  const toggleExpense = document.getElementById('toggle-expense');
  const toggleIncome = document.getElementById('toggle-income');
  
  if (expense) {
    toggleExpense.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-red-500 text-white';
    toggleIncome.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-600 hover:bg-slate-200';
  } else {
    toggleExpense.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-600 hover:bg-slate-200';
    toggleIncome.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-green-500 text-white';
  }
}

function openTransactionModal(transaction = null) {
  const modal = document.getElementById('transaction-modal');
  const title = document.getElementById('transaction-modal-title');
  const submitBtn = document.getElementById('transaction-submit-btn');
  const editIdInput = document.getElementById('transaction-edit-id');
  
  if (!modal) return;
  
  // Reset form
  document.getElementById('transaction-form').reset();
  
  if (transaction) {
    // Edit mode
    title.textContent = 'Edit Transaction';
    submitBtn.textContent = 'Save Changes';
    editIdInput.value = transaction.id;
    
    // Set amount type and value
    const isIncome = transaction.amount > 0;
    setAmountType(!isIncome);
    document.getElementById('transaction-amount').value = Math.abs(transaction.amount);
    
    // Set date
    const date = new Date(transaction.date);
    document.getElementById('transaction-date').value = date.toISOString().split('T')[0];
    
    // Set other fields
    document.getElementById('transaction-description').value = transaction.description || '';
    document.getElementById('transaction-merchant').value = transaction.merchant || '';
    document.getElementById('transaction-category').value = transaction.category || '';
    document.getElementById('transaction-type').value = transaction.transaction_type || 'card_purchase';
    document.getElementById('transaction-essential').checked = transaction.is_essential !== false;
    document.getElementById('transaction-recurring').checked = transaction.is_recurring === true;
  } else {
    // Add mode
    title.textContent = 'Add Transaction';
    submitBtn.textContent = 'Add Transaction';
    editIdInput.value = '';
    
    // Default to expense
    setAmountType(true);
    
    // Set default date to today
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-essential').checked = true;
    document.getElementById('transaction-recurring').checked = false;
  }
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeTransactionModal() {
  const modal = document.getElementById('transaction-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const editId = document.getElementById('transaction-edit-id').value;
  const amount = parseFloat(document.getElementById('transaction-amount').value);
  const date = document.getElementById('transaction-date').value;
  const description = document.getElementById('transaction-description').value;
  const merchant = document.getElementById('transaction-merchant').value;
  const category = document.getElementById('transaction-category').value;
  const transactionType = document.getElementById('transaction-type').value;
  const isEssential = document.getElementById('transaction-essential').checked;
  const isRecurring = document.getElementById('transaction-recurring').checked;
  
  // Apply sign based on expense/income toggle
  const finalAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);
  
  const data = {
    amount: finalAmount,
    date: date,
    description: description,
    merchant: merchant || description,
    category: category || null,
    transaction_type: transactionType,
    is_essential: isEssential,
    is_recurring: isRecurring
  };
  
  const submitBtn = document.getElementById('transaction-submit-btn');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;
  
  try {
    if (editId) {
      // Update existing
      await updateTransaction(parseInt(editId), data);
    } else {
      // Create new
      await createTransaction(data);
    }
    
    closeTransactionModal();
    loadTransactions(currentPage);
  } catch (error) {
    console.error('Failed to save transaction:', error);
    alert(error?.message || 'Failed to save transaction');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function openDeleteModal(id) {
  const modal = document.getElementById('delete-confirm-modal');
  const idInput = document.getElementById('delete-transaction-id');
  
  if (modal && idInput) {
    idInput.value = id;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function confirmDelete() {
  const idInput = document.getElementById('delete-transaction-id');
  const id = idInput?.value;
  
  if (!id) return;
  
  const confirmBtn = document.getElementById('delete-confirm-btn');
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = 'Deleting...';
  confirmBtn.disabled = true;
  
  try {
    await deleteTransaction(parseInt(id));
    closeDeleteModal();
    loadTransactions(currentPage);
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    alert(error?.message || 'Failed to delete transaction');
  } finally {
    confirmBtn.textContent = originalText;
    confirmBtn.disabled = false;
  }
}

function renderTransactions(transactions) {
  const tbody = document.getElementById("transactions-tbody");
  if (!tbody) return;

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8">
          <p class="text-sm text-slate-600">No transactions found</p>
          <p class="text-xs text-slate-500 mt-1">Try adjusting your filters or add a transaction.</p>
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
        <td class="px-2 py-2 w-16">
          <div class="text-xs font-medium text-slate-900">${date}</div>
        </td>
        <td class="px-0 py-2">
          <div class="text-sm font-medium text-slate-900 line-clamp-1">${title}</div>
        </td>
        <td class="px-0 py-2 w-28">
          <select id="tx-cat-${t.id}" 
                  class="text-xs border border-slate-300 rounded px-1 py-1 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full"
                  onchange="window._onCategoryChange(${t.id})">
            <option value="">Uncategorized</option>
            ${opts}
          </select>
        </td>
        <td class="px-1 py-2 w-16 text-right">
          <div class="flex items-center justify-end gap-1">
            <button onclick="window._onEditTransaction(${t.id})" class="p-1 text-slate-400 hover:text-indigo-600" title="Edit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button onclick="window._onDeleteTransaction(${t.id})" class="p-1 text-slate-400 hover:text-red-600" title="Delete">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </td>
      </tr>
      <tr class="hover:bg-slate-50 border-b border-slate-300">
        <td colspan="3" class="px-2 py-1">
          <div class="text-xs text-slate-500">
            ${accountInfo ? `<span class="font-medium">${accountInfo}</span>` : ''}
            ${accountInfo && metadataStr ? ' • ' : ''}${metadataStr}
          </div>
        </td>
        <td class="px-1 py-1 text-right">
          <span class="text-sm font-semibold ${amountClass}">${amountPrefix}${Math.abs(t.amount).toFixed(2)}₪</span>
        </td>
      </tr>
    `;
  }).join('');

  // Bind global handlers
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
      
    } catch (e) {
      console.error('Failed to update category', e);
      alert(e?.message || 'Failed to update category');
    }
  };
  
  window._onEditTransaction = function(id) {
    const tx = allTransactions.find(t => t.id === id);
    if (tx) {
      openTransactionModal(tx);
    }
  };
  
  window._onDeleteTransaction = function(id) {
    openDeleteModal(id);
  };
}
