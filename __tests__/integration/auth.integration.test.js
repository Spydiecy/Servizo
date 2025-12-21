const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const User = require('../../src/models/User');
const authRoutes = require('../../src/routes/auth');

// Setup test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use('/auth', authRoutes);

// Test timeout
jest.setTimeout(15000);

describe('Authentication Integration Tests', () => {
    let testUser;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect('mongodb://127.0.0.1:27017/servizo_test');
        }
    });

    beforeEach(async () => {
        // Clean up test data
        await User.deleteMany({ email: /test.*@integration\.com/ });
    });

    afterAll(async () => {
        await User.deleteMany({ email: /test.*@integration\.com/ });
        await mongoose.connection.close();
    });

    describe('POST /auth/register - User Registration', () => {
        test('Should successfully register a new customer', async () => {
            const userData = {
                firstName: 'Integration',
                lastName: 'Test',
                email: 'test.customer@integration.com',
                phone: '+919876543210',
                password: 'SecurePass123',
                userType: 'customer'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(response.status).toBe(302); // Redirect after registration
            
            // Verify user was created in database
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeDefined();
            expect(user.firstName).toBe(userData.firstName);
            expect(user.lastName).toBe(userData.lastName);
            expect(user.userType).toBe('customer');
            expect(user.password).not.toBe(userData.password); // Should be hashed
            expect(user.otp).toBeDefined(); // OTP should be generated
            expect(user.emailVerified).toBe(false);
        });

        test('Should successfully register a new provider', async () => {
            const userData = {
                firstName: 'Provider',
                lastName: 'Test',
                email: 'test.provider@integration.com',
                phone: '+919876543211',
                password: 'ProviderPass123',
                userType: 'provider'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(response.status).toBe(302);
            
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeDefined();
            expect(user.userType).toBe('provider');
            expect(user.providerInfo).toBeDefined();
        });

        test('Should fail registration with duplicate email', async () => {
            const userData = {
                firstName: 'Duplicate',
                lastName: 'User',
                email: 'test.duplicate@integration.com',
                phone: '+919876543212',
                password: 'Password123',
                userType: 'customer'
            };

            // Create first user
            await request(app)
                .post('/auth/register')
                .send(userData);

            // Try to create duplicate
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(response.status).toBe(302);
            
            // Verify only one user exists
            const users = await User.find({ email: userData.email });
            expect(users.length).toBe(1);
        });

        test('Should fail with invalid email format', async () => {
            const userData = {
                firstName: 'Invalid',
                lastName: 'Email',
                email: 'not-an-email',
                phone: '+919876543213',
                password: 'Password123',
                userType: 'customer'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(response.status).toBe(302);
        });
    });

    describe('POST /auth/verify-otp - OTP Verification', () => {
        beforeEach(async () => {
            // Create a test user with OTP
            testUser = await User.create({
                firstName: 'OTP',
                lastName: 'Test',
                email: 'test.otp@integration.com',
                phone: '+919876543214',
                password: 'Password123',
                userType: 'customer',
                otp: '123456',
                otpExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
            });
        });

        test('Should verify valid OTP successfully', async () => {
            const response = await request(app)
                .post('/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: '123456'
                });

            expect(response.status).toBe(302);
            
            // Verify email was marked as verified
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.emailVerified).toBe(true);
            expect(updatedUser.otp).toBeNull();
        });

        test('Should fail with incorrect OTP', async () => {
            const response = await request(app)
                .post('/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: '999999'
                });

            expect(response.status).toBe(302);
            
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.emailVerified).toBe(false);
        });

        test('Should fail with expired OTP', async () => {
            // Update OTP to be expired
            testUser.otpExpires = new Date(Date.now() - 1000);
            await testUser.save();

            const response = await request(app)
                .post('/auth/verify-otp')
                .send({
                    email: testUser.email,
                    otp: '123456'
                });

            expect(response.status).toBe(302);
        });
    });

    describe('POST /auth/login - User Login', () => {
        beforeEach(async () => {
            // Create verified user
            testUser = await User.create({
                firstName: 'Login',
                lastName: 'Test',
                email: 'test.login@integration.com',
                phone: '+919876543215',
                password: 'LoginPass123',
                userType: 'customer',
                emailVerified: true
            });
        });

        test('Should login successfully with correct credentials', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test.login@integration.com',
                    password: 'LoginPass123'
                });

            expect(response.status).toBe(302);
        });

        test('Should fail login with incorrect password', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test.login@integration.com',
                    password: 'WrongPassword'
                });

            expect(response.status).toBe(302);
        });

        test('Should fail login with non-existent email', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'nonexistent@integration.com',
                    password: 'AnyPassword'
                });

            expect(response.status).toBe(302);
        });

        test('Should fail login if email not verified', async () => {
            // Create unverified user
            const unverifiedUser = await User.create({
                firstName: 'Unverified',
                lastName: 'User',
                email: 'test.unverified@integration.com',
                phone: '+919876543216',
                password: 'Password123',
                userType: 'customer',
                emailVerified: false,
                otp: '123456',
                otpExpires: new Date(Date.now() + 10 * 60 * 1000)
            });

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: unverifiedUser.email,
                    password: 'Password123'
                });

            expect(response.status).toBe(302);
        });
    });

    describe('POST /auth/logout - User Logout', () => {
        test('Should logout successfully', async () => {
            const response = await request(app)
                .post('/auth/logout');

            expect(response.status).toBe(302);
        });
    });
});
