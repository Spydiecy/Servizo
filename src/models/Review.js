const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1 star'],
    max: [5, 'Rating cannot exceed 5 stars'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Review must be at least 10 characters'],
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0
  },
  notHelpful: {
    type: Number,
    default: 0,
    min: 0
  },
  helpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notHelpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  providerResponse: {
    comment: {
      type: String,
      trim: true,
      maxlength: [300, 'Response cannot exceed 300 characters']
    },
    respondedAt: {
      type: Date
    }
  },
  isVerified: {
    type: Boolean,
    default: false // True if booking is completed
  },
  images: [{
    url: String,
    caption: String
  }]
}, {
  timestamps: true
});

// Compound index - one review per booking
reviewSchema.index({ userId: 1, bookingId: 1 }, { unique: true });

// Index for filtering and sorting
reviewSchema.index({ serviceId: 1, rating: -1 });
reviewSchema.index({ serviceId: 1, createdAt: -1 });
reviewSchema.index({ serviceId: 1, helpful: -1 });

// Virtual for net helpfulness score
reviewSchema.virtual('helpfulScore').get(function() {
  return this.helpful - this.notHelpful;
});

// Ensure virtuals are included
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

// Update service average rating after review save
reviewSchema.post('save', async function() {
  await updateServiceRating(this.serviceId);
});

// Update service average rating after review update
reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await updateServiceRating(doc.serviceId);
  }
});

// Update service average rating after review deletion
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await updateServiceRating(doc.serviceId);
  }
});

// Helper function to update service rating
async function updateServiceRating(serviceId) {
  const Review = mongoose.model('Review');
  const Service = mongoose.model('Service');

  const stats = await Review.aggregate([
    { $match: { serviceId: new mongoose.Types.ObjectId(serviceId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        fiveStarCount: {
          $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
        },
        fourStarCount: {
          $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
        },
        threeStarCount: {
          $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
        },
        twoStarCount: {
          $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
        },
        oneStarCount: {
          $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
        }
      }
    }
  ]);

  if (stats.length > 0) {
    const { averageRating, totalReviews } = stats[0];
    await Service.findByIdAndUpdate(serviceId, {
      'rating.average': Math.round(averageRating * 10) / 10, // Round to 1 decimal
      'rating.count': totalReviews
    });
  } else {
    // No reviews, reset to 0
    await Service.findByIdAndUpdate(serviceId, {
      'rating.average': 0,
      'rating.count': 0
    });
  }
}

module.exports = mongoose.model('Review', reviewSchema);
