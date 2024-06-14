module.exports = {
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': ['error', { endOfLine: 'lf' }],
    'linebreak-style': ['error', 'unix'],
  },
};
