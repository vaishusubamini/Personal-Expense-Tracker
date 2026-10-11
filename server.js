
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "expenses.json");

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Education",
  "Entertainment",
  "Bills",
  "Health",
  "Other"
];

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

app.use(express.json({ limit: "100kb" }));
app.use(express.static(__dirname, { index: "index.html" }));

function readExpenses() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function writeExpenses(expenses) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(expenses, null, 2),
    "utf8"
  );
}

function validateExpense(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid expense data.";
  }

  const name = typeof body.name === "string"
    ? body.name.trim()
    : "";

  const amount = Number(body.amount);
  const category = body.category;
  const date = body.date;

  if (!name || name.length > 80) {
    return "Name is required and must be at most 80 characters.";
  }

  if (
    body.amount === "" ||
    body.amount === null ||
    body.amount === undefined ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000000
  ) {
    return "Amount must be a positive number.";
  }

  if (!CATEGORIES.includes(category)) {
    return "Please select a valid category.";
  }

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date + "T00:00:00Z")) ||
    new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date
  ) {
    return "Please enter a valid date.";
  }

  return null;
}

// View all expenses
app.get("/api/expenses", (req, res) => {
  res.json(readExpenses());
});

// Add an expense
app.post("/api/expenses", (req, res) => {
  const error = validateExpense(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const expenses = readExpenses();

  const nextId = expenses.reduce(
    (max, item) => Math.max(max, Number(item.id) || 0),
    0
  ) + 1;

  const expense = {
    id: nextId,
    name: req.body.name.trim(),
    amount: Math.round(Number(req.body.amount) * 100) / 100,
    category: req.body.category,
    date: req.body.date
  };

  expenses.push(expense);
  writeExpenses(expenses);

  res.status(201).json(expense);
});

// Edit an expense
app.put("/api/expenses/:id", (req, res) => {
  const error = validateExpense(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const expenses = readExpenses();
  const index = expenses.findIndex(
    item => String(item.id) === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({ error: "Expense not found." });
  }

  const updatedExpense = {
    id: expenses[index].id,
    name: req.body.name.trim(),
    amount: Math.round(Number(req.body.amount) * 100) / 100,
    category: req.body.category,
    date: req.body.date
  };

  expenses[index] = updatedExpense;
  writeExpenses(expenses);

  res.json(updatedExpense);
});

// Delete an expense
app.delete("/api/expenses/:id", (req, res) => {
  const expenses = readExpenses();

  const remaining = expenses.filter(
    item => String(item.id) !== req.params.id
  );

  if (remaining.length === expenses.length) {
    return res.status(404).json({ error: "Expense not found." });
  }

  writeExpenses(remaining);
  res.status(204).end();
});

// Server health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Handle invalid API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Personal Expense Tracker running on port ${PORT}`);
});
