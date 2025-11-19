const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const recommendationEngine = require('../utils/recommendationEngine');

exports.getRecommendations = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to get recommendations'
            });
        }

        const user = await User.findById(userId);

        // Only allow customers to access recommendations
        if (user.userType !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'This feature is only available for customers'
            });
        }

        // Get user's booking history
        const userBookings = await Booking.find({ customer: userId })
            .populate('service')
            .populate('provider')
            .sort({ createdAt: -1 })
            .limit(50);

        // Get all bookings for collaborative filtering
        const allBookings = await Booking.find()
            .populate('customer')
            .populate('service')
            .populate('provider')
            .limit(2000);

        // Get all active services
        const allServices = await Service.find({ isActive: true })
            .populate('provider');

        // Get hybrid recommendations
        const recommendations = recommendationEngine.getHybridRecommendations(
            user,
            userBookings,
            allBookings,
            allServices,
            10
        );

        res.json({
            success: true,
            recommendations,
            userBookingCount: userBookings.length
        });

    } catch (error) {
        console.error('Recommendation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating recommendations',
            error: error.message
        });
    }
};

exports.getRecommendationsPage = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.redirect('/auth/login');
        }

        const user = await User.findById(userId);

        // Only allow customers to access recommendations
        if (user.userType !== 'customer') {
            return res.redirect('/dashboard');
        }

        const userBookings = await Booking.find({ customer: userId })
            .populate('service')
            .populate('provider')
            .sort({ createdAt: -1 })
            .limit(50);

        const allBookings = await Booking.find()
            .populate('customer')
            .populate('service')
            .populate('provider')
            .limit(2000);

        const allServices = await Service.find({ isActive: true })
            .populate('provider');

        const recommendations = recommendationEngine.getHybridRecommendations(
            user,
            userBookings,
            allBookings,
            allServices,
            12
        );

        res.render('layouts/main', {
            title: 'Recommended for You',
            page: 'recommendations',
            user,
            recommendations
        });

    } catch (error) {
        console.error('Recommendation page error:', error);
        res.redirect('/');
    }
};
