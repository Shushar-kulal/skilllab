const express = require("express");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");

const predefinedCategories = ["Food", "Travel", "Entertainment", "Bills", "Shopping"];
let expenses = []; // In-memory storage for expenses

const app = express(); // Initialize express application
app.use(express.json()); // Middleware for JSON parsing

// Helper function: Check if a date is within the last N days
function isDateInLastNDays(date, days) {
    const today = new Date();
    const pastDate = new Date(today.setDate(today.getDate() - days));
    return date >= pastDate;
}

// Endpoint: Add a new expense
app.post("/expenses", (req, res) => {
    const { category, amount, date, description } = req.body;

    // Validation for required fields
    if (!category || !amount || !date) {
        return res.status(400).json({ status: "error", error: "Category, amount, and date are required" });
    }

    // Category validation (case insensitive)
    if (!predefinedCategories.some(cat => cat.toLowerCase() === category.toLowerCase())) {
        return res.status(400).json({ status: "error", error: "Invalid category" });
    }

    // Amount validation
    if (amount <= 0) {
        return res.status(400).json({ status: "error", error: "Amount must be positive" });
    }

    // Date validation
    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
        return res.status(400).json({ status: "error", error: "Invalid date format" });
    }

    // Add expense
    const newExpense = {
        id: uuidv4(),
        category,
        amount,
        date: parsedDate.toISOString(),
        description: description || "",
    };
    expenses.push(newExpense);

    res.status(201).json({ status: "success", data: newExpense });
});

// Endpoint: Retrieve expenses (filter by category or date range)
app.get("/expenses", (req, res) => {
    const { category, startDate, endDate } = req.query;

    let filteredExpenses = expenses;

    // Category filter
    if (category) {
        filteredExpenses = filteredExpenses.filter(exp => exp.category === category);
    }

    // Date range filter
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filteredExpenses = filteredExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= start && expDate <= end;
        });
    }

    res.json({ status: "success", data: filteredExpenses });
});

// Endpoint: Analyze spending (total by category, highest spending category)
app.get("/expenses/analysis", (req, res) => {
    const analysis = predefinedCategories.map(category => {
        const total = expenses
            .filter(exp => exp.category === category)
            .reduce((sum, exp) => sum + exp.amount, 0);

        return { category, total };
    });

    const highestSpending = analysis.reduce((max, curr) => (curr.total > max.total ? curr : max), {
        category: "None",
        total: 0,
    });

    res.json({ status: "success", data: { analysis, highestSpending } });
});

// CRON job: Generate weekly and monthly summaries
cron.schedule("* * * * *", () => {
    const weeklySummary = expenses.reduce((summary, exp) => {
        const expDate = new Date(exp.date);
        if (isDateInLastNDays(expDate, 7)) {
            summary.total += exp.amount;
            summary.categories[exp.category] = (summary.categories[exp.category] || 0) + exp.amount;
        }
        return summary;
    }, { total: 0, categories: {} });

    console.log("Weekly Summary:", weeklySummary);
});

cron.schedule("* * * * *", () => {
    const monthlySummary = expenses.reduce((summary, exp) => {
        const expDate = new Date(exp.date);
        if (isDateInLastNDays(expDate, 30)) {
            summary.total += exp.amount;
            summary.categories[exp.category] = (summary.categories[exp.category] || 0) + exp.amount;
        }
        return summary;
    }, { total: 0, categories: {} });

    console.log("Monthly Summary:", monthlySummary);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
