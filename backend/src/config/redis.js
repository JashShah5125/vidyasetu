const path = require('path');
const { createClient } = require('redis');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err.message || err.code || err));
redisClient.on('connect', () => console.log('✅ Redis connected successfully'));

module.exports = redisClient;
