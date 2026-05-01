let expenses = [];

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ expenses });
  }

  if (req.method === "POST") {
    const { amount, category, description, date } = req.body;

    const newExpense = {
      id: Date.now().toString(),
      amount_cents: Number(amount) * 100,
      category,
      description,
      date,
      created_at: new Date().toISOString(),
    };

    expenses.unshift(newExpense);

    return res.status(201).json({ expense: newExpense });
  }

  res.status(405).end();
}