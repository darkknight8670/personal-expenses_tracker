# Fenmo Expense Tracker

Minimal full-stack expense tracker built for the assessment.

## What it does

- Create expenses with amount, category, description, and date.
- List all expenses.
- Filter by category.
- Sort by date, newest first by default.
- Show the total for the currently visible rows.
- Keep create requests retry-safe with a client-generated `requestId`.

## Stack

- Node.js + Express for the API and static hosting.
- Vanilla JavaScript for the browser UI.
- JSON file storage in `data/expenses.json`.

## Why JSON storage

The assignment values correctness under retries and refreshes more than infrastructure complexity. A file-backed store keeps the app easy to run locally and easy to deploy on a single-instance host. Money is stored as integer cents to avoid floating-point rounding errors.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
```

## Design notes

- The frontend persists an in-progress draft in localStorage so a refresh does not lose the idempotency key.
- The API deduplicates repeated `requestId` values, which protects against retries caused by slow or failed network responses.
- The UI keeps loading, empty, and error states visible instead of hiding them behind optimistic updates.

## Trade-offs

- I did not add authentication, editing, or deletion because they were not required.
- I kept the backend in a single process with file storage instead of introducing a database service to keep the submission lightweight.
- I did not add a category summary view because the core acceptance criteria were more important.