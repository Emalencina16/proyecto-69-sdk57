import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extiende app.json con lo que no puede vivir ahí: la clave de Google Maps sale
// de .env.local (fuera del repo) y se inyecta en el AndroidManifest al compilar.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
  android: {
    ...config.android,
    package: 'com.walterfrias.proyecto69',
  },
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY }],
  ],
});
