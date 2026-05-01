const { Expense } = require('./models/expense');

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

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toExpense(record) {
  const dateValue = new Date(record.date).toISOString().slice(0, 10);

  return {
    id: String(record._id),
    request_id: record.request_id || '',
    amount_cents: record.amount_cents,
    amount: formatCents(record.amount_cents),
    category: record.category,
    description: record.description,
    date: dateValue,
    created_at: new Date(record.created_at).toISOString(),
  };
}

function createExpenseStore() {
  return {
    async createExpense(input) {
      if (input.requestId) {
        const existing = await Expense.findOne({ request_id: input.requestId }).lean();

        if (existing) {
          return toExpense(existing);
        }
      }

      try {
        const created = await Expense.create({
          request_id: input.requestId || undefined,
          amount_cents: input.amountCents,
          category: input.category,
          description: input.description,
          date: new Date(`${input.date}T00:00:00.000Z`),
        });

        return toExpense(created.toObject());
      } catch (error) {
        if (error && error.code === 11000 && input.requestId) {
          const existing = await Expense.findOne({ request_id: input.requestId }).lean();

          if (existing) {
            return toExpense(existing);
          }
        }

        throw error;
      }
    },

    async listExpenses({ category, sort } = {}) {
      const filter = String(category ?? '').trim();
      const query = {};

      if (filter) {
        query.category = new RegExp(`^${escapeRegex(filter)}$`, 'i');
      }

      const sortDirection = sort === 'date_asc' ? 1 : -1;
      const expenses = await Expense.find(query)
        .sort({ date: sortDirection, created_at: sortDirection })
        .lean();

      return expenses.map(toExpense);
    },
  };
}

module.exports = {
  createExpenseStore,
  parseExpenseInput,
  parseAmountToCents,
  formatCents,
};