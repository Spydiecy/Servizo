const express = require('express');
const router = express.Router();
const {
    createBooking,
    getCustomerBookings,
    getProviderBookings,
    updateBookingStatus,
    cancelBooking,
    getBookingById
} = require('../controllers/bookingController');
const { isAuthenticated } = require('../middleware/auth');

// All routes require authentication
router.use(isAuthenticated);

// GET /bookings - Bookings page (different for customers vs providers)
router.get('/', (req, res) => {
    res.render('layouts/main', {
        title: 'My Bookings',
        page: 'bookings/list',
        user: req.user
    });
});

// GET /bookings/api - Get bookings based on user type
router.get('/api', async (req, res) => {
    try {
        if (req.user.userType === 'customer') {
            return getCustomerBookings(req, res);
        } else {
            return getProviderBookings(req, res);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching bookings'
        });
    }
});

// POST /bookings - Create new booking (customers only)
router.post('/', createBooking);

// GET /bookings/:bookingId - Get single booking
router.get('/:bookingId', getBookingById);

// PUT /bookings/:bookingId/status - Update booking status (providers only)
router.put('/:bookingId/status', updateBookingStatus);

// PUT /bookings/:bookingId/cancel - Cancel booking (customers only)
router.put('/:bookingId/cancel', cancelBooking);

module.exports = router;