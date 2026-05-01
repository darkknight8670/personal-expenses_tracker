const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseAmountToCents(rawAmount) {
  const amountText = String(rawAmount ?? '').trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
    throw badRequest('Amount must be a positive value with up to two decimal places.');
  }

  const [wholePart, fractionPart = ''] = amountText.split('.');
  const cents = Number(wholePart) * 100 + Number((fractionPart + '00').slice(0, 2));

  if (!Number.isInteger(cents) || cents <= 0) {
    throw badRequest('Amount must be greater than zero.');
  }

  return cents;
}

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

function normalizeText(value, fieldName) {
  const text = String(value ?? '').trim();

  if (!text) {
    throw badRequest(`${fieldName} is required.`);
  }

  return text;
}

function parseDate(value) {
  const text = normalizeText(value, 'Date');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw badRequest('Date must use the YYYY-MM-DD format.');
  }

  const parsed = new Date(`${text}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw badRequest('Date is invalid.');
  }

  return text;
}

function parseExpenseInput(body = {}) {
  return {
    amountCents: parseAmountToCents(body.amount),
    category: normalizeText(body.category, 'Category'),
    description: normalizeText(body.description, 'Description'),
    date: parseDate(body.date),
    requestId: body.requestId ? String(body.requestId).trim() : '',
  };
}

function createExpenseStore(filePath) {
  let queue = Promise.resolve();

  async function ensureFile() {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify({ expenses: [] }, null, 2));
    }
  }

  async function readState() {
    await ensureFile();
    const raw = await fs.readFile(filePath, 'utf8');

    if (!raw.trim()) {
      return { expenses: [] };
    }

    const parsed = JSON.parse(raw);

    if (!parsed || !Array.isArray(parsed.expenses)) {
      return { expenses: [] };
    }

    return parsed;
  }

  async function writeState(state) {
    const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(state, null, 2));
    await fs.rename(tempFile, filePath);
  }

  function withLock(task) {
    const run = queue.then(task, task);
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  function toExpense(record) {
    return {
      id: record.id,
      request_id: record.request_id || '',
      amount_cents: record.amount_cents,
      amount: formatCents(record.amount_cents),
      category: record.category,
      description: record.description,
      date: record.date,
      created_at: record.created_at,
    };
  }

  return {
    async createExpense(input) {
      return withLock(async () => {
        const state = await readState();

        if (input.requestId) {
          const existing = state.expenses.find((expense) => expense.request_id === input.requestId);

          if (existing) {
            return toExpense(existing);
          }
        }

        const now = new Date().toISOString();
        const expense = {
          id: randomUUID(),
          request_id: input.requestId || '',
          amount_cents: input.amountCents,
          category: input.category,
          description: input.description,
          date: input.date,
          created_at: now,
        };

        state.expenses.push(expense);
        await writeState(state);

        return toExpense(expense);
      });
    },

    async listExpenses({ category, sort } = {}) {
      const state = await readState();
      const filter = String(category ?? '').trim().toLowerCase();
      const filtered = filter
        ? state.expenses.filter((expense) => expense.category.toLowerCase() === filter)
        : [...state.expenses];

      const sorted = filtered.sort((left, right) => {
        const dateDelta = new Date(right.date).getTime() - new Date(left.date).getTime();

        if (dateDelta !== 0) {
          return sort === 'date_asc' ? -dateDelta : dateDelta;
        }

        const createdDelta = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        return sort === 'date_asc' ? -createdDelta : createdDelta;
      });

      return sorted.map(toExpense);
    },
  };
}

module.exports = {
  createExpenseStore,
  parseExpenseInput,
  parseAmountToCents,
  formatCents,
};