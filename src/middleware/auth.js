const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session?.userId) {
        return next();
    }
    
    // If it's an API request, return JSON error
    if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    // Otherwise redirect to login page
    res.redirect('/auth/login');
};

// Middleware to check if user is NOT authenticated (for login/register pages)
const isNotAuthenticated = (req, res, next) => {
    if (req.session?.userId) {
        return res.redirect('/dashboard');
    }
    next();
};

// Middleware to load current user data
const loadUser = async (req, res, next) => {
    try {
        if (req.session?.userId) {
            const user = await User.findById(req.session.userId).select('-password');
            
            if (user) {
                req.user = user;
                res.locals.user = user;
            } else {
                // User not found, clear session
                req.session.destroy();
            }
        }
        next();
    } catch (error) {
        console.error('Load user error:', error);
        // If there's an error, clear the session and continue
        if (req.session) {
            req.session.destroy();
        }
        next();
    }
};

// Middleware to check user role
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.userType)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Check if user is a service provider
const requireProvider = (req, res, next) => {
    if (req.session?.userId && req.session?.user?.userType === 'provider') {
        return next();
    }
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(403).json({
            success: false,
            message: 'Service provider access required'
        });
    }
    
    return res.redirect('/dashboard');
};

// Check if user is a customer
const requireCustomer = (req, res, next) => {
    if (req.session?.userId && req.session?.user?.userType === 'customer') {
        return next();
    }
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(403).json({
            success: false,
            message: 'Customer access required'
        });
    }
    
    return res.redirect('/dashboard');
};

// Add user data to all templates
const addUserToLocals = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
};

// Check if user is a service provider (simplified)
const isProvider = (req, res, next) => {
    if (!req.user || req.user.userType !== 'provider') {
        if (req.headers.accept?.includes('application/json')) {
            return res.status(403).json({
                success: false,
                message: 'Service provider access required'
            });
        }
        return res.redirect('/dashboard');
    }
    next();
};

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    loadUser,
    requireRole,
    requireProvider,
    requireCustomer,
    addUserToLocals,
    isProvider
};
