module.exports = {
  testEnvironment: "jsdom",
  transform: { "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.ts"]
};
