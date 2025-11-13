const redis = require('redis');
require('dotenv').config();

let redisClient = null;

const connectRedis = async () => {
    try {
        if (!process.env.REDIS_URL) {
            console.log('⚠️  REDIS_URL not configured in .env file');
            return null;
        }

        // Detect if TLS is needed based on URL
        const useTLS = process.env.REDIS_URL.startsWith('rediss://');

        const clientOptions = {
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 10000,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('❌ Too many Redis connection attempts');
                        return new Error('Too many retries');
                    }
                    return retries * 100;
                }
            }
        };

        // Only add TLS config if using rediss://
        if (useTLS) {
            clientOptions.socket.tls = true;
            clientOptions.socket.rejectUnauthorized = false;
        }

        redisClient = redis.createClient(clientOptions);

        redisClient.on('error', (err) => {
            console.error('❌ Redis Client Error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('🔄 Connecting to Redis Cloud...');
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis connected successfully!');
        });

        redisClient.on('reconnecting', () => {
            console.log('🔄 Redis reconnecting...');
        });

        await redisClient.connect();
        
        // Test connection with PING
        await redisClient.ping();
        console.log('✅ Redis PING successful!');
        
        return redisClient;
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error.message);
        console.log('⚠️  Running without Redis cache');
        return null;
    }
};

const getRedisClient = () => {
    return redisClient;
};

const closeRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        console.log('🔌 Redis connection closed');
    }
};

module.exports = { connectRedis, getRedisClient, closeRedis };
