import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.wrangler/**', 'playwright-report/**', 'test-results/**', 'legacy-tmp/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['error'] }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // El combobox maneja el teclado en el input; las opciones solo reciben el mouse.
      'jsx-a11y/click-events-have-key-events': 'off',
      // Las etiquetas de los interruptores llevan título y descripción anidados.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['e2e/**/*.ts', '*.config.{ts,js}', '**/test/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);
