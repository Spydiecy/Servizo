const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Service title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Service description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Service category is required'],
        enum: ['cleaning', 'ac', 'plumbing', 'electrical', 'painting', 'beauty', 'appliance', 'pest-control', 'home-repair', 'other'],
        lowercase: true
    },
    subcategory: {
        type: String,
        trim: true,
        maxlength: [50, 'Subcategory cannot exceed 50 characters']
    },
    price: {
        type: Number,
        required: [true, 'Service price is required'],
        min: [0, 'Price cannot be negative']
    },
    priceType: {
        type: String,
        enum: ['fixed', 'hourly', 'per-visit', 'custom'],
        default: 'fixed'
    },
    duration: {
        type: Number, // Duration in minutes
        required: [true, 'Service duration is required'],
        min: [15, 'Minimum duration is 15 minutes']
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Service provider is required']
    },
    images: [{
        url: String,
        alt: String
    }],
    features: [{
        type: String,
        trim: true
    }],
    serviceArea: {
        city: {
            type: String,
            required: [true, 'Service city is required'],
            trim: true
        },
        areas: [{
            type: String,
            trim: true
        }],
        radius: {
            type: Number,
            default: 10 // km radius
        }
    },
    availability: {
        days: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }],
        timeSlots: [{
            start: String, // "09:00"
            end: String    // "17:00"
        }]
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    bookingCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ 'serviceArea.city': 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ createdAt: -1 });

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
    const priceText = `₹${this.price}`;
    switch(this.priceType) {
        case 'hourly': return `${priceText}/hour`;
        case 'per-visit': return `${priceText}/visit`;
        case 'custom': return priceText;
        default: return priceText;
    }
});

// Virtual for formatted duration
serviceSchema.virtual('formattedDuration').get(function() {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    
    if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else {
        return `${minutes}m`;
    }
});

// Ensure virtuals are included in JSON output
serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Service', serviceSchema);