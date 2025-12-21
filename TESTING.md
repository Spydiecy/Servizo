# 🧪 Servizo - Integration Testing Documentation

## Overview

This document provides comprehensive information about the integration testing suite for the Servizo platform. These tests are designed to validate the complete flow of features across multiple components of the application.

## Test Structure

```
__tests__/
├── services.test.js                    # Unit tests for models
├── integration/
│   ├── auth.integration.test.js        # Authentication flow tests
│   ├── booking.integration.test.js     # Booking system tests
│   ├── service.integration.test.js     # Service management tests
│   └── review.integration.test.js      # Review system tests
└── setup.js                            # Test configuration
```

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Integration Test Suites
```bash
# Authentication tests
npm run test:integration:auth

# Booking tests
npm run test:integration:booking

# Service tests
npm run test:integration:service

# Review tests
npm run test:integration:review
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## 📋 Test Coverage

### 1. Authentication Integration Tests (`auth.integration.test.js`)

**Covers:**
- ✅ User registration (customers and providers)
- ✅ Email verification with OTP
- ✅ User login with credentials
- ✅ Password hashing validation
- ✅ Duplicate email prevention
- ✅ Input validation
- ✅ Session management
- ✅ Logout functionality

**Test Cases:** 11 tests
- User registration with valid data
- Provider account creation
- Duplicate email handling
- Invalid email format validation
- OTP verification (valid/invalid/expired)
- Login with correct/incorrect credentials
- Unverified email login prevention

### 2. Booking Integration Tests (`booking.integration.test.js`)

**Covers:**
- ✅ Booking creation workflow
- ✅ Authentication requirements
- ✅ Price calculation
- ✅ Booking status management
- ✅ Customer and provider booking lists
- ✅ Status transitions (pending → confirmed → in-progress → completed)
- ✅ Booking cancellation
- ✅ Payment status tracking
- ✅ Query performance with indexes

**Test Cases:** 15+ tests
- Create booking with all fields
- Authentication-protected routes
- Total amount calculation
- List customer/provider bookings
- Status updates (confirmed, in-progress, completed, cancelled)
- Field validation
- Payment status enum validation
- Efficient database queries

### 3. Service Management Tests (`service.integration.test.js`)

**Covers:**
- ✅ Service creation with all fields
- ✅ Multiple service categories
- ✅ Price and duration validation
- ✅ Service filtering (category, city, price range)
- ✅ Service search functionality
- ✅ Service updates (price, rating, status)
- ✅ Provider-service relationship
- ✅ Rating and review aggregation
- ✅ Query performance optimization

**Test Cases:** 20+ tests
- Create service with required fields
- Create services in 10+ categories
- Price validation (non-negative)
- Duration validation (minimum 15 minutes)
- Filter by category, city, price range
- Sort by rating
- Search by title
- Update price, rating, booking count
- Toggle active status
- Provider relationship and population
- Performance testing with 50+ services

### 4. Review System Tests (`review.integration.test.js`)

**Covers:**
- ✅ Review creation for completed bookings
- ✅ Rating validation (1-5 scale)
- ✅ Service rating calculation
- ✅ Provider rating updates
- ✅ Review queries and filters
- ✅ Review statistics and aggregation
- ✅ Rating distribution analysis
- ✅ Recommendation tracking
- ✅ Comment validation

**Test Cases:** 17+ tests
- Create review with all fields
- Multiple rating levels (1-5)
- Rating range validation
- Mandatory field validation
- Service average rating calculation
- Provider rating updates
- Query reviews by service/provider
- Filter by rating and recommendation
- Sort reviews
- Populate related data
- Calculate rating distribution
- Average rating aggregation
- Recommendation percentage
- Comment trimming and length validation

## 🎯 Key Features Tested

### Complete User Journey
1. **Registration** → OTP Verification → Login → Browse Services → Book Service → Complete Service → Leave Review

### Data Integrity
- ✅ Password hashing
- ✅ Email uniqueness
- ✅ Foreign key relationships
- ✅ Enum validation
- ✅ Data type validation

### Business Logic
- ✅ Booking workflow states
- ✅ Rating calculations
- ✅ Price calculations
- ✅ Service availability
- ✅ Provider verification

### Performance
- ✅ Database indexing effectiveness
- ✅ Query optimization
- ✅ Batch operations
- ✅ Population efficiency

## 📊 Test Statistics

| Test Suite | Test Count | Coverage Area |
|------------|-----------|---------------|
| Authentication | 11 | User management, sessions |
| Booking System | 15+ | Booking lifecycle, payments |
| Service Management | 20+ | CRUD, filtering, relationships |
| Review System | 17+ | Ratings, aggregations, stats |
| **Total** | **63+** | **Full application flow** |

## 🔧 Prerequisites

Before running tests, ensure:

1. **MongoDB is running** on `localhost:27017`
   ```bash
   mongod
   ```

2. **Test database** (`servizo_test`) will be created automatically

3. **Dependencies installed**
   ```bash
   npm install
   ```

## 📝 Test Database

- **Database Name:** `servizo_test`
- **Auto-cleanup:** Tests clean up their own data using `beforeEach` and `afterAll` hooks
- **Isolation:** Each test suite uses unique email patterns to prevent conflicts

## 🎓 For Viva/Presentation

### Demonstration Flow

1. **Show Test Structure**
   ```bash
   ls -la __tests__/integration/
   ```

2. **Run All Integration Tests**
   ```bash
   npm run test:integration
   ```

3. **Show Coverage Report**
   ```bash
   npm run test:coverage
   ```

4. **Demonstrate Specific Feature**
   ```bash
   # Show authentication flow
   npm run test:integration:auth
   
   # Show booking workflow
   npm run test:integration:booking
   ```

### Key Points to Highlight

✨ **Comprehensive Coverage:**
- 63+ integration tests covering end-to-end workflows
- Tests validate real user scenarios
- Database operations tested with actual MongoDB

✨ **Real-World Scenarios:**
- Complete user journey from registration to review
- Multi-role testing (customer, provider, admin)
- Error handling and validation

✨ **Best Practices:**
- Test isolation with cleanup hooks
- Separate test database
- Performance benchmarking
- Mock data generation

✨ **Business Logic Validation:**
- Booking status transitions
- Rating calculations
- Payment tracking
- Service availability

## 📈 Sample Test Output

```bash
PASS  __tests__/integration/auth.integration.test.js
  Authentication Integration Tests
    POST /auth/register - User Registration
      ✓ Should successfully register a new customer (234ms)
      ✓ Should successfully register a new provider (187ms)
      ✓ Should fail registration with duplicate email (156ms)
    POST /auth/verify-otp - OTP Verification
      ✓ Should verify valid OTP successfully (89ms)
      ✓ Should fail with incorrect OTP (67ms)
    POST /auth/login - User Login
      ✓ Should login successfully with correct credentials (123ms)
      ✓ Should fail login with incorrect password (98ms)

Test Suites: 4 passed, 4 total
Tests:       63 passed, 63 total
Time:        12.456s
```

## 🛠️ Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
mongod

# Or use Docker
docker run -d -p 27017:27017 mongo
```

### Port Already in Use
If tests fail due to port conflicts, ensure no development server is running:
```bash
killall node
```

### Clear Test Database
```bash
# Connect to MongoDB
mongosh

# Switch to test database
use servizo_test

# Drop database
db.dropDatabase()
```

## 🎯 Next Steps

To extend testing:

1. **Add API endpoint tests** with full request/response validation
2. **Add Socket.IO tests** for real-time chat
3. **Add Redis caching tests** for performance validation
4. **Add email service tests** with mock SMTP
5. **Add file upload tests** for service images

## 📚 References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Testing Guide](https://mongoosejs.com/docs/jest.html)

---

**Last Updated:** December 22, 2025  
**Version:** 1.0.0  
**Author:** Spydiecy
