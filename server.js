const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db'); // Naya DB connection import kiya

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes connect kar rahe hain
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/about', require('./routes/aboutRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/experience', require('./routes/experienceRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));

// Basic Test Route
app.get('/', (req, res) => {
    res.send('Disan Portfolio Backend is Running with Routes!');
});

// Server Start Karein
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    try {
        // Server start hone par ek baar DB check kar lete hain
        await db.query('SELECT 1');
        console.log('✅ Successfully connected to MySQL Database!');
    } catch (error) {
        console.error('❌ Database Connection Error:', error.message);
    }
});
