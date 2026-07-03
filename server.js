const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ override: true });
const db = require('./config/db'); // Naya DB connection import kiya
const syncDatabase = require('./config/syncDatabase');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

// Middlewares
app.use(helmet()); // Secures HTTP headers
app.use(compression()); // Compresses API responses for faster load times
app.use(morgan('dev')); // API Request Logging

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://disanalam.me',
  'https://www.disanalam.me',
  'https://disan-alam-portfolio.web.app',
  'https://disan-alam-portfolio.firebaseapp.com'
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Login pe brute-force rokne ke liye rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});

// API Routes connect kar rahe hain
const { cacheMiddleware, clearCache } = require('./middleware/cacheMiddleware');

// Apply caching to all GET requests globally, except auth
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.includes('/api/auth')) {
        return cacheMiddleware(req, res, next);
    }
    next();
});

// Clear cache whenever data is modified
app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.originalUrl.includes('/api/auth')) {
        clearCache(req, res, next);
    } else {
        next();
    }
});

// Contact form spam rokne ke liye rate limiter
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 messages per IP per hour
  message: { success: false, message: 'Too many messages sent from this IP, please try again after an hour.' }
});

app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/contact', contactLimiter, require('./routes/contactRoutes'));
app.use('/api/about', require('./routes/aboutRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/experience', require('./routes/experienceRoutes'));
app.use('/api/education', require('./routes/educationRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Basic Test Route
app.get('/', (req, res) => {
    res.send('Disan Portfolio Backend is Running with Routes!');
});

// Error Handling Middleware (sabse last me hona chahiye)
app.use(errorHandler);

// Server Start Karein
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    try {
        // Server start hone par ek baar DB check kar lete hain
        await db.query('SELECT 1');
        console.log('✅ Successfully connected to MySQL Database!');
        
        // Auto-sync database schema
        await syncDatabase();
    } catch (error) {
        console.error('❌ Database Connection Error:', error.message);
    }
});
