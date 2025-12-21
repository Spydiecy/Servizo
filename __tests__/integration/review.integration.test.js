const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Service = require('../../src/models/Service');
const Booking = require('../../src/models/Booking');
const Review = require('../../src/models/Review');

jest.setTimeout(15000);

describe('Review System Integration Tests', () => {
    let customer, provider, service, booking;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect('mongodb://127.0.0.1:27017/servizo_test');
        }
    });

    beforeEach(async () => {
        // Clean up
        await User.deleteMany({ email: /review.*@integration\.com/ });
        await Service.deleteMany({ title: /Review.*Test/ });
        await Booking.deleteMany({});
        await Review.deleteMany({});

        // Create test data
        customer = await User.create({
            firstName: 'Review',
            lastName: 'Customer',
            email: 'review.customer@integration.com',
            phone: '+919876543240',
            password: 'Password123',
            userType: 'customer',
            emailVerified: true
        });

        provider = await User.create({
            firstName: 'Review',
            lastName: 'Provider',
            email: 'review.provider@integration.com',
            phone: '+919876543241',
            password: 'Password123',
            userType: 'provider',
            emailVerified: true
        });

        service = await Service.create({
            title: 'Review Test Service',
            description: 'Service for review testing',
            category: 'cleaning',
            price: 800,
            duration: 120,
            provider: provider._id,
            serviceArea: { city: 'Mumbai' }
        });

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        booking = await Booking.create({
            customer: customer._id,
            service: service._id,
            provider: provider._id,
            bookingDate: yesterday,
            bookingTime: '10:00',
            customerAddress: 'Test Address',
            totalAmount: 800,
            status: 'completed',
            completedAt: new Date()
        });
    });

    afterAll(async () => {
        await User.deleteMany({ email: /review.*@integration\.com/ });
        await Service.deleteMany({ title: /Review.*Test/ });
        await Booking.deleteMany({});
        await Review.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Review Creation', () => {
        test('Should create a review for completed booking', async () => {
            const reviewData = {
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                booking: booking._id,
                rating: 5,
                comment: 'Excellent service! Very professional and thorough.',
                wouldRecommend: true
            };

            const review = await Review.create(reviewData);

            expect(review._id).toBeDefined();
            expect(review.rating).toBe(5);
            expect(review.comment).toBe(reviewData.comment);
            expect(review.wouldRecommend).toBe(true);
        });

        test('Should create review with different ratings', async () => {
            const ratings = [1, 2, 3, 4, 5];
            
            for (const rating of ratings) {
                const review = await Review.create({
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    booking: booking._id,
                    rating: rating,
                    comment: `${rating} star review`
                });
                expect(review.rating).toBe(rating);
            }
        });

        test('Should validate rating is between 1 and 5', async () => {
            const invalidReview = new Review({
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                booking: booking._id,
                rating: 6,
                comment: 'Invalid rating'
            });

            let error;
            try {
                await invalidReview.validate();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
        });

        test('Should require all mandatory fields', async () => {
            const invalidReview = new Review({});

            let error;
            try {
                await invalidReview.validate();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors).toHaveProperty('customer');
            expect(error.errors).toHaveProperty('service');
            expect(error.errors).toHaveProperty('rating');
        });
    });

    describe('Review Updates and Service Rating Calculation', () => {
        test('Should update service average rating after review', async () => {
            // Create multiple reviews
            const reviews = [
                { rating: 5, comment: 'Excellent' },
                { rating: 4, comment: 'Very good' },
                { rating: 5, comment: 'Amazing' }
            ];

            for (const reviewData of reviews) {
                await Review.create({
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    booking: booking._id,
                    ...reviewData
                });
            }

            // Calculate average
            const allReviews = await Review.find({ service: service._id });
            const average = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

            // Update service
            service.rating.average = average;
            service.rating.count = allReviews.length;
            await service.save();

            const updatedService = await Service.findById(service._id);
            expect(updatedService.rating.average).toBeCloseTo(4.67, 1);
            expect(updatedService.rating.count).toBe(3);
        });

        test('Should update provider rating after review', async () => {
            await Review.create({
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                booking: booking._id,
                rating: 5,
                comment: 'Great provider'
            });

            const reviews = await Review.find({ provider: provider._id });
            const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

            provider.providerInfo.rating = average;
            await provider.save();

            const updatedProvider = await User.findById(provider._id);
            expect(updatedProvider.providerInfo.rating).toBe(5);
        });
    });

    describe('Review Queries', () => {
        beforeEach(async () => {
            // Create multiple reviews
            await Review.create([
                {
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    booking: booking._id,
                    rating: 5,
                    comment: 'Excellent work!',
                    wouldRecommend: true
                },
                {
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    booking: booking._id,
                    rating: 4,
                    comment: 'Good service',
                    wouldRecommend: true
                },
                {
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    booking: booking._id,
                    rating: 3,
                    comment: 'Average',
                    wouldRecommend: false
                }
            ]);
        });

        test('Should get all reviews for a service', async () => {
            const reviews = await Review.find({ service: service._id });
            expect(reviews.length).toBe(3);
        });

        test('Should get all reviews for a provider', async () => {
            const reviews = await Review.find({ provider: provider._id });
            expect(reviews.length).toBe(3);
        });

        test('Should filter highly rated reviews', async () => {
            const topReviews = await Review.find({
                service: service._id,
                rating: { $gte: 4 }
            });
            expect(topReviews.length).toBe(2);
        });

        test('Should filter reviews with recommendations', async () => {
            const recommended = await Review.find({
                service: service._id,
                wouldRecommend: true
            });
            expect(recommended.length).toBe(2);
        });

        test('Should sort reviews by rating', async () => {
            const sorted = await Review.find({ service: service._id })
                .sort({ rating: -1 });
            
            expect(sorted[0].rating).toBe(5);
            expect(sorted[sorted.length - 1].rating).toBe(3);
        });

        test('Should populate customer and service details', async () => {
            const review = await Review.findOne({ service: service._id })
                .populate('customer', 'firstName lastName')
                .populate('service', 'title category');

            expect(review.customer).toBeDefined();
            expect(review.customer.firstName).toBe(customer.firstName);
            expect(review.service.title).toBe(service.title);
        });
    });

    describe('Review Statistics', () => {
        beforeEach(async () => {
            // Create reviews with various ratings
            const ratings = [5, 5, 4, 4, 4, 3, 3, 2, 1];
            for (const rating of ratings) {
                await Review.create({
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    booking: booking._id,
                    rating: rating,
                    comment: `${rating} stars`
                });
            }
        });

        test('Should calculate rating distribution', async () => {
            const distribution = await Review.aggregate([
                { $match: { service: service._id } },
                {
                    $group: {
                        _id: '$rating',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: -1 } }
            ]);

            expect(distribution).toBeDefined();
            expect(distribution.length).toBeGreaterThan(0);
        });

        test('Should calculate average rating', async () => {
            const result = await Review.aggregate([
                { $match: { service: service._id } },
                {
                    $group: {
                        _id: null,
                        avgRating: { $avg: '$rating' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            expect(result[0].avgRating).toBeGreaterThan(0);
            expect(result[0].count).toBe(9);
        });

        test('Should count recommendation percentage', async () => {
            const all = await Review.find({ service: service._id });
            const recommended = await Review.find({
                service: service._id,
                wouldRecommend: true
            });
            
            const percentage = (recommended.length / all.length) * 100;
            expect(percentage).toBeGreaterThanOrEqual(0);
            expect(percentage).toBeLessThanOrEqual(100);
        });
    });

    describe('Review Validation', () => {
        test('Should trim comment whitespace', async () => {
            const review = await Review.create({
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                booking: booking._id,
                rating: 4,
                comment: '  Great service!  '
            });

            expect(review.comment).toBe('Great service!');
        });

        test('Should enforce comment max length', async () => {
            const longComment = 'a'.repeat(2000);
            const review = new Review({
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                booking: booking._id,
                rating: 5,
                comment: longComment
            });

            let error;
            try {
                await review.validate();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
        });
    });
});
