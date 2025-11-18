const Review = require('../models/Review');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { serviceId, bookingId, rating, comment, images } = req.body;
    const userId = req.user._id;

    // Validate booking exists and belongs to user
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: userId,
      service: serviceId,
      status: 'completed'
    });

    if (!booking) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking or booking not completed'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ userId, bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Create review
    const review = new Review({
      serviceId,
      userId,
      bookingId,
      rating,
      comment,
      images: images || [],
      isVerified: true
    });

    await review.save();

    // Populate user details
    await review.populate('userId', 'firstName lastName profileImage');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create review'
    });
  }
};

// Get reviews for a service
exports.getServiceReviews = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { 
      sort = 'newest', // newest, oldest, highest, lowest, helpful
      rating,
      page = 1,
      limit = 10
    } = req.query;

    const mongoose = require('mongoose');

    // Build filter - convert serviceId to ObjectId
    const filter = { serviceId: new mongoose.Types.ObjectId(serviceId) };
    if (rating) {
      filter.rating = parseInt(rating);
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpful: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total, service] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'firstName lastName profileImage')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(filter),
      Service.findById(serviceId, 'rating')
    ]);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { serviceId: new mongoose.Types.ObjectId(serviceId) } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    res.json({
      success: true,
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      },
      stats: {
        average: service?.rating?.average || 0,
        total: service?.rating?.count || 0,
        distribution
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ userId })
        .populate('serviceId', 'title category images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments({ userId })
    ]);

    res.json({
      success: true,
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, images } = req.body;
    const userId = req.user._id;

    const review = await Review.findOne({ _id: reviewId, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    await review.save();

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update review'
    });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findOneAndDelete({ _id: reviewId, userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
};

// Mark review as helpful/not helpful
exports.markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { helpful } = req.body; // true or false
    const userId = req.user._id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Prevent reviewing own review
    if (review.userId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot vote on your own review'
      });
    }

    const userIdStr = userId.toString();

    // Remove from both arrays first
    review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userIdStr);
    review.notHelpfulBy = review.notHelpfulBy.filter(id => id.toString() !== userIdStr);

    // Add to appropriate array
    if (helpful === true) {
      review.helpfulBy.push(userId);
    } else if (helpful === false) {
      review.notHelpfulBy.push(userId);
    }

    // Update counts
    review.helpful = review.helpfulBy.length;
    review.notHelpful = review.notHelpfulBy.length;

    await review.save();

    res.json({
      success: true,
      message: 'Vote recorded',
      helpful: review.helpful,
      notHelpful: review.notHelpful,
      userVote: helpful
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vote'
    });
  }
};

// Provider response to review
exports.addProviderResponse = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(reviewId).populate('serviceId');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the service provider
    if (review.serviceId.provider.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only service provider can respond'
      });
    }

    review.providerResponse = {
      comment,
      respondedAt: new Date()
    };

    await review.save();

    res.json({
      success: true,
      message: 'Response added successfully',
      review
    });
  } catch (error) {
    console.error('Provider response error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
};

// Get review statistics
exports.getReviewStats = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const mongoose = require('mongoose');

    const stats = await Review.aggregate([
      { $match: { serviceId: new mongoose.Types.ObjectId(serviceId) } },
      {
        $facet: {
          ratingDistribution: [
            {
              $group: {
                _id: '$rating',
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: -1 } }
          ],
          averageRating: [
            {
              $group: {
                _id: null,
                average: { $avg: '$rating' },
                total: { $sum: 1 }
              }
            }
          ],
          verifiedPercentage: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                verified: {
                  $sum: { $cond: ['$isVerified', 1, 0] }
                }
              }
            }
          ]
        }
      }
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats[0].ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    const avgData = stats[0].averageRating[0] || { average: 0, total: 0 };
    const verifiedData = stats[0].verifiedPercentage[0] || { total: 0, verified: 0 };

    res.json({
      success: true,
      stats: {
        average: Math.round(avgData.average * 10) / 10,
        total: avgData.total,
        distribution,
        verifiedPercentage: avgData.total > 0 
          ? Math.round((verifiedData.verified / verifiedData.total) * 100) 
          : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};
