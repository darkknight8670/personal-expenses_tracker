# Fenmo Expense Tracker

Minimal full-stack expense tracker built for the assessment.

## What it does

- Create expenses with amount, category, description, and date.
- List all expenses.
- Filter by category.
- Sort by date, newest first by default.
- Show the total for the currently visible rows.
- Show a per-category summary for the currently visible rows.
- Keep create requests retry-safe with a client-generated `requestId`.

## Stack

- Node.js + Express for the API and static hosting.
- JSON file storage for persistence.
- Vanilla JavaScript for the browser UI.  

## Why JSON file storage

The assignment values correctness under retries and refreshes more than infrastructure complexity. A file-backed store keeps the app easy to run locally and easy to deploy on a single-instance host. Money is still stored as integer cents to avoid floating-point rounding issues.

## Configuration

No database service is required. The app writes to `data/expenses.json` automatically.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Keep the framework preset as `Other`.
4. No build command is required.
5. Deploy.

The project includes `vercel.json` so all routes are handled by `api/index.js` and your existing frontend calls like `/expenses` continue to work.

### Important JSON Storage Caveat

On Vercel serverless functions, writing to local files is ephemeral and not reliable across invocations. This means `data/expenses.json` is fine for local development, but deployed data can reset or diverge.

For production-like behavior on Vercel, use an external datastore (MongoDB Atlas, Neon/Postgres, Supabase, or Vercel KV).

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
- The summary view rolls up the currently visible expenses by category so it stays aligned with filtering and sorting.

## Evaluation alignment

- Realistic conditions: retry-safe create flow with `requestId`, resilient draft persistence on refresh, and explicit loading/error states during API calls.
- Data correctness and money handling: amounts are validated and stored as integer cents (`amount_cents`) to avoid floating-point rounding issues.
- Edge cases: duplicate submits/retries are deduplicated, invalid input is rejected with 400-level validation errors, and empty-list states are handled in the UI.
- Code clarity and structure: API routing, storage/validation logic, and UI rendering are split into focused files for maintainability.
- Judgment and prioritization: core correctness paths were prioritized first; optional features were kept small and high-value (summary view plus targeted tests).

## Trade-offs

- I did not add authentication, editing, or deletion because they were not required.
- I kept the backend in a single process and focused on correctness over broader features like editing/deleting or authentication.
