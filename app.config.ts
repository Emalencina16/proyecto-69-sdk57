import type { ConfigContext, ExpoConfig } from 'expo/config';

// Firebase (push en Android): google-services.json se baja de la consola de
// Firebase. Su ruta va en .env.local (GOOGLE_SERVICES_JSON=./google-services.json)
// o, en EAS, como variable de tipo archivo. Sin ella la app compila igual, sin push.
const GOOGLE_SERVICES = process.env.GOOGLE_SERVICES_JSON;

// Extiende app.json con lo que no puede vivir ahí: la clave de Google Maps sale
// de .env.local (fuera del repo) y se inyecta en el AndroidManifest al compilar.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
  android: {
    ...config.android,
    package: 'com.walterfrias.proyecto69',
    ...(GOOGLE_SERVICES ? { googleServicesFile: GOOGLE_SERVICES } : {}),
  },
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY }],
  ],
});
