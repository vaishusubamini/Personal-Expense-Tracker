
const API_URL = "/api/expenses";

const form = document.getElementById("expenseForm");
const nameInput = document.getElementById("expenseName");
const amountInput = document.getElementById("expenseAmount");
const categoryInput = document.getElementById("expenseCategory");
const dateInput = document.getElementById("expenseDate");
const idInput = document.getElementById("expenseId");
const tableBody = document.getElementById("expenseTableBody");
const message = document.getElementById("message");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const monthFilter = document.getElementById("monthFilter");

let expenses = [];

function localDateString(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString().slice(0, 10);
}

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 204) {
    if (!response.ok) {
      throw new Error("Request failed.");
    }
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function loadExpenses() {
  try {
    expenses = await apiRequest(API_URL);
    renderExpenses();
  } catch (error) {
    showMessage(
      error.message + " Make sure the server is running.",
      true
    );
  }
}

function getFilteredExpenses() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const month = monthFilter.value;

  return expenses
    .filter(expense => {
      const matchesName = expense.name.toLowerCase().includes(query);
      const matchesCategory =
        category === "all" || expense.category === category;
      const matchesMonth =
        !month || expense.date.startsWith(month);

      return matchesName && matchesCategory && matchesMonth;
    })
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id - a.id
    );
}

function renderExpenses() {
  const visible = getFilteredExpenses();

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount), 0
  );

  const currentMonth = localDateString(new Date()).slice(0, 7);

  const monthlyTotal = expenses
    .filter(expense => expense.date.startsWith(currentMonth))
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const filteredTotal = visible.reduce(
    (sum, expense) => sum + Number(expense.amount), 0
  );

  document.getElementById("totalExpense").textContent = money(total);
  document.getElementById("monthlyExpense").textContent =
    money(monthlyTotal);
  document.getElementById("expenseCount").textContent = expenses.length;
  document.getElementById("filteredTotal").textContent =
    money(filteredTotal);

  document.getElementById("visibleCount").textContent =
    `Showing ${visible.length} of ${expenses.length} expenses`;

  tableBody.replaceChildren();

  visible.forEach(expense => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = expense.name;

    const categoryCell = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "category-pill";
    pill.textContent = expense.category;
    categoryCell.appendChild(pill);

    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(
      expense.date + "T00:00:00"
    ).toLocaleDateString("en-IN");

    const amountCell = document.createElement("td");
    amountCell.textContent = money(Number(expense.amount));

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editExpense(expense));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-button";
    deleteButton.addEventListener(
      "click", () => deleteExpense(expense)
    );

    actions.append(editButton, deleteButton);
    actionsCell.appendChild(actions);

    row.append(
      nameCell,
      categoryCell,
      dateCell,
      amountCell,
      actionsCell
    );

    tableBody.appendChild(row);
  });

  document.getElementById("emptyState")
    .classList.toggle("hidden", visible.length > 0);
}

function resetForm() {
  form.reset();
  idInput.value = "";
  dateInput.value = localDateString(new Date());

  document.getElementById("formTitle").textContent = "Add Expense";
  document.getElementById("saveButton").textContent = "Add Expense";
  document.getElementById("cancelEditButton")
    .classList.add("hidden");
}

function editExpense(expense) {
  idInput.value = expense.id;
  nameInput.value = expense.name;
  amountInput.value = expense.amount;
  categoryInput.value = expense.category;
  dateInput.value = expense.date;

  document.getElementById("formTitle").textContent = "Edit Expense";
  document.getElementById("saveButton").textContent = "Save Changes";
  document.getElementById("cancelEditButton")
    .classList.remove("hidden");

  showMessage("Editing selected expense.");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteExpense(expense) {
  const confirmed = confirm(
    `Delete ${expense.name} (${money(Number(expense.amount))})?`
  );

  if (!confirmed) return;

  try {
    await apiRequest(`${API_URL}/${expense.id}`, {
      method: "DELETE"
    });

    expenses = expenses.filter(item => item.id !== expense.id);

    if (String(idInput.value) === String(expense.id)) {
      resetForm();
    }

    renderExpenses();
    showMessage("Expense deleted successfully.");
  } catch (error) {
    showMessage(error.message, true);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  if (
    !name ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !date
  ) {
    showMessage(
      "Enter an expense name, a positive amount and a date.",
      true
    );
    return;
  }

  const expense = {
    name,
    amount,
    category: categoryInput.value,
    date
  };

  const id = idInput.value;

  try {
    if (id) {
      await apiRequest(`${API_URL}/${id}`, {
        method: "PUT",
        body: JSON.stringify(expense)
      });
    } else {
      await apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(expense)
      });
    }

    resetForm();
    await loadExpenses();
    showMessage(id ? "Expense updated." : "Expense added.");
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById("cancelEditButton")
  .addEventListener("click", () => {
    resetForm();
    showMessage("");
  });

[searchInput, categoryFilter, monthFilter].forEach(control => {
  control.addEventListener("input", renderExpenses);
});

document.getElementById("resetFiltersButton")
  .addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "all";
    monthFilter.value = "";
    renderExpenses();
  });

document.getElementById("loadExamplesButton")
  .addEventListener("click", async () => {
    const examples = [
      { name: "Food", amount: 150, category: "Food" },
      { name: "Transport", amount: 80, category: "Transport" },
      { name: "Shopping", amount: 500, category: "Shopping" },
      { name: "Education", amount: 300, category: "Education" },
      { name: "Entertainment", amount: 200, category: "Entertainment" }
    ];

    try {
      for (const example of examples) {
        await apiRequest(API_URL, {
          method: "POST",
          body: JSON.stringify({
            ...example,
            date: localDateString(new Date())
          })
        });
      }

      await loadExpenses();
      showMessage("Examples loaded. Their total is ₹1230.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

dateInput.value = localDateString(new Date());

const now = new Date();
monthFilter.value =
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

loadExpenses();
