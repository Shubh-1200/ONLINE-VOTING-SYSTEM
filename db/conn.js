// conn.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// ✅ Load environment variables from the config.env file
dotenv.config({ path: './config.env' });

// ✅ Get the database URL from the .env
const db = process.env.DATABASE;

mongoose.connect(db, {})
    .then(() => {
        console.log("✅ Connection to MongoDB successful");
    })
    .catch((err) => {
        console.error("❌ Connection error:", err);
    });

// Export mongoose (optional) if needed elsewhere
module.exports = mongoose;
