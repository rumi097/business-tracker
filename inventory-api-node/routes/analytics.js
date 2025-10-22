// routes/analytics.js
const express = require('express');
const db = require('../db'); // Import the database connection
const { startOfWeek, startOfMonth, endOfDay, formatISO } = require('date-fns'); // Date helper library

const router = express.Router();

router.get('/', async (req, res) => {
    // --- Input Validation ---
    const userId = parseInt(req.query.user_id, 10);
    const period = req.query.period || 'daily'; // Default to daily

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ error: 'User not specified.' });
    }

    try {
        let sql = '';
        let params = [];

        // --- Prepare Query Based on Period ---
        if (period === 'daily') {
            // **FIX: Use PostgreSQL date comparison for 'daily'**
            sql = `
                SELECT
                    product_name,
                    SUM(quantity_sold) as total_quantity
                FROM
                    sales_transactions
                WHERE
                    user_id = $1 AND sale_date::date = CURRENT_DATE
                GROUP BY
                    product_name
                ORDER BY
                    total_quantity DESC`;
            params = [userId]; // Only user_id needed
        } else {
            // --- Weekly / Monthly Logic ---
            let startDate = new Date();
            let endDate = new Date();

            if (period === 'weekly') {
                startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
                // Use endOfDay to ensure the entire current day is included
                endDate = endOfDay(new Date());
            } else { // monthly
                startDate = startOfMonth(new Date());
                // Use endOfDay to ensure the entire current day is included
                endDate = endOfDay(new Date());
            }

            // Set time components for accurate range start
            startDate.setHours(0, 0, 0, 0);

            // Format dates for PostgreSQL timestamp query
            const startDateStr = formatISO(startDate).slice(0, 19).replace('T', ' ');
            const endDateStr = formatISO(endDate).slice(0, 19).replace('T', ' ');

            sql = `
                SELECT
                    product_name,
                    SUM(quantity_sold) as total_quantity
                FROM
                    sales_transactions
                WHERE
                    user_id = $1 AND sale_date BETWEEN $2 AND $3
                GROUP BY
                    product_name
                ORDER BY
                    total_quantity DESC`;
            params = [userId, startDateStr, endDateStr];
        }

        // --- Execute Query ---
        const result = await db.query(sql, params);
        const salesData = result.rows || []; // Ensure it's an array

        // --- Data Processing ---
        const chartData = salesData;
        const highestProduct = salesData.length > 0 ? salesData[0] : null;
        const lowestProduct = salesData.length > 0 ? salesData[salesData.length - 1] : null;

        // --- Final Output ---
        res.status(200).json({
            chartData: chartData,
            highestProduct: highestProduct,
            lowestProduct: lowestProduct
        });

    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json({ error: 'Database query failed: ' + err.message });
    }
});

module.exports = router;