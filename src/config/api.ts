import Constants from 'expo-constants';

// En desarrollo, la API corre en la misma máquina que el servidor de Expo.
// hostUri es "192.168.x.x:8081", así que tomamos esa IP: sirve igual para el
// emulador y para un teléfono físico en la misma WiFi.
const hostDesarrollo = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

// API de la cátedra (api-mi-ciudad/, puerto 3000). Para el APK se define
// EXPO_PUBLIC_API_URL en .env con la URL publicada.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${hostDesarrollo}:3000`;

// json-server (db.json, puerto 3001). Temporal: lo usan los servicios que
// todavía no pasaron a la API (autenticación y favoritos).
export const MOCK_API_URL = `http://${hostDesarrollo}:3001`;
