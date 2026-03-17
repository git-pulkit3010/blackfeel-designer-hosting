import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.js';
import designRoutes from './routes/designs.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://designer.blackfeel.co.in',
    'https://www.designer.blackfeel.co.in',
    'https://blackfeel-designer-hosting.onrender.com'
];

// Add FRONTEND_URL if provided
if (process.env.FRONTEND_URL) {
    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash
    if (!allowedOrigins.includes(frontendUrl)) {
        allowedOrigins.push(frontendUrl);
    }
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            // 'unsafe-inline' is needed for the onclick handlers in your HTML
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://checkout.razorpay.com", "https://cdn.jsdelivr.net"],
            "script-src-attr": ["'unsafe-inline'"], 
            "frame-src": ["'self'", "https://api.razorpay.com"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "connect-src": ["'self'", "https:", "http://localhost:3000", ...allowedOrigins],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed === '*') return true;
            try {
                // Exact match or subdomain match if we wanted, but let's stick to exact match or same domain
                return origin === allowed;
            } catch (e) {
                return false;
            }
        });

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.warn(`Blocked origin by CORS: ${origin}`);
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});
