const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');

// Create a new booking (Customer only)
const createBooking = async (req, res) => {
    try {
        const {
            serviceId,
            bookingDate,
            bookingTime,
            customerAddress,
            specialRequests
        } = req.body;

        // Validate that user is a customer
        if (req.user.userType !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can create bookings'
            });
        }

        // Get service details
        const service = await Service.findById(serviceId).populate('provider');
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Check if booking date is in the future
        const bookingDateTime = new Date(`${bookingDate}T${bookingTime}:00`);
        if (bookingDateTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Booking date and time must be in the future'
            });
        }

        // Create new booking
        const booking = new Booking({
            customer: req.user._id,
            service: serviceId,
            provider: service.provider._id,
            bookingDate: new Date(bookingDate),
            bookingTime,
            customerAddress,
            specialRequests,
            totalAmount: service.price
        });

        await booking.save();

        // Populate the booking for response
        await booking.populate([
            { path: 'service', select: 'title description price category' },
            { path: 'provider', select: 'fullName email phone' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating booking',
            error: error.message
        });
    }
};

// Get customer bookings
const getCustomerBookings = async (req, res) => {
    try {
        const { status } = req.query;

        const filter = { customer: req.user._id };
        if (status && status !== 'all') {
            filter.status = status;
        }

        const bookings = await Booking.find(filter)
            .populate('service', 'title description price category duration')
            .populate('provider', 'firstName lastName email phone')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            bookings
        });

    } catch (error) {
        console.error('Get customer bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bookings',
            error: error.message
        });
    }
};

// Get provider bookings
const getProviderBookings = async (req, res) => {
    try {
        const { status } = req.query;

        const filter = { provider: req.user._id };
        if (status && status !== 'all') {
            filter.status = status;
        }

        const bookings = await Booking.find(filter)
            .populate('service', 'title description price category duration')
            .populate('customer', 'firstName lastName email phone')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            bookings
        });

    } catch (error) {
        console.error('Get provider bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bookings',
            error: error.message
        });
    }
};

// Update booking status (Provider only)
const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, notes } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if user is the provider for this booking
        if (booking.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own bookings'
            });
        }

        // Update booking status
        booking.status = status;
        if (notes) {
            booking.notes.provider = notes;
        }

        if (status === 'completed') {
            booking.completedAt = new Date();
        } else if (status === 'cancelled') {
            booking.cancelledAt = new Date();
            booking.cancellationReason = notes;
        }

        await booking.save();

        // Populate for response
        await booking.populate([
            { path: 'service', select: 'title description price category' },
            { path: 'customer', select: 'fullName email phone' }
        ]);

        res.json({
            success: true,
            message: 'Booking status updated successfully',
            booking
        });

    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating booking status',
            error: error.message
        });
    }
};

// Cancel booking (Customer only)
const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if user is the customer for this booking
        if (booking.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own bookings'
            });
        }

        // Check if booking can be cancelled
        if (['completed', 'cancelled'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: 'This booking cannot be cancelled'
            });
        }

        // Update booking
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason;
        booking.notes.customer = reason;

        await booking.save();

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking
        });

    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling booking',
            error: error.message
        });
    }
};

// Get single booking details
const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate('service', 'title description price category duration')
            .populate('customer', 'fullName email phone')
            .populate('provider', 'fullName email phone');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if user has access to this booking
        const hasAccess = booking.customer._id.toString() === req.user._id.toString() ||
                         booking.provider._id.toString() === req.user._id.toString();

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            booking
        });

    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching booking',
            error: error.message
        });
    }
};

module.exports = {
    createBooking,
    getCustomerBookings,
    getProviderBookings,
    updateBookingStatus,
    cancelBooking,
    getBookingById
};