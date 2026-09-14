module.exports = {
  testEnvironment: 'jsdom',

  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true,
      },
    ],
  },

  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setupTests.ts',
  ],
};
