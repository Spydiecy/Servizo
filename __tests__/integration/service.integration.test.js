const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const User = require('../../src/models/User');
const Service = require('../../src/models/Service');
const serviceRoutes = require('../../src/routes/services');

// Setup test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false
}));
app.use('/services', serviceRoutes);

jest.setTimeout(15000);

describe('Service Management Integration Tests', () => {
    let provider;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect('mongodb://127.0.0.1:27017/servizo_test');
        }
    });

    beforeEach(async () => {
        // Clean up
        await User.deleteMany({ email: /service.*@integration\.com/ });
        await Service.deleteMany({ title: /Integration.*Test/ });

        // Create test provider
        provider = await User.create({
            firstName: 'Service',
            lastName: 'Provider',
            email: 'service.provider@integration.com',
            phone: '+919876543230',
            password: 'ProviderPass123',
            userType: 'provider',
            emailVerified: true,
            providerInfo: {
                isVerified: true,
                rating: 4.5
            }
        });
    });

    afterAll(async () => {
        await User.deleteMany({ email: /service.*@integration\.com/ });
        await Service.deleteMany({ title: /Integration.*Test/ });
        await mongoose.connection.close();
    });

    describe('Service Creation', () => {
        test('Should create a service with all required fields', async () => {
            const serviceData = {
                title: 'Integration Test Cleaning',
                description: 'Professional deep cleaning service for homes',
                category: 'cleaning',
                subcategory: 'Deep Cleaning',
                price: 1000,
                priceType: 'fixed',
                duration: 180,
                provider: provider._id,
                serviceArea: {
                    city: 'Mumbai',
                    areas: ['Andheri', 'Bandra', 'Juhu'],
                    radius: 15
                },
                features: [
                    'Eco-friendly products',
                    'Trained professionals',
                    'Satisfaction guaranteed'
                ],
                tags: ['cleaning', 'deep-clean', 'home-service']
            };

            const service = await Service.create(serviceData);

            expect(service._id).toBeDefined();
            expect(service.title).toBe(serviceData.title);
            expect(service.price).toBe(serviceData.price);
            expect(service.category).toBe(serviceData.category);
            expect(service.provider.toString()).toBe(provider._id.toString());
            expect(service.isActive).toBe(true);
            expect(service.rating.average).toBe(0);
            expect(service.rating.count).toBe(0);
            expect(service.bookingCount).toBe(0);
        });

        test('Should create services in different categories', async () => {
            const categories = ['cleaning', 'ac', 'plumbing', 'electrical', 'painting'];
            const services = [];

            for (const category of categories) {
                const service = await Service.create({
                    title: `Integration Test ${category.charAt(0).toUpperCase() + category.slice(1)}`,
                    description: `Test ${category} service`,
                    category: category,
                    price: 500,
                    duration: 60,
                    provider: provider._id,
                    serviceArea: {
                        city: 'Mumbai'
                    }
                });
                services.push(service);
            }

            expect(services.length).toBe(5);
            categories.forEach((cat, index) => {
                expect(services[index].category).toBe(cat);
            });
        });

        test('Should validate price is non-negative', async () => {
            const invalidService = new Service({
                title: 'Invalid Price Service',
                description: 'Test',
                category: 'cleaning',
                price: -100,
                duration: 60,
                provider: provider._id,
                serviceArea: { city: 'Mumbai' }
            });

            let error;
            try {
                await invalidService.validate();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.price).toBeDefined();
        });

        test('Should validate minimum duration', async () => {
            const invalidService = new Service({
                title: 'Invalid Duration Service',
                description: 'Test',
                category: 'cleaning',
                price: 500,
                duration: 10, // Below minimum of 15
                provider: provider._id,
                serviceArea: { city: 'Mumbai' }
            });

            let error;
            try {
                await invalidService.validate();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.duration).toBeDefined();
        });
    });

    describe('Service Queries and Filtering', () => {
        beforeEach(async () => {
            // Create multiple services for testing
            await Service.create([
                {
                    title: 'Integration Test Premium Cleaning',
                    description: 'Premium cleaning service',
                    category: 'cleaning',
                    price: 1500,
                    duration: 180,
                    provider: provider._id,
                    serviceArea: { city: 'Mumbai' },
                    rating: { average: 4.8, count: 50 },
                    isActive: true
                },
                {
                    title: 'Integration Test AC Repair',
                    description: 'AC repair and maintenance',
                    category: 'ac',
                    price: 800,
                    duration: 120,
                    provider: provider._id,
                    serviceArea: { city: 'Delhi' },
                    rating: { average: 4.5, count: 30 },
                    isActive: true
                },
                {
                    title: 'Integration Test Basic Cleaning',
                    description: 'Basic cleaning service',
                    category: 'cleaning',
                    price: 500,
                    duration: 90,
                    provider: provider._id,
                    serviceArea: { city: 'Mumbai' },
                    rating: { average: 4.2, count: 20 },
                    isActive: false
                }
            ]);
        });

        test('Should filter services by category', async () => {
            const cleaningServices = await Service.find({ category: 'cleaning' });
            expect(cleaningServices.length).toBe(2);
        });

        test('Should filter active services only', async () => {
            const activeServices = await Service.find({ isActive: true });
            expect(activeServices.length).toBe(2);
        });

        test('Should filter services by city', async () => {
            const mumbaiServices = await Service.find({ 'serviceArea.city': 'Mumbai' });
            expect(mumbaiServices.length).toBe(2);
        });

        test('Should filter services by price range', async () => {
            const affordableServices = await Service.find({
                price: { $lte: 1000 }
            });
            expect(affordableServices.length).toBeGreaterThanOrEqual(2);
        });

        test('Should sort services by rating', async () => {
            const sortedServices = await Service.find({ isActive: true })
                .sort({ 'rating.average': -1 });
            
            expect(sortedServices[0].rating.average).toBeGreaterThanOrEqual(
                sortedServices[1].rating.average
            );
        });

        test('Should search services by title', async () => {
            const services = await Service.find({
                title: { $regex: 'Cleaning', $options: 'i' }
            });
            expect(services.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Service Updates', () => {
        let service;

        beforeEach(async () => {
            service = await Service.create({
                title: 'Integration Test Update Service',
                description: 'Service to be updated',
                category: 'cleaning',
                price: 600,
                duration: 120,
                provider: provider._id,
                serviceArea: { city: 'Mumbai' }
            });
        });

        test('Should update service price', async () => {
            service.price = 750;
            await service.save();

            const updated = await Service.findById(service._id);
            expect(updated.price).toBe(750);
        });

        test('Should update service rating', async () => {
            service.rating.average = 4.7;
            service.rating.count = 15;
            await service.save();

            const updated = await Service.findById(service._id);
            expect(updated.rating.average).toBe(4.7);
            expect(updated.rating.count).toBe(15);
        });

        test('Should increment booking count', async () => {
            service.bookingCount += 1;
            await service.save();

            const updated = await Service.findById(service._id);
            expect(updated.bookingCount).toBe(1);
        });

        test('Should toggle service active status', async () => {
            service.isActive = false;
            await service.save();

            const updated = await Service.findById(service._id);
            expect(updated.isActive).toBe(false);
        });
    });

    describe('Service Provider Relationship', () => {
        test('Should populate provider details', async () => {
            const service = await Service.create({
                title: 'Integration Test Provider Service',
                description: 'Test service with provider',
                category: 'cleaning',
                price: 700,
                duration: 90,
                provider: provider._id,
                serviceArea: { city: 'Mumbai' }
            });

            const populated = await Service.findById(service._id)
                .populate('provider', 'firstName lastName email phone providerInfo');

            expect(populated.provider).toBeDefined();
            expect(populated.provider.firstName).toBe(provider.firstName);
            expect(populated.provider.email).toBe(provider.email);
            expect(populated.provider.providerInfo).toBeDefined();
        });

        test('Should link multiple services to one provider', async () => {
            await Service.create([
                {
                    title: 'Integration Test Service 1',
                    description: 'First service',
                    category: 'cleaning',
                    price: 500,
                    duration: 60,
                    provider: provider._id,
                    serviceArea: { city: 'Mumbai' }
                },
                {
                    title: 'Integration Test Service 2',
                    description: 'Second service',
                    category: 'ac',
                    price: 800,
                    duration: 90,
                    provider: provider._id,
                    serviceArea: { city: 'Mumbai' }
                }
            ]);

            const providerServices = await Service.find({ provider: provider._id });
            expect(providerServices.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Service Performance', () => {
        test('Should efficiently query services with indexes', async () => {
            // Create many services for performance testing
            const services = [];
            for (let i = 0; i < 50; i++) {
                services.push({
                    title: `Integration Test Batch Service ${i}`,
                    description: 'Performance test service',
                    category: i % 2 === 0 ? 'cleaning' : 'plumbing',
                    price: 500 + (i * 10),
                    duration: 60,
                    provider: provider._id,
                    serviceArea: { city: 'Mumbai' }
                });
            }
            await Service.insertMany(services);

            const start = Date.now();
            const result = await Service.find({ category: 'cleaning', isActive: true });
            const duration = Date.now() - start;

            expect(result.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(100); // Should be fast with indexes
        });
    });
});
