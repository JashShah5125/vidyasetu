const path = require('path');

// Load environment variables from backend or root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const pool = require('./config/db');
const redisClient = require('./config/redis');

const PORT = process.env.PORT || 5000;

// Test DB and Redis Connections before starting server
const startServer = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();

        try {
            await redisClient.connect();
        } catch (redisErr) {
            console.warn('⚠️ Redis connection failed (running without Redis cache/session store):', redisErr.message || redisErr);
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            console.log(`📡 Health check available at: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message || error.code || error);
        console.error('💡 Please ensure your MySQL service is running and credentials in .env are correct.');
        process.exit(1);
    }
};

startServer();
