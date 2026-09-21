// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // eslint-config-expo@57 ships eslint-plugin-react-hooks v7, which adds the
    // React Compiler diagnostic rules below as *errors*. They flag patterns this
    // codebase relies on (setState inside data-loading effects, useRef(...).current
    // for Animated values, etc.) that work correctly at runtime and are not
    // React Compiler-enabled here. Keep them visible as warnings, not build-breakers.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);
