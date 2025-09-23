const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Mock data for development
const mockUser = null; // Set to user object when logged in

// Routes
app.get('/', (req, res) => {
    res.render('layouts/main', {
        title: 'Home',
        user: mockUser,
        page: 'index'
    });
});

app.get('/auth/login', (req, res) => {
    res.render('layouts/main', {
        title: 'Login',
        user: mockUser,
        page: 'auth/login'
    });
});

app.get('/auth/register', (req, res) => {
    res.render('layouts/main', {
        title: 'Register',
        user: mockUser,
        page: 'auth/register'
    });
});

// Mock routes for testing
app.get('/services', (req, res) => {
    res.json({ message: 'Services page - Coming soon!' });
});

app.get('/about', (req, res) => {
    res.json({ message: 'About page - Coming soon!' });
});

app.get('/contact', (req, res) => {
    res.json({ message: 'Contact page - Coming soon!' });
});

app.get('/dashboard', (req, res) => {
    res.json({ message: 'Dashboard - Coming soon!' });
});

app.get('/bookings', (req, res) => {
    res.json({ message: 'Bookings page - Coming soon!' });
});

// Error handling
app.use((req, res) => {
    res.status(404).json({ message: 'Page not found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servizo server running on http://localhost:${PORT}`);
    console.log(`📱 Frontend ready for testing!`);
});

module.exports = app;
