// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import { readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';

const FEATURES = readdirSync('src/app/features');
// Home is a dashboard over the trackers: it shows their search boxes, rows and stored players and items
const ALLOWED_FEATURE_IMPORTS = { home: ['trackers'] };

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          style: 'camelCase',
          prefix: '',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          style: 'kebab-case',
          prefix: '',
        },
      ],
      'no-console': 'error',
    },
  },
  {
    // Layers: features build on common and core, never the other way round, and don't reach into each other. Resolved
    // paths, so relative imports count too.
    files: ['src/**/*.ts'],
    plugins: { 'import-x': importX },
    settings: { 'import-x/resolver-next': [createTypeScriptImportResolver({ project: 'tsconfig.json' })] },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: ['./src/app/common', './src/app/core'],
              from: './src/app/features',
              message: 'Shared code must not depend on a feature.',
            },
            {
              target: ['./src/app/common', './src/app/core', './src/app/features'],
              from: './src/server',
              message: 'Only app.config.server.ts wires the Express server into the app.',
            },
            ...FEATURES.map(feature => ({
              target: `./src/app/features/${feature}`,
              from: FEATURES.filter(
                other => other !== feature && !ALLOWED_FEATURE_IMPORTS[feature]?.includes(other),
              ).map(other => `./src/app/features/${other}`),
              message: 'Features must not import each other; move what they share to common/.',
            })),
          ],
        },
      ],
    },
  },
  {
    // HTTP goes through the repositories, which set the base URL and loading indicator contexts
    files: ['src/app/**/*.ts'],
    ignores: ['src/app/common/repositories/**', 'src/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              message: 'Use a repository in common/repositories/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {
      '@angular-eslint/template/eqeqeq': [
        'error',
        {
          allowNullOrUndefined: true,
        },
      ],
    },
  },
  eslintConfigPrettier,
);
