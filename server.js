const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Serve Swagger API Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
})); // Secures HTTP headers with Strict CSP and HSTS
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Attach io to app so it can be accessed in controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

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
  max: 5, // Max 5 attempts per IP
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP per 15 min for dashboard
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Global Rate Limiter to prevent DoS attacks on general API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(globalLimiter);
app.disable('x-powered-by'); // Security best practice

// API Routes connect kar rahe hain
const { cacheMiddleware, clearCache } = require('./middleware/cacheMiddleware');

// Apply caching to all GET requests globally, except protected routes
app.use((req, res, next) => {
    const protectedRoutes = ['/api/auth', '/api/leads', '/api/scraper', '/api/upload'];
    const isProtected = protectedRoutes.some(route => req.originalUrl.includes(route));
    if (req.method === 'GET' && !isProtected) {
        return cacheMiddleware(req, res, next);
    }
    next();
});

// Clear cache whenever data is modified, but NOT on blog view increments
app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && 
        !req.originalUrl.includes('/api/auth') && 
        !req.originalUrl.includes('/view')) {
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
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/about', require('./routes/aboutRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/scraper', adminLimiter, require('./routes/scraperRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/experience', require('./routes/experienceRoutes'));
app.use('/api/education', require('./routes/educationRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/web-analytics', require('./routes/analyticsRoutes'));

// Email Automation Routes
app.use('/api/leads', adminLimiter, require('./routes/emailLeads'));
app.use('/api/track', require('./routes/emailTrack'));
app.use('/api/settings', adminLimiter, require('./routes/emailSettings'));
app.use('/api/analytics', adminLimiter, require('./routes/emailAnalytics'));
app.use('/api/inbox', adminLimiter, require('./routes/emailInbox'));
app.use('/api/mockup', require('./routes/emailMockup'));

const sitemapController = require('./controllers/sitemapController');
const llmsController = require('./controllers/llmsController');

// Basic Test Route
app.get('/', (req, res) => {
    res.send('Disan Portfolio Backend is Running with Routes!');
});

// Dynamic Sitemap Route
app.get('/sitemap.xml', sitemapController.generateSitemap);

// Dynamic LLMS.txt Route
app.get('/llms.txt', llmsController.generateLLMS);

// SEO Share Route for Social Media Bots (WhatsApp, Twitter, etc.)
const seoController = require('./controllers/seoController');
app.get('/api/seo/blogs/:slug', seoController.renderBlogSEO);

// Error Handling Middleware (sabse last me hona chahiye)
app.use(errorHandler);

// Global Error Handlers to keep the backend powerful and alive
process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION: Backend remains alive, but please check:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Server Start Karein
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    try {
        // Server start hone par ek baar DB check kar lete hain
        await db.query('SELECT 1');
        console.log('✅ Successfully connected to MySQL Database!');
        
        // Auto-sync database schema
        await syncDatabase();
        
        // Initialize Background Worker for Lead Generation
        const worker = require('./worker/worker');
        worker.initWorker();
    } catch (error) {
        console.error('❌ Database Connection Error:', error.message);
    }
});
