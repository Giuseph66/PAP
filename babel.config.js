module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin para react-native-worklets (inclui reanimated)
      'react-native-worklets/plugin',
    ],
  };
};
