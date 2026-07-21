require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const errorHandler = require('./src/middleware/errorHandler');

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const userRoutes = require('./src/routes/userRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const couponRoutes = require('./src/routes/couponRoutes'); 
const reviewRoutes = require('./src/routes/reviewRoutes');
const shippingRoutes = require('./src/routes/shippingRoutes');

const app = express();
const prisma = new PrismaClient();

app.set('trust proxy', 1);

// CORS
const allowedOrigins = [
  'https://storex-frontend-gold.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const host = new URL(origin).hostname;
      const isPreview = /\.preview\.emergentagent\.com$/.test(host) || /\.preview\.emergentcf\.cloud$/.test(host);
      const isVercel = /\.vercel\.app$/.test(host);
      if (allowedOrigins.indexOf(origin) !== -1 || isPreview || isVercel || host === 'localhost' || host === '127.0.0.1') {
        return callback(null, true);
      }
    } catch (e) { /* fall through to reject */ }
    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// WEBHOOK ROUTE (Must be BEFORE express.json())
const paymentController = require('./src/controllers/paymentController');
app.post('/api/payments/webhook', 
  express.raw({ type: 'application/json' }), 
  (req, res, next) => { req.prisma = prisma; next(); },
  paymentController.handleWebhook
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'healthy', environment: process.env.NODE_ENV });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes); // ADD THIS
app.use('/api/reviews', reviewRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;