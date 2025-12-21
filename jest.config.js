module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/app.js',
        '!src/config/**'
    ],
    testMatch: [
        '**/__tests__/**/*.test.js'
    ],
    verbose: true,
    testTimeout: 15000,
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js']
};
