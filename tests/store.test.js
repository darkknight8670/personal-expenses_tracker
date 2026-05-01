const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createExpenseStore, parseAmountToCents, parseExpenseInput } = require('../src/store');

async function createTempStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fenmo-store-'));
  const filePath = path.join(dir, 'expenses.json');
  return createExpenseStore(filePath);
}

test('reuses the same expense for repeated request ids', async () => {
  const store = await createTempStore();

  const first = await store.createExpense({
    amountCents: 1250,
    category: 'Groceries',
    description: 'Weekly produce',
    date: '2026-05-01',
    requestId: 'request-123',
  });

  const second = await store.createExpense({
    amountCents: 1250,
    category: 'Groceries',
    description: 'Weekly produce',
    date: '2026-05-01',
    requestId: 'request-123',
  });

  assert.equal(second.id, first.id);

  const allExpenses = await store.listExpenses();
  assert.equal(allExpenses.length, 1);
});

test('filters by category and sorts newest date first', async () => {
  const store = await createTempStore();

  await store.createExpense({
    amountCents: 900,
    category: 'Transit',
    description: 'Bus pass',
    date: '2026-04-20',
    requestId: 'a',
  });

  await store.createExpense({
    amountCents: 1800,
    category: 'Transit',
    description: 'Train ticket',
    date: '2026-05-01',
    requestId: 'b',
  });

  await store.createExpense({
    amountCents: 2100,
    category: 'Food',
    description: 'Dinner out',
    date: '2026-05-02',
    requestId: 'c',
  });

  const expenses = await store.listExpenses({ category: 'Transit', sort: 'date_desc' });

  assert.deepEqual(
    expenses.map((expense) => expense.date),
    ['2026-05-01', '2026-04-20']
  );
  assert.deepEqual(
    expenses.map((expense) => expense.category),
    ['Transit', 'Transit']
  );
});

test('parses amount to integer cents', () => {
  assert.equal(parseAmountToCents('12.50'), 1250);
  assert.equal(parseAmountToCents('0.99'), 99);
});

test('rejects negative amounts', () => {
  assert.throws(
    () => parseExpenseInput({
      amount: '-1.00',
      category: 'Food',
      description: 'Invalid expense',
      date: '2026-05-01',
    }),
    (error) => error.statusCode === 400 && /amount/i.test(error.message)
  );
});

test('requires a date', () => {
  assert.throws(
    () => parseExpenseInput({
      amount: '10.00',
      category: 'Food',
      description: 'Missing date',
    }),
    (error) => error.statusCode === 400 && /date/i.test(error.message)
  );
});

test('rejects invalid calendar dates', () => {
  assert.throws(
    () =>
      parseExpenseInput({
        amount: '10.00',
        category: 'Food',
        description: 'Invalid date',
        date: '2026-02-30',
      }),
    (error) => error.statusCode === 400 && /date/i.test(error.message)
  );
});