import globals from 'globals';

export default [
  { files: ['**/*.js'], languageOptions: { sourceType: 'script' } },
  { languageOptions: { globals: globals.browser } },
  {
    files: ['**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
];
