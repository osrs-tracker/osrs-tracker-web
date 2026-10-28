// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import { readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';

const FEATURES = readdirSync('src/app/features');
// Home is a dashboard over the trackers: it shows their search boxes, rows and stored players and items
const ALLOWED_FEATURE_IMPORTS = { home: ['trackers'] };

// A card's sides are `px-card` (16px on phones, 20px from sm): 20px written by hand, or a phone-only 16px, is the drift
// the token replaced. Matched in class strings, templates and host bindings alike.
const CARD_PADDING = String.raw`(^|[\s"'\x60])(-?mx|p[xlrse]?)-5([\s"'\x60]|$)|max-sm:p[xlrse]?-4([\s"'\x60]|$)`;
const CARD_PADDING_MESSAGE =
  'Card padding is `px-card`, `.card-header` or another value from Padding in the osrs-tracker-web skill, not 20px or a `max-sm:` 16px by hand.';

export default defineConfig(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
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
      'no-restricted-syntax': [
        'error',
        // Host and computed class strings; inline templates go through the template rule below
        { selector: `Literal[value=/${CARD_PADDING}/]`, message: CARD_PADDING_MESSAGE },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    // Layers: features build on common and core, never the other way round, and don't reach into each other; and no
    // circular imports, which load a module half-initialised. Resolved paths, so relative imports count too.
    files: ['src/**/*.ts'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: 'tsconfig.json' })],
      // The files no-cycle parses to follow their imports; it skips the others, and the default is only .js
      'import-x/extensions': ['.ts'],
    },
    rules: {
      'import-x/no-cycle': 'error',
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
    ignores: ['src/app/common/api/**', 'src/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              message: 'Use a repository in common/api/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `TextAttribute[name='class'][value=/${CARD_PADDING}/]`, message: CARD_PADDING_MESSAGE },
        { selector: `LiteralPrimitive[value=/${CARD_PADDING}/]`, message: CARD_PADDING_MESSAGE },
      ],
      '@angular-eslint/template/eqeqeq': [
        'error',
        {
          allowNullOrUndefined: true,
        },
      ],
      // Row components on an <a> render the link's content from their own template, which the rule can't see
      '@angular-eslint/template/elements-content': [
        'error',
        { allowList: ['player-row', 'item-row', 'top-gainer-row'] },
      ],
    },
  },
  eslintConfigPrettier,
);
