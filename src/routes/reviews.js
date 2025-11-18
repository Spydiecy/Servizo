const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { isAuthenticated } = require('../middleware/auth');

// Create review (authenticated)
router.post('/', isAuthenticated, reviewController.createReview);

// Get reviews for a service (public)
router.get('/service/:serviceId', reviewController.getServiceReviews);

// Get review statistics for a service (public)
router.get('/service/:serviceId/stats', reviewController.getReviewStats);

// Get user's reviews (authenticated)
router.get('/user', isAuthenticated, reviewController.getUserReviews);

// Update review (authenticated, owner only)
router.put('/:reviewId', isAuthenticated, reviewController.updateReview);

// Delete review (authenticated, owner only)
router.delete('/:reviewId', isAuthenticated, reviewController.deleteReview);

// Mark review as helpful/not helpful (authenticated)
router.post('/:reviewId/vote', isAuthenticated, reviewController.markReviewHelpful);

// Provider response (authenticated, provider only)
router.post('/:reviewId/response', isAuthenticated, reviewController.addProviderResponse);

module.exports = router;
