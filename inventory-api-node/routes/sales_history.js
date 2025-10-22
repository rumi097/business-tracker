const express = require('express');
const db = require('../db'); // Import the database connection

const router = express.Router();

// GET /sales-history?user_id=...
router.get('/', async (req, res) => {
    // --- Input Validation ---
    const userId = parseInt(req.query.user_id, 10);

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }

    try {
        // --- Database Query ---
        const sql = `
            SELECT invoice_id, product_name, quantity_sold,
                   sale_price_each, total_amount, sale_date
            FROM sales_transactions
            WHERE user_id = $1
            ORDER BY sale_date DESC`;

        const result = await db.query(sql, [userId]);
        const salesHistory = result.rows || []; // Ensure it's an array

        // --- Final Output ---
        res.status(200).json(salesHistory);

    } catch (err) {
        console.error("Sales History Error:", err);
        res.status(500).json({ message: "Failed to retrieve sales history." });
    }
});

// --- FIX: Move this line to the end ---
module.exports = router;