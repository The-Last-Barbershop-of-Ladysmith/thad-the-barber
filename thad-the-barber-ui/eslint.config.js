// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
// The package's types describe its ESM build (a `default` export); `require` returns the plugin itself.
const stylistic = /** @type {import('eslint').ESLint.Plugin} */ (require('@stylistic/eslint-plugin'));
// The plugin's rule metadata is loosely typed (`type: string`), so cast it to the ESLint plugin type.
const importNewlines = /** @type {import('eslint').ESLint.Plugin} */ (
  /** @type {unknown} */ (require('eslint-plugin-import-newlines'))
);
const itemsPerLine = require('./eslint/items-per-line');

/**
 * Lint + formatting standard for TypeScript.
 *
 * Base: ESLint recommended, typescript-eslint strict + stylistic (type-aware), angular-eslint recommended.
 * House rules on top:
 *   1. Explicit types on every variable, property, parameter and return value.
 *   2. Every statement ends with a semicolon.
 *   3. Arrays, objects, call arguments and parameters with 3 or more items go one per line; 1–2 items stay on one line.
 *
 * ESLint owns TypeScript formatting (`npm run lint:fix`). Prettier formats HTML/SCSS/CSS only
 * (see .prettierignore) because it would collapse the items-per-line wrapping.
 */
module.exports = defineConfig([
  {
    ignores: [
      'dist/',
      '.angular/',
      'coverage/',
      'node_modules/',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    plugins: {
      '@stylistic': stylistic,
      'import-newlines': importNewlines,
      local: {
        rules: {
          'items-per-line': itemsPerLine,
        },
      },
    },
    rules: {
      // ---- Angular -------------------------------------------------------------------------
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      // Angular components and services are often empty classes carried by their decorator.
      '@typescript-eslint/no-extraneous-class': [
        'error',
        {
          allowWithDecorator: true,
        },
      ],

      // ---- 1. Explicit types -----------------------------------------------------------------
      // `typedef` is marked deprecated by typescript-eslint (their guidance is to let TS infer
      // locals), but it is the only rule that requires annotations on variables and still works in v8.
      '@typescript-eslint/typedef': [
        'error',
        {
          arrayDestructuring: true,
          arrowParameter: true,
          memberVariableDeclaration: true,
          objectDestructuring: true,
          parameter: true,
          propertyDeclaration: true,
          variableDeclaration: true,
          variableDeclarationIgnoreFunction: false,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: false,
          allowHigherOrderFunctions: false,
          allowDirectConstAssertionInArrowFunctions: false,
          allowConciseArrowFunctionExpressionsStartingWithVoid: false,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Conflicts with typedef: it forbids the annotations typedef requires.
      '@typescript-eslint/no-inferrable-types': 'off',
      // Keep the type on the declaration (`x: FormControl<string> = new FormControl()`), as typedef requires.
      '@typescript-eslint/consistent-generic-constructors': [
        'error',
        'type-annotation',
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'no-type-imports',
        },
      ],

      // Numbers in template strings (`${day}`) are unambiguous; the strict preset forbids them.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],

      // ---- General correctness -----------------------------------------------------------------
      eqeqeq: [
        'error',
        'always',
      ],
      curly: [
        'error',
        'all',
      ],
      'prefer-const': 'error',
      'no-console': [
        'warn',
        {
          allow: [
            'warn',
            'error',
          ],
        },
      ],

      // ---- 2. Semicolons -------------------------------------------------------------------------
      '@stylistic/semi': [
        'error',
        'always',
      ],
      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true,
          },
          singleline: {
            delimiter: 'semi',
            requireLast: true,
          },
        },
      ],

      // ---- 3. One item per line from 3 items ------------------------------------------------------
      '@stylistic/array-bracket-newline': [
        'error',
        {
          multiline: true,
          minItems: 3,
        },
      ],
      '@stylistic/array-element-newline': [
        'error',
        {
          multiline: true,
          minItems: 3,
        },
      ],
      '@stylistic/object-curly-newline': [
        'error',
        {
          ObjectExpression: {
            multiline: true,
            minProperties: 3,
          },
          ObjectPattern: {
            multiline: true,
            minProperties: 3,
          },
          TSTypeLiteral: {
            multiline: true,
            minProperties: 3,
          },
          TSInterfaceBody: {
            multiline: true,
            minProperties: 3,
          },
          ImportDeclaration: {
            multiline: true,
            consistent: true,
          },
          ExportDeclaration: {
            multiline: true,
            consistent: true,
          },
        },
      ],
      '@stylistic/function-paren-newline': [
        'error',
        'multiline-arguments',
      ],
      'local/items-per-line': 'error',
      'import-newlines/enforce': [
        'error',
        {
          // The most items allowed on one line, so 2 wraps from 3.
          items: 2,
          'max-len': 120,
          semi: true,
        },
      ],

      // ---- General layout ----------------------------------------------------------------------------
      '@stylistic/indent': [
        'error',
        2,
      ],
      '@stylistic/quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
        },
      ],
      '@stylistic/comma-dangle': [
        'error',
        'always-multiline',
      ],
      '@stylistic/object-curly-spacing': [
        'error',
        'always',
      ],
      '@stylistic/arrow-parens': [
        'error',
        'always',
      ],
      '@stylistic/brace-style': [
        'error',
        '1tbs',
      ],
      '@stylistic/quote-props': [
        'error',
        'as-needed',
      ],
      '@stylistic/type-annotation-spacing': 'error',
      '@stylistic/multiline-ternary': [
        'error',
        'always-multiline',
      ],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/eol-last': 'error',
      '@stylistic/max-len': [
        'warn',
        {
          code: 120,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
]);
