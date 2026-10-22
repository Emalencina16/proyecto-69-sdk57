import { Directory, File, Paths } from 'expo-file-system';

import { ErrorServicio, errorDeRed } from '@/servicios/errores';


const carpeta = new Directory(Paths.document, 'audioguias');

function archivoDe(lugarId: string, url: string): File {
  const sinParametros = url.split('?')[0];
  const extension = sinParametros.includes('.') ? sinParametros.split('.').pop() : 'm4a';
  return new File(carpeta, `${lugarId}.${extension}`);
}


export function obtenerAudioLocal(lugarId: string, url: string): string | null {
  const archivo = archivoDe(lugarId, url);
  return archivo.exists ? archivo.uri : null;
}

export async function descargarAudio(lugarId: string, url: string): Promise<string> {
  const destino = archivoDe(lugarId, url);
  if (destino.exists) return destino.uri;

  try {
    if (!carpeta.exists) carpeta.create();
    const descargado = await File.downloadFileAsync(url, destino);
    return descargado.uri;
  } catch (error) {
    
    try {
      if (destino.exists) destino.delete();
    } catch {
      
    }
    console.error('[descargarAudio] falló', error);
    throw errorDeRed();
  }
}