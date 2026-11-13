import Constants from 'expo-constants';

// En desarrollo, la API corre en la misma máquina que el servidor de Expo.
// hostUri es "192.168.x.x:8081", así que tomamos esa IP: sirve igual para el
// emulador y para un teléfono físico en la misma WiFi.
const hostDesarrollo = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

// API de la cátedra (api-mi-ciudad/, puerto 3000). Para el APK, EXPO_PUBLIC_API_URL
// sale de las variables de EAS (entorno production) con la URL publicada.
const URL_PUBLICADA = process.env.EXPO_PUBLIC_API_URL;

// En release no hay servidor de Expo ni API local, y Android bloquea http sin
// cifrar: si falta la variable, mejor un error claro que una app sin datos.
if (!URL_PUBLICADA && !__DEV__) {
  throw new Error('Falta EXPO_PUBLIC_API_URL: definila en el entorno de EAS antes de buildear.');
}

export const API_URL = URL_PUBLICADA ?? `http://${hostDesarrollo}:3000`;
