const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Customer is required']
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: [true, 'Service is required']
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Service provider is required']
    },
    bookingDate: {
        type: Date,
        required: [true, 'Booking date is required']
    },
    bookingTime: {
        type: String,
        required: [true, 'Booking time is required']
    },
    customerAddress: {
        type: String,
        required: [true, 'Customer address is required'],
        trim: true
    },
    specialRequests: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'wallet'],
        default: 'cash'
    },
    notes: {
        customer: String,
        provider: String
    },
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String
}, {
    timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, createdAt: -1 });
bookingSchema.index({ service: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingDate: 1 });

// Virtual for formatted booking date and time
bookingSchema.virtual('formattedDateTime').get(function() {
    const date = this.bookingDate.toLocaleDateString('en-IN');
    return `${date} at ${this.bookingTime}`;
});

// Virtual for formatted status
bookingSchema.virtual('formattedStatus').get(function() {
    const statusMap = {
        'pending': 'Pending Confirmation',
        'confirmed': 'Confirmed',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'rejected': 'Rejected'
    };
    return statusMap[this.status] || this.status;
});

// Ensure virtuals are included in JSON output
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);