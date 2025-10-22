// routes/types.js
const express = require('express');
const db = require('../db'); // Import the database connection

const router = express.Router();

// Middleware to get user_id (adjust based on your auth method)
const getUserId = (req) => {
    if (req.method === 'POST') {
        return parseInt(req.body?.user_id, 10);
    } else { // GET
        return parseInt(req.query?.user_id, 10);
    }
};

// --- ACTION: GET TYPES (GET /types) ---
router.get('/', async (req, res) => {
    const userId = getUserId(req);

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }

    try {
        const sql = `
            SELECT id, type_name
            FROM product_types
            WHERE user_id = $1
            ORDER BY type_name ASC`;

        const result = await db.query(sql, [userId]);
        res.status(200).json(result.rows || []); // Send array of types or empty array

    } catch (err) {
        console.error("Get Types Error:", err);
        res.status(500).json({ message: "Failed to retrieve product types." });
    }
});

// --- ACTION: ADD TYPE (POST /types) ---
router.post('/', async (req, res) => {
    const userId = getUserId(req);
    const { type_name } = req.body;

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }
    if (!type_name || typeof type_name !== 'string' || type_name.trim() === '') {
        return res.status(400).json({ message: "Type name cannot be empty." });
    }

    try {
        // RETURNING * gets the whole new row back
        const sql = `
            INSERT INTO product_types (user_id, type_name)
            VALUES ($1, $2)
            RETURNING id, type_name`;

        const result = await db.query(sql, [userId, type_name.trim()]);

        if (result.rows && result.rows.length > 0) {
            res.status(201).json({
                message: "Type added successfully.",
                new_type: result.rows[0] // Send the newly created type object
            });
        } else {
            res.status(400).json({ message: "Failed to add type for an unknown reason." });
        }

    } catch (err) {
        console.error("Add Type Error:", err);
        // Check for unique constraint violation (if you add one)
        // if (err.code === '23505') {
        //     res.status(400).json({ message: "Failed to add type. It might already exist." });
        // } else {
            res.status(500).json({ message: "Failed to add type." });
        // }
    }
});

module.exports = router;