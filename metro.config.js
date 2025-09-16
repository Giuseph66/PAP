const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configurações para react-native-worklets
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configurações para New Architecture
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
