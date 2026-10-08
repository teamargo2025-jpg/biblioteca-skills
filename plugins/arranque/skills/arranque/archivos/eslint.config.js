import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/', 'node_modules/'] },

  js.configs.recommended,

  // Un _ delante del nombre marca un parametro que se recibe a proposito sin usarlo.
  {
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }
  },

  // El codigo del sitio corre en el navegador.
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser }
  },

  // Los scripts, los hooks de Claude Code y la configuracion corren en Node.
  {
    files: ['scripts/**/*.mjs', '.claude/hooks/**/*.mjs', '*.config.js'],
    languageOptions: { globals: globals.node }
  },

  // El formato lo decide Prettier; esto apaga las reglas de ESLint que chocarian con el.
  prettier
];
