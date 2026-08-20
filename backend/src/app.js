const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const billingRoutes = require('./routes/billingRoutes');

// Basic Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running smoothly' });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/tenants', tenantRoutes);
app.use('/api/admin/plans', planRoutes);
app.use('/api/admin/subscriptions', subscriptionRoutes);
app.use('/api/admin/billing', billingRoutes);

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

module.exports = app;
