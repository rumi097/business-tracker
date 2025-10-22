// routes/invoice.js
const express = require('express');
const db = require('../db'); // Import the database connection
const PDFDocument = require('pdfkit');
const { format } = require('date-fns'); // For formatting dates

const router = express.Router();

router.get('/:invoice_id', async (req, res) => {
    const invoiceId = req.params.invoice_id;
    const action = req.query.action || 'print'; // Default to 'print'

    if (!invoiceId) {
        return res.status(400).json({ error: 'No invoice ID provided.' });
    }

    try {
        // --- Get Sale and User Details ---
        const saleDetailsSql = `
            SELECT st.sale_date, u.store_name
            FROM sales_transactions st
            JOIN users u ON st.user_id = u.id
            WHERE st.invoice_id = $1
            LIMIT 1`;
        const saleDetailsResult = await db.query(saleDetailsSql, [invoiceId]);
        const saleDetails = saleDetailsResult.rows[0];

        if (!saleDetails) {
            return res.status(404).json({ error: 'Invoice ID not found.' });
        }

        // --- Get All Sale Items for this Invoice ---
        const itemsSql = `
            SELECT product_name, quantity_sold, sale_price_each, total_amount
            FROM sales_transactions
            WHERE invoice_id = $1`;
        const itemsResult = await db.query(itemsSql, [invoiceId]);
        const items = itemsResult.rows || [];

        // --- Create PDF using pdfkit ---
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        // Set Headers for PDF response
        const filename = `invoice_${invoiceId}.pdf`;
        let disposition = 'inline'; // Default: view in browser
        if (action === 'download') {
            disposition = 'attachment';
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);

        // Pipe the PDF output directly to the response stream
        doc.pipe(res);

        // --- PDF Content Generation ---

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text('Sale Invoice', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text(`Store: ${saleDetails.store_name || 'N/A'}`, { align: 'center' });
        doc.moveDown(1);

        // Info Section
        doc.fontSize(10).font('Helvetica-Bold').text('Invoice ID:', { continued: true }).font('Helvetica').text(` ${invoiceId}`);
        doc.font('Helvetica-Bold').text('Date:', { continued: true }).font('Helvetica').text(` ${format(new Date(saleDetails.sale_date), 'yyyy-MM-dd HH:mm:ss')}`);
        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y;
        const itemCol = 50;
        const qtyCol = 350;
        const priceCol = 410;
        const totalCol = 480;

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Product', itemCol, tableTop);
        doc.text('Quantity', qtyCol, tableTop, { width: 50, align: 'center' });
        doc.text('Unit Price', priceCol, tableTop, { width: 60, align: 'right' });
        doc.text('Subtotal', totalCol, tableTop, { width: 70, align: 'right' });
        doc.moveTo(itemCol, doc.y + 5).lineTo(itemCol + 490, doc.y + 5).stroke(); // Underline
        doc.moveDown(1);

        // Table Rows
        doc.fontSize(10).font('Helvetica');
        let grandTotal = 0;
        items.forEach(item => {
            const y = doc.y;
            grandTotal += parseFloat(item.total_amount);

            doc.text(item.product_name, itemCol, y, { width: 290 }); // Allow wrapping
            doc.text(item.quantity_sold, qtyCol, y, { width: 50, align: 'center' });
            doc.text(`$${parseFloat(item.sale_price_each).toFixed(2)}`, priceCol, y, { width: 60, align: 'right' });
            doc.text(`$${parseFloat(item.total_amount).toFixed(2)}`, totalCol, y, { width: 70, align: 'right' });
            doc.moveDown(0.5); // Add space between rows if needed
        });

        // Line before Total
        doc.moveTo(itemCol, doc.y + 5).lineTo(itemCol + 490, doc.y + 5).stroke();
        doc.moveDown(1);

        // Grand Total
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total Amount:', priceCol, doc.y, { width: 120, align: 'right' });
        doc.text(`$${grandTotal.toFixed(2)}`, totalCol, doc.y, { width: 70, align: 'right' });

        // Finalize the PDF and end the stream
        doc.end();

    } catch (err) {
        console.error("Invoice Generation Error:", err);
        // Ensure response isn't already sent before sending error
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate invoice: ' + err.message });
        }
    }
});

module.exports = router;