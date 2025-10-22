// routes/reports.js
const express = require('express');
const db = require('../db'); // Import the database connection
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, formatISO, parse } = require('date-fns');

const router = express.Router();

// GET /reports?user_id=...[&filter=daily|weekly|monthly][&month=YYYY-MM]
router.get('/', async (req, res) => {
    // --- Input Validation ---
    const userId = parseInt(req.query.user_id, 10);
    const filter = req.query.filter || 'daily';
    const month = req.query.month || formatISO(new Date(), { representation: 'date' }).slice(0, 7); // Default to current YYYY-MM

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }

    try {
        let salesQuery = '';
        let salesParams = [];

        // --- Prepare Sales Query Based on Filter ---
        if (filter === 'daily') {
            // **FIX: Use PostgreSQL date comparison for 'daily'**
            salesQuery = `
                SELECT COALESCE(SUM(total_amount), 0) as total_sales,
                       COALESCE(SUM(total_investment), 0) as total_investment,
                       COALESCE(SUM(profit), 0) as total_profit
                FROM sales
                WHERE user_id = $1 AND sale_date::date = CURRENT_DATE`; // Compare date part only
            salesParams = [userId]; // Only user_id is needed
        } else {
            // --- Weekly / Monthly Logic ---
            let salesStartDate, salesEndDate;
            const now = new Date();

            if (filter === 'weekly') {
                salesStartDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
                salesEndDate = endOfWeek(now, { weekStartsOn: 1 });
            } else { // monthly
                const monthDate = parse(month, 'yyyy-MM', new Date());
                salesStartDate = startOfMonth(monthDate);
                salesEndDate = endOfMonth(monthDate);
            }
            // Ensure end date includes the entire day
            salesEndDate.setHours(23, 59, 59, 999);

            // Format dates for PostgreSQL timestamp query
            const salesStartStr = formatISO(salesStartDate).slice(0, 19).replace('T', ' ');
            const salesEndStr = formatISO(salesEndDate).slice(0, 19).replace('T', ' ');

            salesQuery = `
                SELECT COALESCE(SUM(total_amount), 0) as total_sales,
                       COALESCE(SUM(total_investment), 0) as total_investment,
                       COALESCE(SUM(profit), 0) as total_profit
                FROM sales
                WHERE user_id = $1 AND sale_date BETWEEN $2 AND $3`;
            salesParams = [userId, salesStartStr, salesEndStr];
        }

        // --- Prepare Other Queries (No changes here) ---
        // 2. Stock Value Query
        const stockQuery = `
            SELECT COALESCE(SUM(quantity * wholesale_price), 0) as current_stock_value
            FROM products WHERE user_id = $1 AND is_active = 1`;
        const stockPromise = db.query(stockQuery, [userId]);

        // 3. Monthly Investment Query
        const monthlyInvestDate = parse(month, 'yyyy-MM', new Date());
        const monthlyInvestStart = startOfMonth(monthlyInvestDate);
        const monthlyInvestEnd = endOfMonth(monthlyInvestDate);
        monthlyInvestEnd.setHours(23, 59, 59, 999); // Include full end day
        const monthlyInvestStartStr = formatISO(monthlyInvestStart).slice(0, 19).replace('T', ' ');
        const monthlyInvestEndStr = formatISO(monthlyInvestEnd).slice(0, 19).replace('T', ' ');
        const monthlyInvestQuery = `
            SELECT COALESCE(SUM(quantity_added * wholesale_price_each), 0) as monthly_investment
            FROM stock_additions WHERE user_id = $1 AND addition_date BETWEEN $2 AND $3`;
        const monthlyInvestPromise = db.query(monthlyInvestQuery, [userId, monthlyInvestStartStr, monthlyInvestEndStr]);

        // 4. Total Investment Query
        const totalInvestQuery = `
            SELECT COALESCE(SUM(quantity_added * wholesale_price_each), 0) as total_investment
            FROM stock_additions WHERE user_id = $1`;
        const totalInvestPromise = db.query(totalInvestQuery, [userId]);

        // --- Execute Queries ---
        // Execute sales query separately based on filter
        const salesPromise = db.query(salesQuery, salesParams);

        const [
            salesResult,
            stockResult,
            monthlyInvestResult,
            totalInvestResult
        ] = await Promise.all([salesPromise, stockPromise, monthlyInvestPromise, totalInvestPromise]);

        // Extract results
        const salesReport = salesResult.rows[0];
        const stockValue = stockResult.rows[0].current_stock_value;
        const monthlyInvestment = monthlyInvestResult.rows[0].monthly_investment;
        const totalInvestment = totalInvestResult.rows[0].total_investment;

        // --- Final Output ---
        res.status(200).json({
            sales_report: {
                total_sales: parseFloat(salesReport.total_sales),
                total_investment: parseFloat(salesReport.total_investment),
                total_profit: parseFloat(salesReport.total_profit)
             },
            current_stock_value: parseFloat(stockValue),
            monthly_investment: parseFloat(monthlyInvestment),
            total_investment: parseFloat(totalInvestment)
        });

    } catch (err) {
        console.error("Reports Error:", err);
        res.status(500).json({ message: "Failed to retrieve reports." });
    }
});

module.exports = router;