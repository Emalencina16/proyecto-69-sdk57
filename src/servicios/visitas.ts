import { getNetworkStateAsync } from 'expo-network';

import { pedirLista, pedirUno } from '@/servicios/cliente';
import { agregarPendiente, leerPendientes, quitarPendiente } from '@/servicios/colaVisitas';
import { ErrorServicio } from '@/servicios/errores';
import { leerSesion } from '@/servicios/sesionGuardada';
import type { OrigenVisita, Visita } from '@/tipos/visita';

// Visitas de quien tiene la sesión (el usuario sale del token). La API ya las
// devuelve en orden de recorrido: de la más antigua a la más nueva.
//
// Sin señal (PRD §4): la visita se guarda en el teléfono con
// `sincronizada: false` y se sube después. El id lo genera el teléfono, y la
// API es idempotente por id: si una visita se manda dos veces (la señal se
// cortó a mitad del envío), no se duplica.

// Por defecto la API pagina de a 20; para visitas admite hasta 500.
const VISITAS_POR_PAGINA = 500;

// Con estos errores la visita queda en la cola y se reintenta más tarde.
// Con cualquier otro (lugar que no existe, datos inválidos) reintentar no
// sirve: la API la va a rechazar siempre.
const ERRORES_PASAJEROS = ['ERROR_RED', 'ERROR_SERVIDOR', 'ERROR_INTERNO', 'NO_AUTENTICADO'];

function esPasajero(error: unknown): boolean {
  return !(error instanceof ErrorServicio) || ERRORES_PASAJEROS.includes(error.codigo);
}

export type DatosVisita = {
  lugarId: string;
  origen: OrigenVisita;
  nota?: string | null;
};

// "vis-" + 16 caracteres. La API acepta `vis-` y de 3 a 36 de [A-Za-z0-9_-].
function nuevoId(): string {
  const azar = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `vis-${Date.now().toString(36)}${azar}`;
}

// Ahora en ISO 8601 con la zona del teléfono y sin milisegundos,
// ej. "2026-11-08T17:42:00-03:00" (regla de fechas del PRD).
function ahoraConZona(): string {
  const ahora = new Date();
  const desfase = -ahora.getTimezoneOffset();
  const local = new Date(ahora.getTime() + desfase * 60_000).toISOString().slice(0, 19);
  const signo = desfase >= 0 ? '+' : '-';
  const horas = String(Math.floor(Math.abs(desfase) / 60)).padStart(2, '0');
  const minutos = String(Math.abs(desfase) % 60).padStart(2, '0');
  return `${local}${signo}${horas}:${minutos}`;
}

async function hayInternet(): Promise<boolean> {
  try {
    return (await getNetworkStateAsync()).isInternetReachable !== false;
  } catch {
    return true; // si no se puede saber, se intenta igual
  }
}

function subir(visita: Visita): Promise<Visita> {
  const { id, lugarId, fechaHora, origen, nota } = visita;
  return pedirUno<Visita>('/yo/visitas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, lugarId, fechaHora, origen, nota }),
  });
}

async function usuarioActual(): Promise<string> {
  const sesion = await leerSesion();
  if (!sesion) {
    throw new ErrorServicio({
      codigo: 'NO_AUTENTICADO',
      mensaje: 'Tenés que ingresar con tu cuenta para hacer esto.',
    });
  }
  return sesion.usuario.id;
}

// Registra una visita. Con señal la sube y devuelve la de la API
// (`sincronizada: true`). Sin señal la guarda en el teléfono y devuelve la
// local (`sincronizada: false`): para la pantalla, en los dos casos quedó
// registrada. Solo lanza error si la API la rechaza (ej. el lugar no existe).
export async function registrarVisita({ lugarId, origen, nota = null }: DatosVisita): Promise<Visita> {
  const visita: Visita = {
    id: nuevoId(),
    usuarioId: await usuarioActual(),
    lugarId,
    fechaHora: ahoraConZona(),
    origen,
    fotoUri: null,
    nota: nota?.trim() || null,
    sincronizada: false,
  };

  if (await hayInternet()) {
    try {
      return await subir(visita);
    } catch (error) {
      if (!esPasajero(error)) throw error;
    }
  }
  await agregarPendiente(visita);
  return visita;
}

// Sube las visitas que quedaron en el teléfono. Se llama al abrir el
// recorrido y cuando vuelve la señal. Si una falla por la red, frena y
// espera a la próxima; las que la API rechaza para siempre se descartan.
let sincronizando: Promise<void> | null = null;

export function sincronizarVisitas(): Promise<void> {
  sincronizando ??= (async () => {
    try {
      const pendientes = await leerPendientes(await usuarioActual());
      for (const visita of pendientes) {
        try {
          await subir(visita);
        } catch (error) {
          if (esPasajero(error)) return;
          console.warn('[sincronizarVisitas] la API rechazó la visita, se descarta', visita.id, error);
        }
        await quitarPendiente(visita.id);
      }
    } catch {
      // sin sesión o sin poder leer la cola: se reintenta la próxima vez
    } finally {
      sincronizando = null;
    }
  })();
  return sincronizando;
}

// Las de la API más las que todavía están en el teléfono, en orden de
// recorrido. Antes intenta subir las pendientes.
export async function obtenerVisitas(): Promise<Visita[]> {
  await sincronizarVisitas();
  const [subidas, pendientes] = await Promise.all([
    pedirLista<Visita>(`/yo/visitas?porPagina=${VISITAS_POR_PAGINA}`),
    usuarioActual().then(leerPendientes),
  ]);
  // Por id: si una se subió pero no se llegó a sacar de la cola, sale una vez.
  const porId = new Map([...pendientes, ...subidas].map((visita) => [visita.id, visita]));
  return [...porId.values()].sort((a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora));
}
