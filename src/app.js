const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');
const { loadUser, isAuthenticated } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database connection
const initializeApp = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
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

        // Temporary routes for development
        app.get('/about', (req, res) => {
            res.json({ message: 'About page - Coming soon!' });
        });

        app.get('/contact', (req, res) => {
            res.json({ message: 'Contact page - Coming soon!' });
        });

        app.get('/bookings', isAuthenticated, (req, res) => {
            res.json({ message: 'Bookings page - Coming soon!' });
        });

        app.get('/profile', isAuthenticated, (req, res) => {
            res.json({ message: 'Profile page - Coming soon!' });
        });

        // Error handling
        app.use((req, res) => {
            res.status(404).json({ message: 'Page not found' });
        });

        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ message: 'Something went wrong!' });
        });

        // Start server
        app.listen(PORT, () => {
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

module.exports = app;
