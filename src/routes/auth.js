const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getCurrentUser } = require('../controllers/authController');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');

// POST /auth/register
router.post('/register', isNotAuthenticated, registerUser);

// POST /auth/login
router.post('/login', isNotAuthenticated, loginUser);

// POST /auth/logout
router.post('/logout', isAuthenticated, logoutUser);

// GET /auth/me
router.get('/me', isAuthenticated, getCurrentUser);

// GET /auth/login - Login page
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('layouts/main', {
        title: 'Login',
        page: 'auth/login'
    });
});

// GET /auth/register - Register page
router.get('/register', isNotAuthenticated, (req, res) => {
    res.render('layouts/main', {
        title: 'Register',
        page: 'auth/register'
    });
});

module.exports = router;
