// routes/notifications.js
const express = require('express');
const db = require('../db'); // Import the database connection

const router = express.Router();

// Define the low stock threshold
const LOW_STOCK_THRESHOLD = 5;

// GET /notifications?user_id=...[&action=get_count | get_all]
router.get('/', async (req, res) => {
    // --- Input Validation ---
    const userId = parseInt(req.query.user_id, 10);
    const action = req.query.action || 'get_all'; // Default to 'get_all'

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }

    try {
        if (action === 'get_count') {
            // --- Get Count of Low Stock Items ---
            const sql = `
                SELECT COUNT(*) as low_stock_count
                FROM products
                WHERE user_id = $1 AND is_active = 1 AND quantity <= $2`;

            const result = await db.query(sql, [userId, LOW_STOCK_THRESHOLD]);
            // Send the count object (e.g., { low_stock_count: '3' })
            res.status(200).json(result.rows[0]);

        } else { // Default action: get_all
            // --- Get All Low Stock Items ---
            const sql = `
                SELECT name, quantity
                FROM products
                WHERE user_id = $1 AND is_active = 1 AND quantity <= $2
                ORDER BY quantity ASC`;

            const result = await db.query(sql, [userId, LOW_STOCK_THRESHOLD]);
            // Send the array of products (or an empty array if none found)
            res.status(200).json(result.rows || []);
        }
    } catch (err) {
        console.error("Notifications Error:", err);
        res.status(500).json({ message: "Failed to retrieve notification data." });
    }
});

module.exports = router;