const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAmountToCents, parseExpenseInput } = require('../src/store');

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