// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file
const path = require('path');
const fs = require('fs');

const app = express();
// Use Render's port or 5001 for local development
const PORT = process.env.PORT || 5001;

// --- Middleware ---
// Enable CORS for your frontend. Adjust the origin in production.
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
// Enable Express to parse JSON request bodies
app.use(express.json());

// --- Serve uploaded files statically ---
// Create the uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));


// --- API Routes ---
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const typeRoutes = require('./routes/types');
const analyticsRoutes = require('./routes/analytics');
const expenseRoutes = require('./routes/expenses');
const invoiceRoutes = require('./routes/invoice');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const salesHistoryRoutes = require('./routes/sales_history');

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/sales', salesRoutes);
app.use('/types', typeRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/expenses', expenseRoutes);
app.use('/invoice', invoiceRoutes);
app.use('/notifications', notificationRoutes);
app.use('/reports', reportRoutes);
app.use('/sales-history', salesHistoryRoutes);


// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('Inventory API (Node.js) is running!');
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});