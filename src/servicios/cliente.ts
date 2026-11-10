import { API_URL } from '@/config/api';
import { ErrorServicio, errorDeRed, errorDeServidor, errorDeTiempo } from '@/servicios/errores';
import type { RespuestaError, RespuestaLista, RespuestaUno } from '@/tipos/api';
import { fetch as expoFetch } from 'expo/fetch';

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

// Tiempo máximo de un pedido, incluida la lectura del cuerpo. Sin esto, con
// señal débil el pedido queda colgado y la visita nunca pasa a la cola offline.
// 20 s y no menos: la API publicada (Render Free) se duerme tras 15 min sin uso
// y el primer pedido tarda ~1 min; ese falla con errorDeTiempo y el siguiente
// ya anda. Subir una foto con poca señal tarda más: 60 s.
const TIEMPO_MAXIMO_MS = 20_000;
const TIEMPO_MAXIMO_ARCHIVOS_MS = 60_000;

// Exportada para los pedidos sin respuesta que leer (DELETE → 204).
export async function pedir(ruta: string, opciones: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(opciones.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const esArchivo = opciones.body instanceof FormData;
  const control = new AbortController();
  let vencido = false;
  const temporizador = setTimeout(
    () => {
      vencido = true;
      control.abort();
    },
    esArchivo ? TIEMPO_MAXIMO_ARCHIVOS_MS : TIEMPO_MAXIMO_MS,
  );
  // Si quien llama pasa su propia señal (ej. cancelar al salir de la
  // pantalla), también corta el pedido.
  const cancelar = () => control.abort();
  opciones.signal?.addEventListener('abort', cancelar);

  try {
    let respuesta: Response;
    try {
      const fetchHttp = esArchivo ? expoFetch : fetch;
      respuesta = await fetchHttp(`${API_URL}${ruta}`, { ...opciones, headers, signal: control.signal });
    } catch {
      throw vencido ? errorDeTiempo() : errorDeRed();
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
      // Se cortó a mitad del cuerpo: tiempo o red, no un error del servidor.
      if (vencido) throw errorDeTiempo();
      if (control.signal.aborted) throw errorDeRed();
      throw errorDeServidor();
    }

    if (!respuesta.ok) {
      const error = (cuerpo as Partial<RespuestaError> | null)?.error;
      throw error ? new ErrorServicio(error) : errorDeServidor();
    }
    return cuerpo;
  } finally {
    clearTimeout(temporizador);
    opciones.signal?.removeEventListener('abort', cancelar);
  }
}

export async function pedirLista<T>(ruta: string, opciones?: RequestInit): Promise<T[]> {
  const { datos } = (await pedir(ruta, opciones)) as RespuestaLista<T>;
  return datos;
}

export async function pedirPagina<T>(ruta: string, opciones?: RequestInit): Promise<RespuestaLista<T>> {
  return (await pedir(ruta, opciones)) as RespuestaLista<T>;
}

export async function pedirUno<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const { datos } = (await pedir(ruta, opciones)) as RespuestaUno<T>;
  return datos;
}
