import { Directory, File, Paths } from "expo-file-system";

import { pedir, pedirLista, pedirUno } from "@/servicios/cliente";
import {
    agregarPendiente,
    leerPendientes,
    quitarPendiente,
} from "@/servicios/colaVisitas";
import { guardarCopia, leerCopia } from "@/servicios/copiaLocal";
import { ErrorServicio } from "@/servicios/errores";
import { esSinConexion, hayInternet } from "@/servicios/red";
import { leerSesion } from "@/servicios/sesionGuardada";
import type { RespuestaUno } from "@/tipos/api";
import type { OrigenVisita, Visita } from "@/tipos/visita";

// Visitas de quien tiene la sesión (el usuario sale del token). La API ya las
// devuelve en orden de recorrido: de la más antigua a la más nueva.
//
// Sin señal (PRD §4): la visita se guarda en el teléfono con
// `sincronizada: false` y se sube después. El id lo genera el teléfono, y la
// API es idempotente por id: si una visita se manda dos veces (la señal se
// cortó a mitad del envío), no se duplica.
//
// Foto: la pantalla pasa la uri local que da expo-image-picker. Se copia a
// Paths.document (la caché del picker la puede borrar el sistema), se sube con
// POST /archivos y la url que devuelve va en `fotoUri` de la visita. Mientras
// no se subió, `fotoUri` es la ruta local (file://), que <Image> muestra igual.

// Por defecto la API pagina de a 20; para visitas admite hasta 500.
const VISITAS_POR_PAGINA = 500;

// Con estos errores la visita queda en la cola y se reintenta más tarde.
// Con cualquier otro (lugar que no existe, datos inválidos) reintentar no
// sirve: la API la va a rechazar siempre.
const ERRORES_PASAJEROS = [
  "ERROR_RED",
  "ERROR_SERVIDOR",
  "ERROR_INTERNO",
  "NO_AUTENTICADO",
  "ALMACEN_NO_DISPONIBLE",
];

const carpetaFotos = new Directory(Paths.document, "fotos-visitas");

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
  // uri local de expo-image-picker (`result.assets[0].uri`). Opcional.
  foto?: string | null;
};

type ArchivoSubido = { url: string; tipo: string; bytes: number };

// "vis-" + 16 caracteres. La API acepta `vis-` y de 3 a 36 de [A-Za-z0-9_-].
function nuevoId(): string {
  const azar = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `vis-${Date.now().toString(36)}${azar}`;
}

// Ahora en ISO 8601 con la zona del teléfono y sin milisegundos,
// ej. "2026-11-08T17:42:00-03:00" (regla de fechas del PRD).
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

// Una url de la API (http/https) ya está subida; cualquier otra cosa es local.
function esFotoLocal(uri: string | null): uri is string {
  return !!uri && !/^https?:\/\//i.test(uri);
}

// Copia la foto del picker a una carpeta propia con el id de la visita como
// nombre, para que siga existiendo si la visita queda en la cola.
async function guardarFotoLocal(
  uriTemporal: string,
  visitaId: string,
): Promise<string> {
  carpetaFotos.create({ intermediates: true, idempotent: true });
  const origen = new File(uriTemporal);
  const destino = new File(carpetaFotos, `${visitaId}${origen.extension || ".jpg"}`);
  await origen.copy(destino, { overwrite: true });
  return destino.uri;
}

function borrarFotoLocal(uri: string | null) {
  if (!esFotoLocal(uri)) return;
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // si no se puede borrar, queda en la carpeta; no afecta a la visita
  }
}

// POST /archivos (multipart, campo "archivo"). Devuelve la url para fotoUri.
async function subirFoto(uriLocal: string): Promise<string> {
  const datos = new FormData();
  datos.append("archivo", new File(uriLocal));
  const { datos: archivo } = (await pedir("/archivos", {
    method: "POST",
    body: datos,
  })) as RespuestaUno<ArchivoSubido>;
  return archivo.url;
}

function subir(visita: Visita, fotoUri: string | null): Promise<Visita> {
  const { id, lugarId, fechaHora, origen, nota } = visita;
  return pedirUno<Visita>("/yo/visitas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, lugarId, fechaHora, origen, nota, fotoUri }),
  });
}

// Sube la foto (si es local) y después la visita con la url.
// - Error pasajero (red, servidor): se lanza y la visita queda en la cola.
// - La API rechaza la foto para siempre (muy grande, tipo inválido):
//   con `siFotoFalla: "lanzar"` se lanza (la pantalla muestra el mensaje);
//   con "omitir" se sube la visita sin foto (sincronización en segundo plano).
async function subirConFoto(
  visita: Visita,
  siFotoFalla: "lanzar" | "omitir",
): Promise<Visita> {
  let fotoUri: string | null = esFotoLocal(visita.fotoUri) ? null : visita.fotoUri;
  if (esFotoLocal(visita.fotoUri)) {
    try {
      fotoUri = await subirFoto(visita.fotoUri);
    } catch (error) {
      if (esPasajero(error) || siFotoFalla === "lanzar") throw error;
      console.warn("[visitas] la API rechazó la foto, se sube sin foto", visita.id, error);
    }
  }
  const subida = await subir(visita, fotoUri);
  borrarFotoLocal(visita.fotoUri);
  return subida;
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

// Registra una visita, con foto opcional. Con señal la sube y devuelve la de
// la API (`sincronizada: true`, `fotoUri` con la url). Sin señal la guarda en
// el teléfono y devuelve la local (`sincronizada: false`, `fotoUri` local):
// para la pantalla, en los dos casos quedó registrada. Solo lanza error si la
// API la rechaza (lugar que no existe, foto de más de 5 MB o de otro tipo).
export async function registrarVisita({
  lugarId,
  origen,
  nota = null,
  foto = null,
}: DatosVisita): Promise<Visita> {
  const id = nuevoId();
  const visita: Visita = {
    id,
    usuarioId: await usuarioActual(),
    lugarId,
    fechaHora: ahoraConZona(),
    origen,
    fotoUri: foto ? await guardarFotoLocal(foto, id) : null,
    nota: nota?.trim() || null,
    sincronizada: false,
  };

  if (await hayInternet()) {
    try {
      return await subirConFoto(visita, "lanzar");
    } catch (error) {
      if (!esPasajero(error)) {
        borrarFotoLocal(visita.fotoUri);
        throw error;
      }
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
          await subirConFoto(visita, "omitir");
        } catch (error) {
          if (esPasajero(error)) return;
          console.warn(
            "[sincronizarVisitas] la API rechazó la visita, se descarta",
            visita.id,
            error,
          );
          borrarFotoLocal(visita.fotoUri);
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

export type Recorrido = {
  visitas: Visita[];
  // true si las de la API vienen de la copia del teléfono (sin señal)
  sinConexion: boolean;
};

// Copia por usuario: si en el teléfono entra otra cuenta, no ve el recorrido
// de la anterior.
const claveCopia = (usuarioId: string) => `visitas.ultimas.${usuarioId}`;

// Las de la API más las que todavía están en el teléfono, en orden de
// recorrido. Con señal, antes intenta subir las pendientes y guarda una copia
// de las de la API. Sin señal (o con el servidor caído) usa esa copia: el
// recorrido se sigue viendo en El Palmar. Si no hay copia, lanza el error.
export async function obtenerRecorrido(): Promise<Recorrido> {
  const usuarioId = await usuarioActual();
  let subidas: Visita[] | null = null;
  if (await hayInternet()) {
    await sincronizarVisitas();
    try {
      subidas = await pedirLista<Visita>(`/yo/visitas?porPagina=${VISITAS_POR_PAGINA}`);
      await guardarCopia(claveCopia(usuarioId), subidas);
    } catch (error) {
      if (!esSinConexion(error)) throw error;
    }
  }
  const sinConexion = subidas === null;
  if (sinConexion) {
    subidas = await leerCopia<Visita[]>(claveCopia(usuarioId));
    if (!subidas) {
      throw new ErrorServicio({
        codigo: "ERROR_RED",
        mensaje: "No pudimos cargar tu recorrido. Probá de nuevo con señal.",
      });
    }
  }
  const pendientes = await leerPendientes(usuarioId);
  return { visitas: unirEnOrden(subidas ?? [], pendientes), sinConexion };
}

// Igual que obtenerRecorrido, solo la lista.
export async function obtenerVisitas(): Promise<Visita[]> {
  return (await obtenerRecorrido()).visitas;
}

function unirEnOrden(subidas: Visita[], pendientes: Visita[]): Visita[] {
  // Por id: si una se subió pero no se llegó a sacar de la cola, sale una vez.
  const porId = new Map(
    [...pendientes, ...subidas].map((visita) => [visita.id, visita]),
  );
  return [...porId.values()].sort(
    (a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora),
  );
}
