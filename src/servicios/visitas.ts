import { getNetworkStateAsync } from "expo-network";

import { pedirLista, pedirUno } from "@/servicios/cliente";
import {
    agregarPendiente,
    leerPendientes,
    quitarPendiente,
} from "@/servicios/colaVisitas";
import { ErrorServicio } from "@/servicios/errores";
import { leerSesion } from "@/servicios/sesionGuardada";
import type { OrigenVisita, Visita } from "@/tipos/visita";

const VISITAS_POR_PAGINA = 500;
const ERRORES_PASAJEROS = [
  "ERROR_RED",
  "ERROR_SERVIDOR",
  "ERROR_INTERNO",
  "NO_AUTENTICADO",
];

function esPasajero(error: unknown): boolean {
  return (
    !(error instanceof ErrorServicio) ||
    ERRORES_PASAJEROS.includes(error.codigo)
  );
}

export type DatosVisita = {
  lugarId: string;
  origen: OrigenVisita;
  nota?: string | null;
};

function nuevoId(): string {
  const azar = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `vis-${Date.now().toString(36)}${azar}`;
}

function ahoraConZona(): string {
  const ahora = new Date();
  const desfase = -ahora.getTimezoneOffset();
  const local = new Date(ahora.getTime() + desfase * 60_000)
    .toISOString()
    .slice(0, 19);
  const signo = desfase >= 0 ? "+" : "-";
  const horas = String(Math.floor(Math.abs(desfase) / 60)).padStart(2, "0");
  const minutos = String(Math.abs(desfase) % 60).padStart(2, "0");
  return `${local}${signo}${horas}:${minutos}`;
}

async function hayInternet(): Promise<boolean> {
  try {
    return (await getNetworkStateAsync()).isInternetReachable !== false;
  } catch {
    return true;
  }
}

function subir(visita: Visita): Promise<Visita> {
  const { id, lugarId, fechaHora, origen, nota } = visita;
  return pedirUno<Visita>("/yo/visitas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, lugarId, fechaHora, origen, nota }),
  });
}

async function usuarioActual(): Promise<string> {
  const sesion = await leerSesion();
  if (!sesion) {
    throw new ErrorServicio({
      codigo: "NO_AUTENTICADO",
      mensaje: "Tenés que ingresar con tu cuenta para hacer esto.",
    });
  }
  return sesion.usuario.id;
}

export async function registrarVisita({
  lugarId,
  origen,
  nota = null,
}: DatosVisita): Promise<Visita> {
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
          console.warn(
            "[sincronizarVisitas] la API rechazó la visita, se descarta",
            visita.id,
            error,
          );
        }
        await quitarPendiente(visita.id);
      }
    } catch {
    } finally {
      sincronizando = null;
    }
  })();
  return sincronizando;
}

export async function obtenerVisitas(): Promise<Visita[]> {
  await sincronizarVisitas();
  const [subidas, pendientes] = await Promise.all([
    pedirLista<Visita>(`/yo/visitas?porPagina=${VISITAS_POR_PAGINA}`),
    usuarioActual().then(leerPendientes),
  ]);
  const porId = new Map(
    [...pendientes, ...subidas].map((visita) => [visita.id, visita]),
  );
  return [...porId.values()].sort(
    (a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora),
  );
}
