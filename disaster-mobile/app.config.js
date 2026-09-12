module.exports = ({ config }) => ({
  ...config,
  plugins: (config.plugins ?? []).map((plugin) => {
    if (plugin === "react-native-maps" || (Array.isArray(plugin) && plugin[0] === "react-native-maps")) {
      return [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? "",
        },
      ];
    }
    return plugin;
  }),
});
