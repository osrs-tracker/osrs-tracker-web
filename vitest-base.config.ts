import { defineConfig } from 'vitest/config';

/**
 * Loaded by `ng test` (`runnerConfig` in angular.json). Vitest 5 caches transformed modules in
 * `node_modules/.vitest-cache`, keyed by the spec file on disk, but Angular's unit-test builder hands it the spec bundled
 * with the code it tests: after a change to that code alone, the next run tested the old bundle and could pass. Delete
 * this file and `runnerConfig` once `@angular/build` turns the cache off itself (angular/angular-cli#34311, merged after
 * 22.2.2).
 */
export default defineConfig({
  test: { fsModuleCache: false },
});
