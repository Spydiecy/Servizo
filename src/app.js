const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeSocket } = require('./config/socket');
const { loadUser, isAuthenticated } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize database connection
const initializeApp = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Connect to Redis
        await connectRedis();
        
        // Initialize Socket.IO
        initializeSocket(server);
        console.log('💬 Socket.IO initialized for live chat');
        
        // Set view engine
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, '../views'));

        // Middleware
        app.use(express.static(path.join(__dirname, '../public')));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Session configuration
        app.use(session({
            secret: process.env.SESSION_SECRET || 'your-secret-key',
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/servizo'
            }),
            cookie: {
                secure: false, // Set to true in production with HTTPS
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }));

        // Load user for all requests
        app.use(loadUser);

        // Routes
        app.use('/auth', require('./routes/auth'));
        app.use('/services', require('./routes/services'));
        app.use('/bookings', require('./routes/bookings'));
        app.use('/reviews', require('./routes/reviews'));

        // Homepage
        app.get('/', (req, res) => {
            res.render('layouts/main', {
                title: 'Home',
                page: 'index'
            });
        });

        // Dashboard (protected route)
        app.get('/dashboard', isAuthenticated, (req, res) => {
            res.render('layouts/main', {
                title: 'Dashboard',
                page: 'dashboard'
            });
        });

        // About and Contact pages
        app.get('/about', (req, res) => {
            res.render('layouts/main', {
                title: 'About Us',
                page: 'about',
                user: req.user
            });
        });

        app.get('/contact', (req, res) => {
            res.render('layouts/main', {
                title: 'Contact Us',
                page: 'contact',
                user: req.user
            });
        });

        app.get('/profile', isAuthenticated, (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        // Redis Cache Status Endpoint (for monitoring)
        app.get('/admin/cache-status', async (req, res) => {
            try {
                const { getRedisClient } = require('./config/redis');
                const client = getRedisClient();
                
                if (!client) {
                    return res.json({
                        connected: false,
                        message: 'Redis not connected - Running without cache'
                    });
                }

                // Get all keys
                const allKeys = await client.keys('*');
                const serviceKeys = await client.keys('services_*');
                
                const keysInfo = [];
                for (const key of allKeys) {
                    const ttl = await client.ttl(key);
                    const type = await client.type(key);
                    keysInfo.push({
                        key,
                        type,
                        ttl: ttl === -1 ? 'No expiry' : `${ttl}s`,
                        expiresIn: ttl === -1 ? null : `${Math.floor(ttl/60)}m ${ttl%60}s`
                    });
                }

                res.json({
                    connected: true,
                    status: '✅ Redis is working!',
                    totalKeys: allKeys.length,
                    serviceCaches: serviceKeys.length,
                    cacheDetails: keysInfo,
                    info: {
                        cacheDuration: '600 seconds (10 minutes)',
                        performance: 'Cached requests are ~95% faster',
                        howToTest: {
                            step1: 'Visit /services page',
                            step2: 'Check server console for cache logs',
                            step3: 'Refresh page - should serve from cache'
                        }
                    }
                });

            } catch (error) {
                res.status(500).json({
                    connected: false,
                    error: error.message
                });
            }
        });

        // Additional routes that might be accessed but don't exist yet
        app.get('/help', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/support', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/faq', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/pricing', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/how-it-works', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        // Footer links that don't exist yet
        app.get('/become-provider', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/privacy', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/terms', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/refund', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        // Common pages people might try to access
        app.get('/careers', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/blog', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        app.get('/news', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        // Handle common bot/crawler requests with appropriate responses
        app.get('/robots.txt', (req, res) => {
            res.type('text/plain');
            res.send(`User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Allow: /

Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`);
        });

        app.get('/favicon.ico', (req, res) => {
            res.status(204).end(); // No content
        });

        app.get('/sitemap.xml', (req, res) => {
            res.type('application/xml');
            res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${req.protocol}://${req.get('host')}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${req.protocol}://${req.get('host')}/services</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
        });

        // Admin routes (not implemented yet)
        app.get('/admin*', isAuthenticated, (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        // API routes that don't exist
        app.use('/api*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'API endpoint not found',
                error: 'The requested API endpoint does not exist'
            });
        });

        // Catch-all 404 handler - MUST be the last route
        app.use('*', (req, res) => {
            res.status(404).render('layouts/main', {
                title: 'Page Not Found',
                page: '404',
                user: req.user
            });
        });

        // 500 Error handling
        app.use((err, req, res, next) => {
            console.error('❌ Server Error:', err.stack);
            
            // Don't expose error details in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            res.status(500).render('layouts/main', {
                title: 'Server Error',
                page: '500',
                user: req.user,
                error: isDevelopment ? err.message : 'Something went wrong!'
            });
        });

        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 Local: http://localhost:${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('✅ Application initialized successfully!');
        });

    } catch (error) {
        console.error('❌ Failed to initialize application:', error.message);
        process.exit(1);
    }
};

// Initialize the application
initializeApp();

module.exports = { app, server };
