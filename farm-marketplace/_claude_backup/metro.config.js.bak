// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Increase max workers to speed up
config.maxWorkers = 2;

// Reset cache options
config.resetCache = true;

module.exports = config;