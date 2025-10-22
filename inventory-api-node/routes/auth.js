// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db'); // Import the database connection

const router = express.Router();
const saltRounds = 10; // For bcrypt password hashing

// --- POST /auth/register ---
router.post('/register', async (req, res) => {
    // Check if data is valid
    const { username, password, store_name, email, location } = req.body;
    if (!username || !password || !store_name || !email) {
        // Use return to stop execution after sending response
        return res.status(400).json({ message: "Invalid input data. Missing required fields." });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Define the SQL query
        const sql = `
            INSERT INTO users (username, password, store_name, email, location)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id`; // RETURNING id confirms insert and gets the new ID

        // Execute the query
        const result = await db.query(sql, [username, hashedPassword, store_name, email, location]);

        // Check if the insert was successful (result.rows will have the new user's ID)
        if (result.rows && result.rows.length > 0) {
            res.status(201).json({ message: "User registered successfully." });
        } else {
            // This case might not be reached if the query throws an error, but good practice
            res.status(400).json({ message: "Registration failed for an unknown reason." });
        }

    } catch (err) {
        // Log the full, detailed error on the server console for debugging
        console.error("Registration Error:", err);

        // Check for specific PostgreSQL error codes
        if (err.code === '23505') { // Unique constraint violation (e.g., username or email exists)
            res.status(400).json({ message: "Registration failed. Username or email might already be taken." });
        } else { // Handle other potential database errors
            // Send back the specific database error message (similar to pg_last_error)
            res.status(500).json({ message: "Registration execution failed.", error: err.message });
        }
    }
});

// --- POST /auth/login ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    try {
        // Query the database for the user by username
        const sql = `SELECT id, password, store_name FROM users WHERE username = $1`;
        const result = await db.query(sql, [username]);
        const user = result.rows[0]; // Get the first user found (should be unique)

        // Check if user exists AND if the provided password matches the hashed password in the database
        if (user && await bcrypt.compare(password, user.password)) {
            // Passwords match - Login successful
            res.status(200).json({
                message: "Login successful.",
                user_id: user.id,
                store_name: user.store_name
                // In a real application, you might generate a JWT token here
            });
        } else {
            // User not found OR password incorrect
            res.status(401).json({ message: "Invalid username or password." });
        }
    } catch (err) {
        console.error("Login Error:", err); // Log the error for server-side debugging
        res.status(500).json({ message: "Login failed due to a server error." });
    }
});

module.exports = router; // Export the router at the very end