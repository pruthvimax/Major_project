module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54) automatically adds react-native-worklets/plugin
    // when react-native-worklets is installed. Do NOT add it manually here —
    // registering it twice breaks the Reanimated worklet transform.
    presets: ['babel-preset-expo'],
  };
};
