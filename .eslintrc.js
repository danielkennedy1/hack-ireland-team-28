module.exports = {
  extends: [
    // ... your existing extends ...
    'plugin:prettier/recommended', // Add this line
  ],
  plugins: [
    // ... your existing plugins ...
    'prettier', // Add this line
  ],
  rules: {
    'prettier/prettier': 'error',
    // ... your other rules ...
  },
};
