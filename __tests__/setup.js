// Test setup file
// This runs before all tests

// Suppress console logs during tests (optional)
// global.console = {
//     ...console,
//     log: jest.fn(),
//     debug: jest.fn(),
//     info: jest.fn(),
//     warn: jest.fn(),
// };

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/servizo_test';
process.env.SESSION_SECRET = 'test-secret-key';

// Increase test timeout globally
jest.setTimeout(15000);

console.log('🧪 Test environment initialized');
