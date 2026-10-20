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
        backgroundColor: '#0F766E',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      // Join links (https://trip-manager-a75e6.web.app/join?code=…) open the
      // app directly. Android checks the site's .well-known/assetlinks.json
      // (firebase/hosting) to confirm the app and site belong together.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'trip-manager-a75e6.web.app', pathPrefix: '/join' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    owner: 'iamharish18',
    extra: {
      eas: { projectId: '8d15d180-e15a-4a99-84c0-96015de725b5' },
    },
    // Over-the-air updates (EAS Update): JavaScript-only fixes reach
    // installed apps without a new APK. The fingerprint changes whenever
    // native code changes, so an update only goes to builds it can run on.
    updates: {
      url: 'https://u.expo.dev/8d15d180-e15a-4a99-84c0-96015de725b5',
    },
    runtimeVersion: { policy: 'fingerprint' },
    plugins: [
      'expo-router',
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      '@react-native-firebase/crashlytics',
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'dynamic' },
        },
      ],
      [
        'expo-notifications',
        {
          // Small white status-bar icon, tinted teal.
          icon: './assets/notification-icon.png',
          color: '#0F766E',
          defaultChannel: 'expenses',
        },
      ],
      [
        'expo-splash-screen',
        {
          // The white pin on teal, the same in light and dark mode.
          image: './assets/splash-icon.png',
          imageWidth: 160,
          resizeMode: 'contain',
          backgroundColor: '#0F766E',
          dark: { image: './assets/splash-icon.png', backgroundColor: '#0F766E' },
        },
      ],
    ],
  },
};
