import * as SecureStore from 'expo-secure-store';

import type { Sesion } from '@/tipos/api';

// La sesión (token + usuario) queda cifrada en el teléfono: Keychain en iOS,
// Keystore en Android. Nunca en kv-store/AsyncStorage, que es texto plano
// (regla del PRD). Se guarda también el usuario para poder entrar sin señal.
// SecureStore solo guarda texto, así que el usuario va como JSON.

const CLAVE_TOKEN = 'sesion.token';
const CLAVE_USUARIO = 'sesion.usuario';

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

export async function borrarSesion(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  await SecureStore.deleteItemAsync(CLAVE_USUARIO);
}
