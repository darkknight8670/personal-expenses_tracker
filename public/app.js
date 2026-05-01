const form = document.getElementById('expense-form');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('date');
const submitButton = document.getElementById('submit-button');
const statusNode = document.getElementById('form-status');
const rowsNode = document.getElementById('expense-rows');
const emptyStateNode = document.getElementById('empty-state');
const totalNode = document.getElementById('visible-total');
const countNode = document.getElementById('visible-count');
const categoryFilterNode = document.getElementById('category-filter');
const sortFilterNode = document.getElementById('sort-filter');
const categorySummaryNode = document.getElementById('category-summary');
const bannerNode = document.getElementById('message-banner');

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const draftKey = 'fenmo-expense-draft';

const state = {
  expenses: [],
  loading: true,
  submitting: false,
};

function createDraftId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey) || 'null');
  } catch {
    return null;
  }
}

function saveDraft() {
  const draft = {
    requestId: form.dataset.requestId || createDraftId(),
    amount: amountInput.value,
    category: categoryInput.value,
    description: descriptionInput.value,
    date: dateInput.value,
  };

  form.dataset.requestId = draft.requestId;
  localStorage.setItem(draftKey, JSON.stringify(draft));
}

function clearDraft() {
  localStorage.removeItem(draftKey);
  delete form.dataset.requestId;
}

function restoreDraft() {
  const draft = loadDraft();

  if (!draft) {
    form.dataset.requestId = createDraftId();
    return;
  }

  form.dataset.requestId = draft.requestId || createDraftId();
  amountInput.value = draft.amount || '';
  categoryInput.value = draft.category || '';
  descriptionInput.value = draft.description || '';
  dateInput.value = draft.date || '';
}

function setStatus(message, type = 'info') {
  bannerNode.textContent = message;
  bannerNode.classList.toggle('hidden', !message);
  bannerNode.classList.toggle('error', type === 'error');
  statusNode.textContent = message && type !== 'error' ? message : '';
}

function formatMoney(cents) {
  return currencyFormatter.format(cents / 100);
}

function getVisibleExpenses() {
  const filter = categoryFilterNode.value.trim().toLowerCase();
  const sort = sortFilterNode.value;
  const rows = state.expenses.filter((expense) => {
    return !filter || expense.category.toLowerCase() === filter;
  });

  rows.sort((left, right) => {
    const dateDelta = new Date(right.date).getTime() - new Date(left.date).getTime();
    if (dateDelta !== 0) {
      return sort === 'date_asc' ? -dateDelta : dateDelta;
    }

    const createdDelta = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    return sort === 'date_asc' ? -createdDelta : createdDelta;
  });

  return rows;
}

function renderCategoryOptions() {
  const categories = [...new Set(state.expenses.map((expense) => expense.category))].sort((left, right) =>
    left.localeCompare(right)
  );
  const selected = categoryFilterNode.value;

  categoryFilterNode.innerHTML = '<option value="">All categories</option>';

  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilterNode.appendChild(option);
  }

  categoryFilterNode.value = categories.includes(selected) ? selected : '';
}

function renderCategorySummary(expenses) {
  const totalsByCategory = new Map();

  for (const expense of expenses) {
    const current = totalsByCategory.get(expense.category) || { amountCents: 0, count: 0 };
    current.amountCents += expense.amount_cents;
    current.count += 1;
    totalsByCategory.set(expense.category, current);
  }

  const summaryRows = [...totalsByCategory.entries()]
    .map(([category, summary]) => ({ category, ...summary }))
    .sort((left, right) => {
      if (right.amountCents !== left.amountCents) {
        return right.amountCents - left.amountCents;
      }

      return left.category.localeCompare(right.category);
    });

  categorySummaryNode.innerHTML = '';

  if (summaryRows.length === 0) {
    categorySummaryNode.innerHTML = '<p class="summary-empty">No visible expenses to summarize.</p>';
    return;
  }

  for (const row of summaryRows) {
    const card = document.createElement('article');
    card.className = 'summary-card';

    card.innerHTML = `
      <span class="summary-card__label">${row.category}</span>
      <strong class="summary-card__amount">${formatMoney(row.amountCents)}</strong>
      <span class="summary-card__meta">${row.count} expense${row.count === 1 ? '' : 's'}</span>
    `;

    categorySummaryNode.appendChild(card);
  }
}

function upsertExpense(expense) {
  const existingIndex = state.expenses.findIndex((item) => item.id === expense.id);

  if (existingIndex === -1) {
    state.expenses.unshift(expense);
    return;
  }

  state.expenses[existingIndex] = expense;
}

function renderExpenses() {
  const visibleExpenses = getVisibleExpenses();

  rowsNode.innerHTML = '';

  for (const expense of visibleExpenses) {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${expense.date}</td>
      <td>${expense.category}</td>
      <td>
        ${expense.description}
        <span class="meta">Created ${new Date(expense.created_at).toLocaleString()}</span>
      </td>
      <td class="numeric amount-cell">${formatMoney(expense.amount_cents)}</td>
    `;

    rowsNode.appendChild(row);
  }

  emptyStateNode.classList.toggle('hidden', visibleExpenses.length !== 0);
  totalNode.textContent = formatMoney(visibleExpenses.reduce((sum, expense) => sum + expense.amount_cents, 0));
  countNode.textContent = String(visibleExpenses.length);
  renderCategorySummary(visibleExpenses);
}

async function loadExpenses() {
  state.loading = true;
  setStatus('Loading expenses...');

  try {
    const response = await fetch('/api/expenses');

    if (!response.ok) {
      throw new Error('Failed to load expenses.');
    }

    const payload = await response.json();
    state.expenses = payload.expenses || [];
    renderCategoryOptions();
    renderExpenses();
    setStatus('Expenses loaded.');
  } catch (error) {
    setStatus(error.message || 'Failed to load expenses.', 'error');
  } finally {
    state.loading = false;
  }
}

function syncDraftFromForm() {
  saveDraft();
}

async function submitExpense(event) {
  event.preventDefault();

  if (state.submitting) {
    return;
  }

  const requestId = form.dataset.requestId || createDraftId();
  form.dataset.requestId = requestId;

  const payload = {
    amount: amountInput.value,
    category: categoryInput.value,
    description: descriptionInput.value,
    date: dateInput.value,
    requestId,
  };

  state.submitting = true;
  submitButton.disabled = true;
  setStatus('Saving expense...');

  try {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error || 'Unable to save expense.');
    }

    if (body.expense) {
      upsertExpense(body.expense);
      renderCategoryOptions();
      renderExpenses();
    }

    clearDraft();
    form.reset();
    form.dataset.requestId = createDraftId();
    setStatus('Expense saved.');
  } catch (error) {
    setStatus(error.message || 'Unable to save expense.', 'error');
  } finally {
    state.submitting = false;
    submitButton.disabled = false;
  }
}

form.addEventListener('input', syncDraftFromForm);
form.addEventListener('submit', submitExpense);
categoryFilterNode.addEventListener('change', renderExpenses);
sortFilterNode.addEventListener('change', renderExpenses);

restoreDraft();
loadExpenses();