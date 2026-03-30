module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/integration/**/*.ts'],
    testPathIgnorePatterns: ['/node_modules/', 'helpers.ts'],
    verbose: true,
    testTimeout: 90000,
    moduleNameMapper: {
        '^(\\.\\.?/.*)\\.js$': '$1',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(chrome-launcher)/)',
    ],
    transform: {
        '^.+\\.[jt]sx?$': ['ts-jest', { tsconfig: { allowJs: true } }],
    },
};
