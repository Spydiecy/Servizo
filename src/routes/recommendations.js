const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { isAuthenticated } = require('../middleware/auth');

// Get recommendations API
router.get('/api/recommendations', isAuthenticated, recommendationController.getRecommendations);

// Get recommendations page
router.get('/recommendations', isAuthenticated, recommendationController.getRecommendationsPage);

module.exports = router;
