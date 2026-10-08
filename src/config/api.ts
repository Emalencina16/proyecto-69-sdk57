import Constants from 'expo-constants';

// En desarrollo, la mock API (json-server) corre en la misma máquina que el
// servidor de Expo. hostUri es "192.168.x.x:8081", así que tomamos esa IP:
// sirve igual para el emulador y para un teléfono físico en la misma WiFi.
const hostDesarrollo = Constants.expoConfig?.hostUri?.split(':')[0];
const MOCK_API_URL = `http://${hostDesarrollo ?? 'localhost'}:3001`;

// Único lugar a tocar cuando llegue la API real de la cátedra: definir
// EXPO_PUBLIC_API_URL en .env (o .env.local) con la URL definitiva.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? MOCK_API_URL;
