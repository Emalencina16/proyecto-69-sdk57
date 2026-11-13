import { guardarCopia, leerCopia } from '@/servicios/copiaLocal';
import { obtenerLugares } from '@/servicios/lugares';
import { esSinConexion, hayInternet } from '@/servicios/red';
import type { Lugar } from '@/tipos/lugar';

// El catálogo entero de lugares (los activos, sin filtros), con copia en el
// teléfono para usarlo sin señal: El Palmar y la costanera (PRD, "tiene que
// servir sin señal"). Con señal trae el de la API y actualiza la copia; sin
// señal devuelve la última copia. Solo lanza error si no hay señal y nunca se
// guardó una copia (primera vez que se abre la app, sin internet).
//
// Lo usa Mi recorrido para elegir el lugar de la visita. Mapa y Lugares lo
// pueden usar igual en lugar de obtenerLugares() sin filtros.

const CLAVE = 'catalogo.lugares';

export type Catalogo = {
  lugares: Lugar[];
  // true si vino de la copia del teléfono (la pantalla puede avisarlo)
  sinConexion: boolean;
};

export async function obtenerCatalogo(): Promise<Catalogo> {
  if (await hayInternet()) {
    try {
      const lugares = await obtenerLugares();
      await guardarCopia(CLAVE, lugares);
      return { lugares, sinConexion: false };
    } catch (error) {
      if (!esSinConexion(error)) throw error;
    }
  }
  const copia = await leerCopia<Lugar[]>(CLAVE);
  if (!copia) throw new Error('No pudimos cargar los lugares. Probá de nuevo con señal.');
  return { lugares: copia, sinConexion: true };
}
