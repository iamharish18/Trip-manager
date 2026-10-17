// App configuration. A .js file (instead of app.json) lets EAS cloud builds
// supply google-services.json from a secret file, since the repo is public
// and the file is not committed.

module.exports = {
  expo: {
    name: 'Trip Manager',
    slug: 'trip-manager',
    scheme: 'tripmanager',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.iamharish18.tripmanager',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      adaptiveIcon: {
        backgroundColor: '#E6F6F4',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'dynamic' },
        },
      ],
    ],
  },
};
