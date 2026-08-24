const path = require('path');
const { createClient } = require('redis');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const realClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 2) {
                // Stop retrying and return error to fail fast
                return false;
            }
            return 500; // retry after 500ms
        }
    }
});

let isConnected = false;
const memoryStore = new Map();

realClient.on('error', (err) => {
    // Only print error logs if we are connected or trying to connect initially
    if (isConnected) {
        console.error('❌ Redis Client Error:', err.message || err.code || err);
    }
});

realClient.on('connect', () => {
    isConnected = true;
    console.log('✅ Redis connected successfully');
});

realClient.on('end', () => {
    isConnected = false;
});

const redisClient = {
    connect: async () => {
        try {
            await realClient.connect();
            isConnected = true;
        } catch (err) {
            isConnected = false;
            console.warn('⚠️ Redis connection failed. Falling back to in-memory session store.');
            throw err;
        }
    },
    setEx: async (key, seconds, value) => {
        if (isConnected) {
            try {
                return await realClient.setEx(key, seconds, value);
            } catch (err) {
                console.warn('⚠️ Redis setEx failed, falling back to memory store:', err.message);
            }
        }
        memoryStore.set(key, value);
        // Clean up key after expiration
        setTimeout(() => {
            memoryStore.delete(key);
        }, seconds * 1000);
        return 'OK';
    },
    get: async (key) => {
        if (isConnected) {
            try {
                return await realClient.get(key);
            } catch (err) {
                console.warn('⚠️ Redis get failed, falling back to memory store:', err.message);
            }
        }
        return memoryStore.get(key) || null;
    },
    del: async (key) => {
        if (isConnected) {
            try {
                return await realClient.del(key);
            } catch (err) {
                console.warn('⚠️ Redis del failed, falling back to memory store:', err.message);
            }
        }
        return memoryStore.delete(key) ? 1 : 0;
    }
};

module.exports = redisClient;
