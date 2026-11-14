import * as SecureStore from 'expo-secure-store';

import type { Sesion } from '@/tipos/api';

// La sesión (token + usuario) queda cifrada en el teléfono: Keychain en iOS,
// Keystore en Android. Nunca en kv-store/AsyncStorage, que es texto plano
// (regla del PRD). Se guarda también el usuario para poder entrar sin señal.
// SecureStore solo guarda texto, así que el usuario va como JSON.

const CLAVE_TOKEN = 'sesion.token';
const CLAVE_USUARIO = 'sesion.usuario';
const CLAVE_HUELLA = 'sesion.pideHuella';

export async function guardarSesion({ token, usuario }: Sesion): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
  await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(usuario));
}

// null si no hay sesión guardada (o quedó a medias / ilegible).
export async function leerSesion(): Promise<Sesion | null> {
  try {
    const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
    const usuario = await SecureStore.getItemAsync(CLAVE_USUARIO);
    if (!token || !usuario) return null;
    return { token, usuario: JSON.parse(usuario) };
  } catch {
    return null;
  }
}

// Al cerrar sesión se borra también la preferencia de huella: quien ingrese
// después en este teléfono la activa de nuevo si quiere.
export async function borrarSesion(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  await SecureStore.deleteItemAsync(CLAVE_USUARIO);
  await SecureStore.deleteItemAsync(CLAVE_HUELLA);
}

// Si la persona eligió que se le pida la huella antes de usar la sesión
// guardada. No es secreto, pero vive junto a la sesión para borrarse con ella.
export async function leerPideHuella(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(CLAVE_HUELLA)) === 'si';
  } catch {
    return false;
  }
}

export async function guardarPideHuella(pide: boolean): Promise<void> {
  if (pide) await SecureStore.setItemAsync(CLAVE_HUELLA, 'si');
  else await SecureStore.deleteItemAsync(CLAVE_HUELLA);
}
