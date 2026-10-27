import { API_URL } from '@/config/api';
import { ErrorServicio, errorDeRed, errorDeServidor } from '@/servicios/errores';
import type { RespuestaError, RespuestaLista, RespuestaUno } from '@/tipos/api';

// Único lugar que habla con la API de la cátedra. Los servicios piden con
// pedirLista / pedirUno y reciben `datos` ya sacado del sobre { datos, meta }.
// Si la API responde { error: { codigo, mensaje } }, se lanza un ErrorServicio
// con ese mismo código y mensaje (los mensajes están pensados para mostrarse
// tal cual en pantalla).

// Lo configura el SesionProvider (src/estado/sesion.tsx) al iniciar, recuperar
// o cerrar la sesión. Si hay token, viaja en cada pedido.
let token: string | null = null;
let alVencerSesion: (() => void) | null = null;

export function configurarToken(nuevoToken: string | null) {
  token = nuevoToken;
}

export function configurarAlVencerSesion(funcion: () => void) {
  alVencerSesion = funcion;
}

// Exportada para los pedidos sin respuesta que leer (DELETE → 204).
export async function pedir(ruta: string, opciones: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(opciones.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers });
  } catch {
    throw errorDeRed();
  }

  // Mandamos token y la API lo rechazó: vencido (dura 30 días) o inválido.
  // Sin token (ej. login con contraseña mal) el 401 es un error común.
  if (respuesta.status === 401 && token) alVencerSesion?.();

  // DELETE exitoso: 204 sin cuerpo.
  if (respuesta.status === 204) return null;

  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw errorDeServidor();
  }

  if (!respuesta.ok) {
    const error = (cuerpo as Partial<RespuestaError> | null)?.error;
    throw error ? new ErrorServicio(error) : errorDeServidor();
  }
  return cuerpo;
}

export async function pedirLista<T>(ruta: string, opciones?: RequestInit): Promise<T[]> {
  const { datos } = (await pedir(ruta, opciones)) as RespuestaLista<T>;
  return datos;
}

export async function pedirUno<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const { datos } = (await pedir(ruta, opciones)) as RespuestaUno<T>;
  return datos;
}
