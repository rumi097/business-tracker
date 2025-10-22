// routes/sales.js
const express = require('express');
const db = require('../db'); // Import the database connection pool

const router = express.Router();

// POST /sales
router.post('/', async (req, res) => {
    // --- Basic Validation ---
    const { user_id, cart } = req.body;
    const userId = parseInt(user_id, 10);

    if (!userId || isNaN(userId) || userId <= 0 || !cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ message: "Invalid sale data provided." });
    }

    // Generate Invoice ID
    const invoiceId = `INV-${userId}-${Date.now()}`;

    // Get a dedicated client from the pool for transaction
    const client = await db.pool.connect();

    try {
        // --- Start Transaction ---
        await client.query('BEGIN');

        // Process each item in the cart sequentially within the transaction
        for (const item of cart) {
            const itemId = parseInt(item.id, 10);
            const itemQuantity = parseInt(item.quantity, 10);
            const itemSalePrice = parseFloat(item.sale_price);
            const itemName = item.name; // Assuming name is passed in cart

            if (isNaN(itemId) || isNaN(itemQuantity) || itemQuantity <= 0 || isNaN(itemSalePrice)) {
                 throw new Error("Invalid item data in cart.");
            }

            // --- Get product details and lock the row ---
            const prodSql = `
                SELECT name, quantity, wholesale_price
                FROM products
                WHERE id = $1 AND user_id = $2
                FOR UPDATE`; // Lock the row for the duration of the transaction
            const prodResult = await client.query(prodSql, [itemId, userId]);
            const product = prodResult.rows[0];

            // --- Check Stock ---
            if (!product || product.quantity < itemQuantity) {
                // Use the name from DB if available, otherwise from cart item
                const productNameForError = product ? product.name : itemName || 'product';
                throw new Error(`Insufficient stock for ${productNameForError}. Required: ${itemQuantity}, Available: ${product ? product.quantity : 0}`);
            }

            // --- Calculations ---
            const totalAmount = itemSalePrice * itemQuantity;
            const totalInvestment = parseFloat(product.wholesale_price) * itemQuantity;
            const profit = totalAmount - totalInvestment;

            // --- 1. Insert into sales table ---
            const saleSql = `
                INSERT INTO sales (user_id, product_id, quantity_sold, total_amount, total_investment, profit)
                VALUES ($1, $2, $3, $4, $5, $6)`;
            await client.query(saleSql, [userId, itemId, itemQuantity, totalAmount, totalInvestment, profit]);

            // --- 2. Insert into sales_transactions table ---
            const transSql = `
                INSERT INTO sales_transactions (user_id, invoice_id, product_id, product_name, quantity_sold, sale_price_each, total_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`;
            // Use product name from DB for consistency
            await client.query(transSql, [userId, invoiceId, itemId, product.name, itemQuantity, itemSalePrice, totalAmount]);

            // --- 3. Update product quantity ---
            const updateSql = `
                UPDATE products SET quantity = quantity - $1
                WHERE id = $2 AND user_id = $3`;
            await client.query(updateSql, [itemQuantity, itemId, userId]);
        }

        // --- Commit Transaction ---
        await client.query('COMMIT');
        res.status(200).json({ message: "Sale recorded successfully.", invoice_id: invoiceId });

    } catch (err) {
        // --- Rollback Transaction on Error ---
        await client.query('ROLLBACK');
        console.error("Sale Processing Error:", err);
        // Send back specific error messages (like insufficient stock) or a generic one
        res.status(400).json({ message: "Sale failed: " + err.message });
    } finally {
        // --- Release Client ---
        // VERY IMPORTANT: Release the client back to the pool in both success and error cases
        client.release();
    }
});

module.exports = router;