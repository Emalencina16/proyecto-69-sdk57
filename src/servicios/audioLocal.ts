import { Directory, File, Paths } from "expo-file-system";

import { errorDeRed } from "@/servicios/errores";

const carpeta = new Directory(Paths.document, "audioguias");
const enCurso = new Map<string, Promise<string>>();

function extensionDe(url: string): string {
  const ultimoSegmento = url.split("?")[0].split("#")[0].split("/").pop() ?? "";
  return (
    ultimoSegmento.match(/\.([a-z0-9]{2,4})$/i)?.[1].toLowerCase() ?? "m4a"
  );
}

function huella(texto: string): string {
  let h = 5381;
  for (let i = 0; i < texto.length; i++)
    h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function archivoDe(lugarId: string, url: string): File {
  return new File(carpeta, `${lugarId}-${huella(url)}.${extensionDe(url)}`);
}

// Asíncrona desde el primer día, como pide el PDF.
export async function obtenerAudioLocal(
  lugarId: string,
  url: string,
): Promise<string | null> {
  try {
    const archivo = archivoDe(lugarId, url);
    return archivo.exists ? archivo.uri : null;
  } catch (error) {
    console.error("[obtenerAudioLocal] falló", error);
    return null;
  }
}

// Borra la copia del teléfono: la audioguía vuelve a escucharse por streaming
// y se puede descargar de nuevo.
export async function borrarAudioLocal(
  lugarId: string,
  url: string,
): Promise<void> {
  const archivo = archivoDe(lugarId, url);
  if (archivo.exists) archivo.delete();
}

export function descargarAudio(lugarId: string, url: string): Promise<string> {
  const clave = `${lugarId}|${url}`;
  const previa = enCurso.get(clave);
  if (previa) return previa;

  const tarea = descargar(lugarId, url).finally(() => enCurso.delete(clave));
  enCurso.set(clave, tarea);
  return tarea;
}

async function descargar(lugarId: string, url: string): Promise<string> {
  const destino = archivoDe(lugarId, url);
  if (destino.exists) return destino.uri;

  const temporal = new File(carpeta, `${destino.name}.part`);
  try {
    if (!carpeta.exists) carpeta.create();
    if (temporal.exists) temporal.delete();
    await File.downloadFileAsync(url, temporal);
    temporal.move(destino);
    return destino.uri;
  } catch (error) {
    try {
      if (temporal.exists) temporal.delete();
    } catch {}
    console.error("[descargarAudio] falló", error);
    throw errorDeRed();
  }
}
