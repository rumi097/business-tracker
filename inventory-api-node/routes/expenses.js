// routes/expenses.js
const express = require('express');
const db = require('../db'); // Import the database connection
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, formatISO } = require('date-fns');

const router = express.Router();

// --- Middleware to get user_id (adjust based on your auth method) ---
// This assumes user_id is passed as a query param or in the body.
// In a real app, you'd likely get this from a decoded JWT token.
const getUserId = (req) => {
    if (req.method === 'POST') {
        return parseInt(req.body?.user_id, 10);
    } else { // GET
        return parseInt(req.query?.user_id, 10);
    }
};

// --- ACTION: ADD EXPENSE (POST /expenses) ---
router.post('/', async (req, res) => {
    const userId = getUserId(req);
    const { title, amount } = req.body;

    // Input Validation
    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ message: "Invalid title." });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount." });
    }

    try {
        const sql = `INSERT INTO expenses (user_id, title, amount) VALUES ($1, $2, $3)`;
        await db.query(sql, [userId, title.trim(), numericAmount]);
        res.status(201).json({ message: "Expense added successfully." });
    } catch (err) {
        console.error("Add Expense Error:", err);
        res.status(500).json({ message: "Failed to add expense." });
    }
});

// --- ACTION: GET SUMMARY (GET /expenses/summary) ---
router.get('/summary', async (req, res) => {
    const userId = getUserId(req);

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }

    // Helper function to get sum within a date range
    const getTotalExpense = async (startDate, endDate) => {
        const sql = `SELECT SUM(amount) as total
                     FROM expenses
                     WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3`;
        // Format dates for PostgreSQL timestamp query
        const startStr = formatISO(startDate).slice(0, 19).replace('T', ' ');
        const endStr = formatISO(endDate).slice(0, 19).replace('T', ' ');

        try {
            const result = await db.query(sql, [userId, startStr, endStr]);
            return parseFloat(result.rows[0]?.total) || 0; // Return 0 if no results
        } catch (err) {
            console.error("Get Total Expense Error:", err);
            throw err; // Re-throw error to be caught by the main try/catch
        }
    };

    try {
        const now = new Date();

        // Calculate date ranges
        const dailyStart = startOfDay(now);
        const dailyEnd = endOfDay(now);

        const weeklyStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        const weeklyEnd = endOfWeek(now, { weekStartsOn: 1 });

        const monthlyStart = startOfMonth(now);
        const monthlyEnd = endOfMonth(now);

        // Fetch totals concurrently
        const [dailyTotal, weeklyTotal, monthlyTotal] = await Promise.all([
            getTotalExpense(dailyStart, dailyEnd),
            getTotalExpense(weeklyStart, weeklyEnd),
            getTotalExpense(monthlyStart, monthlyEnd)
        ]);

        res.status(200).json({
            daily: dailyTotal,
            weekly: weeklyTotal,
            monthly: monthlyTotal
        });

    } catch (err) {
        res.status(500).json({ message: "Failed to retrieve expense summary." });
    }
});

module.exports = router;