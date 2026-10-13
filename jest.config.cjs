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

  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/tests/styleMock.cjs',
    '\\.(svg|png|jpg|jpeg|webp)$': '<rootDir>/src/tests/fileMock.cjs',
  },

  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setupTests.ts',
  ],
};
