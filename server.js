const express = require('express');
const path = require('path');
const { createExpenseStore, parseExpenseInput } = require('./src/store');

const app = express();
const port = process.env.PORT || 3000;
const store = createExpenseStore(path.join(__dirname, 'data', 'expenses.json'));
const publicDir = path.join(__dirname, 'public');

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/expenses', async (req, res, next) => {
  try {
    const input = parseExpenseInput(req.body);
    const expense = await store.createExpense(input);
    res.status(201).json({ expense });
  } catch (error) {
    if (error && error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    next(error);
  }
});

app.get('/expenses', async (req, res, next) => {
  try {
    const expenses = await store.listExpenses({
      category: req.query.category,
      sort: req.query.sort,
    });

    res.json({ expenses });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Expense tracker listening on http://localhost:${port}`);
  });
}

module.exports = { app };