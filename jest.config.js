module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  globalSetup: 'jest-preset-angular/global-setup',
  transformIgnorePatterns: ['node_modules/(?!(@osrs-tracker|.*\\.mjs$))'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
