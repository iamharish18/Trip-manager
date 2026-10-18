// Jest config for security rules tests (Node, against the Firestore emulator).
// Run with `npm run test:rules`, not plain `jest`.

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firebase/tests/**/*.test.js'],
  transform: {},
  testTimeout: 20000,
};
