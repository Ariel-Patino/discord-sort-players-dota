module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  plugins: ['prettier', 'import'],
  rules: {
    'prettier/prettier': ['error', { endOfLine: 'lf' }],
    'linebreak-style': ['error', 'unix'],
    'import/no-unresolved': [2, { caseSensitive: true }],
  },
};
