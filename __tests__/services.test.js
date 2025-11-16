const mongoose = require('mongoose');
const Service = require('../src/models/Service');

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
