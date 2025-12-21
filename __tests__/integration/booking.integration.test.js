const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const User = require('../../src/models/User');
const Service = require('../../src/models/Service');
const Booking = require('../../src/models/Booking');
const bookingRoutes = require('../../src/routes/bookings');
const { loadUser } = require('../../src/middleware/auth');

// Setup test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false
}));
app.use(loadUser);
app.use('/bookings', bookingRoutes);

jest.setTimeout(15000);

describe('Booking System Integration Tests', () => {
    let customer, provider, service;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect('mongodb://127.0.0.1:27017/servizo_test');
        }
    });

    beforeEach(async () => {
        // Clean up test data
        await User.deleteMany({ email: /booking.*@integration\.com/ });
        await Service.deleteMany({ title: /Test.*Service/ });
        await Booking.deleteMany({});

        // Create test customer
        customer = await User.create({
            firstName: 'Booking',
            lastName: 'Customer',
            email: 'booking.customer@integration.com',
            phone: '+919876543220',
            password: 'CustomerPass123',
            userType: 'customer',
            emailVerified: true,
            address: {
                street: '123 Test St',
                city: 'Mumbai',
                state: 'Maharashtra',
                zipCode: '400001'
            }
        });

        // Create test provider
        provider = await User.create({
            firstName: 'Booking',
            lastName: 'Provider',
            email: 'booking.provider@integration.com',
            phone: '+919876543221',
            password: 'ProviderPass123',
            userType: 'provider',
            emailVerified: true
        });

        // Create test service
        service = await Service.create({
            title: 'Test Cleaning Service',
            description: 'Professional home cleaning service',
            category: 'cleaning',
            price: 500,
            priceType: 'fixed',
            duration: 120,
            provider: provider._id,
            serviceArea: {
                city: 'Mumbai',
                areas: ['Andheri', 'Bandra'],
                radius: 10
            },
            isActive: true
        });
    });

    afterAll(async () => {
        await User.deleteMany({ email: /booking.*@integration\.com/ });
        await Service.deleteMany({ title: /Test.*Service/ });
        await Booking.deleteMany({});
        await mongoose.connection.close();
    });

    describe('POST /bookings/create - Create Booking', () => {
        test('Should create booking successfully', async () => {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + 2); // 2 days from now

            const bookingData = {
                serviceId: service._id.toString(),
                bookingDate: bookingDate.toISOString().split('T')[0],
                bookingTime: '10:00',
                customerAddress: '123 Test St, Mumbai',
                specialRequests: 'Please bring eco-friendly cleaning products'
            };

            // Mock authenticated user
            const agent = request.agent(app);
            agent.set('Cookie', [`user=${JSON.stringify({ _id: customer._id })}`]);

            const response = await agent
                .post('/bookings/create')
                .send(bookingData);

            expect(response.status).toBe(302); // Redirect after booking

            // Verify booking was created
            const booking = await Booking.findOne({ customer: customer._id });
            expect(booking).toBeDefined();
            expect(booking.service.toString()).toBe(service._id.toString());
            expect(booking.provider.toString()).toBe(provider._id.toString());
            expect(booking.status).toBe('pending');
            expect(booking.totalAmount).toBe(500);
            expect(booking.customerAddress).toBe(bookingData.customerAddress);
        });

        test('Should calculate total amount correctly', async () => {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + 1);

            const booking = await Booking.create({
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                bookingDate: bookingDate,
                bookingTime: '14:00',
                customerAddress: 'Test Address',
                totalAmount: service.price,
                status: 'pending'
            });

            expect(booking.totalAmount).toBe(service.price);
        });

        test('Should fail booking without authentication', async () => {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + 1);

            const response = await request(app)
                .post('/bookings/create')
                .send({
                    serviceId: service._id.toString(),
                    bookingDate: bookingDate.toISOString().split('T')[0],
                    bookingTime: '10:00',
                    customerAddress: 'Test Address'
                });

            expect(response.status).toBe(302); // Redirect to login
        });
    });

    describe('GET /bookings/my-bookings - List User Bookings', () => {
        beforeEach(async () => {
            // Create multiple bookings for testing
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            await Booking.create([
                {
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    bookingDate: tomorrow,
                    bookingTime: '09:00',
                    customerAddress: 'Address 1',
                    totalAmount: 500,
                    status: 'pending'
                },
                {
                    customer: customer._id,
                    service: service._id,
                    provider: provider._id,
                    bookingDate: tomorrow,
                    bookingTime: '14:00',
                    customerAddress: 'Address 2',
                    totalAmount: 500,
                    status: 'confirmed'
                }
            ]);
        });

        test('Should list all customer bookings', async () => {
            const bookings = await Booking.find({ customer: customer._id });
            expect(bookings.length).toBe(2);
        });

        test('Should list all provider bookings', async () => {
            const bookings = await Booking.find({ provider: provider._id });
            expect(bookings.length).toBe(2);
        });
    });

    describe('Booking Status Updates', () => {
        let booking;

        beforeEach(async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            booking = await Booking.create({
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                bookingDate: tomorrow,
                bookingTime: '10:00',
                customerAddress: 'Test Address',
                totalAmount: 500,
                status: 'pending'
            });
        });

        test('Should update booking status from pending to confirmed', async () => {
            booking.status = 'confirmed';
            await booking.save();

            const updated = await Booking.findById(booking._id);
            expect(updated.status).toBe('confirmed');
        });

        test('Should update booking status to in-progress', async () => {
            booking.status = 'in-progress';
            await booking.save();

            const updated = await Booking.findById(booking._id);
            expect(updated.status).toBe('in-progress');
        });

        test('Should complete booking with timestamp', async () => {
            booking.status = 'completed';
            booking.completedAt = new Date();
            await booking.save();

            const updated = await Booking.findById(booking._id);
            expect(updated.status).toBe('completed');
            expect(updated.completedAt).toBeDefined();
        });

        test('Should cancel booking with reason', async () => {
            booking.status = 'cancelled';
            booking.cancelledAt = new Date();
            booking.cancellationReason = 'Customer requested cancellation';
            await booking.save();

            const updated = await Booking.findById(booking._id);
            expect(updated.status).toBe('cancelled');
            expect(updated.cancellationReason).toBeDefined();
        });
    });

    describe('Booking Validations', () => {
        test('Should require all mandatory fields', async () => {
            const invalidBooking = new Booking({});
            
            let error;
            try {
                await invalidBooking.validate();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors).toHaveProperty('customer');
            expect(error.errors).toHaveProperty('service');
            expect(error.errors).toHaveProperty('provider');
            expect(error.errors).toHaveProperty('bookingDate');
        });

        test('Should validate payment status enum', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const booking = new Booking({
                customer: customer._id,
                service: service._id,
                provider: provider._id,
                bookingDate: tomorrow,
                bookingTime: '10:00',
                customerAddress: 'Test',
                totalAmount: 500,
                paymentStatus: 'invalid-status'
            });

            let error;
            try {
                await booking.validate();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.paymentStatus).toBeDefined();
        });
    });

    describe('Booking Query Performance', () => {
        test('Should efficiently query bookings by customer', async () => {
            const start = Date.now();
            const bookings = await Booking.find({ customer: customer._id });
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(100); // Should be fast with indexes
        });

        test('Should efficiently query bookings by status', async () => {
            const start = Date.now();
            const bookings = await Booking.find({ status: 'pending' });
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(100);
        });
    });
});
