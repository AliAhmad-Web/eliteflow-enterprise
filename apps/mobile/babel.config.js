module.exports = function (api) {
  api.cache(true);
  return {
    // Expo SDK 57: babel-preset-expo already injects react-native-worklets/plugin
    // when the package is installed. Do NOT add it again — double transform can
    // corrupt release Hermes bundles and crash on cold start.
    presets: ["babel-preset-expo"],
  };
};
