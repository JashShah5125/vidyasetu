require('dotenv').config({ path: __dirname + '/../../.env' });
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

        await redisClient.connect();

        app.listen(PORT, () => {
            console.log(`🚀 Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        process.exit(1);
    }
};

startServer();
