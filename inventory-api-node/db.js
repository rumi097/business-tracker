// db.js
const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file for local development

// Check if the DATABASE_URL environment variable is set
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set!');
  process.exit(1); // Exit the application if the URL is missing
}

const pool = new Pool({
  // Use the single DATABASE_URL string provided by Render/Neon
  connectionString: process.env.DATABASE_URL,
  // Required SSL configuration for Neon
  ssl: {
    rejectUnauthorized: false
  }
});

// Optional: Test the connection when the application starts
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring database client', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database!');
  client.release(); // Release the client back to the pool
});

// --- FIX: Export both 'query' and 'pool' ---
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool // Add this line to export the pool object
};