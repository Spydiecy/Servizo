const mongoose = require('mongoose');
const Service = require('../src/models/Service');
const User = require('../src/models/User');

// Increase timeout for Jest
jest.setTimeout(10000);

// Connect to MongoDB before tests
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/servizo');
  }
});

// Close MongoDB connection after tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Service Model Tests
describe('Service Model Tests', () => {
  test('Service model should be defined', () => {
    expect(Service).toBeDefined();
    expect(Service.modelName).toBe('Service');
  });

  test('Service should require title and price', async () => {
    const invalidService = new Service({});
    
    let error;
    try {
      await invalidService.validate();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors).toHaveProperty('title');
    expect(error.errors).toHaveProperty('price');
  });

  test('Service should create with valid data', async () => {
    const validService = new Service({
      title: 'Test Service',
      description: 'Test Description',
      category: 'cleaning',
      price: 100,
      duration: 60,
      provider: new mongoose.Types.ObjectId(),
      serviceArea: {
        city: 'Mumbai'
      }
    });

    const error = validService.validateSync();
    expect(error).toBeUndefined();
  });
});

// User Account Creation Tests
describe('User Account Creation Tests', () => {
  // Clean up test users before each test
  beforeEach(async () => {
    await User.deleteMany({ email: /test.*@example\.com/ });
  });

  test('User model should be defined', () => {
    expect(User).toBeDefined();
    expect(User.modelName).toBe('User');
  });

  test('Should create user with valid data', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.user@example.com',
      phone: '+1234567890',
      password: 'password123',
      userType: 'customer'
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.firstName).toBe(userData.firstName);
    expect(savedUser.lastName).toBe(userData.lastName);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.phone).toBe(userData.phone);
    expect(savedUser.userType).toBe(userData.userType);
    expect(savedUser.isActive).toBe(true);
    expect(savedUser.password).not.toBe(userData.password); // Password should be hashed
  });

  test('Should hash password before saving', async () => {
    const plainPassword = 'mySecurePassword123';
    const user = new User({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'test.password@example.com',
      phone: '+1234567891',
      password: plainPassword,
      userType: 'customer'
    });

    await user.save();
    
    expect(user.password).not.toBe(plainPassword);
    expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
  });

  test('Should validate password comparison', async () => {
    const plainPassword = 'testPassword123';
    const user = new User({
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'test.compare@example.com',
      phone: '+1234567892',
      password: plainPassword,
      userType: 'customer'
    });

    await user.save();

    const isMatch = await user.comparePassword(plainPassword);
    const isNotMatch = await user.comparePassword('wrongPassword');

    expect(isMatch).toBe(true);
    expect(isNotMatch).toBe(false);
  });

  test('Should require firstName', async () => {
    const user = new User({
      lastName: 'Doe',
      email: 'test.nofirstname@example.com',
      phone: '+1234567893',
      password: 'password123'
    });

    let error;
    try {
      await user.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors).toHaveProperty('firstName');
  });

  test('Should require lastName', async () => {
    const user = new User({
      firstName: 'John',
      email: 'test.nolastname@example.com',
      phone: '+1234567894',
      password: 'password123'
    });

    let error;
    try {
      await user.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors).toHaveProperty('lastName');
  });

  test('Should require valid email', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid-email',
      phone: '+1234567895',
      password: 'password123'
    });

    let error;
    try {
      await user.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors).toHaveProperty('email');
  });

  test('Should require phone number', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.nophone@example.com',
      password: 'password123'
    });

    let error;
    try {
      await user.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors).toHaveProperty('phone');
  });

  test('Should require password', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.nopassword@example.com',
      phone: '+1234567896'
    });

    let error;
    try {
      await user.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors).toHaveProperty('password');
  });

  test('Should enforce minimum password length', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.shortpass@example.com',
      phone: '+1234567897',
      password: '12345' // Less than 6 characters
    });

    let error;
    try {
      await user.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors).toHaveProperty('password');
  });

  test('Should not allow duplicate email', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.duplicate@example.com',
      phone: '+1234567898',
      password: 'password123'
    };

    const user1 = new User(userData);
    await user1.save();

    const user2 = new User(userData);
    
    let error;
    try {
      await user2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  test('Should default userType to customer', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.defaulttype@example.com',
      phone: '+1234567899',
      password: 'password123'
    });

    await user.save();
    expect(user.userType).toBe('customer');
  });

  test('Should create provider user', async () => {
    const user = new User({
      firstName: 'Provider',
      lastName: 'User',
      email: 'test.provider@example.com',
      phone: '+1234567800',
      password: 'password123',
      userType: 'provider'
    });

    await user.save();
    expect(user.userType).toBe('provider');
    expect(user.providerInfo).toBeDefined();
    expect(user.providerInfo.rating).toBe(0);
    expect(user.providerInfo.totalBookings).toBe(0);
    expect(user.providerInfo.isVerified).toBe(false);
  });

  test('Should convert email to lowercase', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'TEST.LOWERCASE@EXAMPLE.COM',
      phone: '+1234567801',
      password: 'password123'
    });

    await user.save();
    expect(user.email).toBe('test.lowercase@example.com');
  });

  test('Should trim whitespace from fields', async () => {
    const user = new User({
      firstName: '  John  ',
      lastName: '  Doe  ',
      email: '  test.trim@example.com  ',
      phone: '  +1234567802  ',
      password: 'password123'
    });

    await user.save();
    expect(user.firstName).toBe('John');
    expect(user.lastName).toBe('Doe');
    expect(user.email).toBe('test.trim@example.com');
    expect(user.phone).toBe('+1234567802');
  });

  test('Should have timestamps', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.timestamps@example.com',
      phone: '+1234567803',
      password: 'password123'
    });

    await user.save();
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  test('Should have fullName virtual property', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.fullname@example.com',
      phone: '+1234567804',
      password: 'password123'
    });

    await user.save();
    expect(user.fullName).toBe('John Doe');
  });

  test('Should allow optional address fields', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.address@example.com',
      phone: '+1234567805',
      password: 'password123',
      address: {
        street: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      }
    });

    await user.save();
    expect(user.address.street).toBe('123 Main St');
    expect(user.address.city).toBe('Mumbai');
    expect(user.address.state).toBe('Maharashtra');
  });

  test('Should not update password hash if password not modified', async () => {
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test.nohashupdate@example.com',
      phone: '+1234567806',
      password: 'password123'
    });

    await user.save();
    const originalPasswordHash = user.password;

    user.firstName = 'Jane';
    await user.save();

    expect(user.password).toBe(originalPasswordHash);
  });
});
