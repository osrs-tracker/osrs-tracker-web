module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  globalSetup: 'jest-preset-angular/global-setup',
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: ['node_modules/(?!(@osrs-tracker|.*\\.mjs$))'],
};
