// routes/products.js
const express = require('express');
const db = require('../db'); // Import the database connection
const multer = require('multer');
const path = require('path');

const router = express.Router();

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure 'uploads/' directory exists in your Node project root
  },
  filename: function (req, file, cb) {
    // Create a unique filename: timestamp + original name
    cb(null, Date.now() + '_' + file.originalname);
  }
});

// Filter to accept only image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- Middleware to get user_id (adjust based on your auth method) ---
const getUserId = (req) => {
    // If using JWT, you'd get this from req.user (after verification middleware)
    // For now, let's assume it comes from query or body like before
    if (req.method === 'POST') {
        return parseInt(req.body?.user_id || req.query?.user_id, 10); // Check body first for POST
    } else { // GET
        return parseInt(req.query?.user_id, 10);
    }
};

// --- ACTION: GET PRODUCTS (GET /products) ---
router.get('/', async (req, res) => {
    const userId = getUserId(req);
    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }

    try {
        const sql = `
            SELECT p.id, p.user_id, p.type_id, pt.type_name, p.name, p.quantity,
                   p.wholesale_price, p.sale_price, p.image_url
            FROM products p
            JOIN product_types pt ON p.type_id = pt.id
            WHERE p.user_id = $1 AND p.is_active = 1
            ORDER BY pt.type_name ASC, p.name ASC`;

        const result = await db.query(sql, [userId]);
        // Construct full image URL if applicable
        const productsWithUrls = result.rows.map(p => ({
            ...p,
            // Assuming image_url stores relative path like 'uploads/...'
            // and API_URL is the base URL of this backend service
            image_full_url: p.image_url ? `${process.env.API_URL || req.protocol + '://' + req.get('host')}/${p.image_url}` : null
        }));
        res.status(200).json(productsWithUrls || []);
    } catch (err) {
        console.error("Get Products Error:", err);
        res.status(500).json({ message: "Failed to retrieve products." });
    }
});

// --- ACTION: ADD PRODUCT (POST /products) ---
// Use multer middleware to handle single image upload with field name 'image'
router.post('/', upload.single('image'), async (req, res) => {
    // Note: user_id comes from req.body now because it's multipart/form-data
    const userId = parseInt(req.body?.user_id, 10);
    const { type_id, name, quantity, wholesale_price, sale_price } = req.body;
    let imageUrl = null;

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }
    if (!type_id || !name || !quantity || !wholesale_price || !sale_price) {
         return res.status(400).json({ message: "Missing required product fields." });
    }

    // Check if an image was uploaded
    if (req.file) {
        // Store the relative path accessible by the static server
        imageUrl = req.file.path.replace(/\\/g, "/"); // Normalize path separators
    }

    const client = await db.pool.connect(); // Get a client for transaction
    try {
        await client.query('BEGIN'); // Start transaction

        // Insert product
        const productSql = `
            INSERT INTO products (user_id, type_id, name, quantity, wholesale_price, sale_price, image_url, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
            RETURNING id`;
        const productResult = await client.query(productSql, [userId, parseInt(type_id), name, parseInt(quantity), parseFloat(wholesale_price), parseFloat(sale_price), imageUrl]);
        const productId = productResult.rows[0].id;

        // Log stock addition
        const logSql = `
            INSERT INTO stock_additions (user_id, product_id, quantity_added, wholesale_price_each)
            VALUES ($1, $2, $3, $4)`;
        await client.query(logSql, [userId, productId, parseInt(quantity), parseFloat(wholesale_price)]);

        await client.query('COMMIT'); // Commit transaction
        res.status(201).json({ message: "Product added successfully." });
    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error("Add Product Error:", err);
        res.status(400).json({ message: "Failed to add product.", error: err.message });
    } finally {
        client.release(); // Release client back to pool
    }
});

// --- ACTION: UPDATE QUANTITY (POST /products/update-quantity) ---
router.post('/update-quantity', async (req, res) => {
    const userId = getUserId(req);
    const { product_id, quantity_to_add } = req.body;

    const productId = parseInt(product_id);
    const quantityToAdd = parseInt(quantity_to_add);

    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
    }
    if (!productId || isNaN(productId) || !quantityToAdd || isNaN(quantityToAdd) || quantityToAdd <= 0) {
         return res.status(400).json({ message: "Invalid product ID or quantity." });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Get current wholesale price
        const priceSql = `SELECT wholesale_price FROM products WHERE id = $1 AND user_id = $2`;
        const priceResult = await client.query(priceSql, [productId, userId]);
        if (priceResult.rows.length === 0) throw new Error("Product not found or access denied.");
        const wholesalePrice = priceResult.rows[0].wholesale_price;

        // Update product quantity
        const updateSql = `UPDATE products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`;
        await client.query(updateSql, [quantityToAdd, productId, userId]);

        // Log stock addition
        const logSql = `INSERT INTO stock_additions (user_id, product_id, quantity_added, wholesale_price_each) VALUES ($1, $2, $3, $4)`;
        await client.query(logSql, [userId, productId, quantityToAdd, parseFloat(wholesalePrice)]);

        await client.query('COMMIT');
        res.status(200).json({ message: "Quantity updated." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update Quantity Error:", err);
        res.status(400).json({ message: "Failed to update quantity.", error: err.message });
    } finally {
        client.release();
    }
});

// --- ACTION: DELETE (ARCHIVE) PRODUCT (POST /products/delete) ---
// Consider using DELETE method: router.delete('/:id', ...)
router.post('/delete', async (req, res) => {
     const userId = getUserId(req);
     const { product_id } = req.body; // Assuming product_id is in the body

     const productId = parseInt(product_id);

     if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(403).json({ message: "User not specified." });
     }
     if (!productId || isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID." });
     }

     try {
        const sql = `UPDATE products SET is_active = 0 WHERE id = $1 AND user_id = $2`;
        const result = await db.query(sql, [productId, userId]);

        if (result.rowCount > 0) { // Check if any row was actually updated
             res.status(200).json({ message: "Product archived successfully." });
        } else {
             res.status(404).json({ message: "Product not found or already archived." });
        }
     } catch (err) {
         console.error("Archive Product Error:", err);
         res.status(400).json({ message: "Failed to archive product." });
     }
});


module.exports = router;