import * as Location from 'expo-location';

import type { Lugar } from '@/tipos/lugar';
import { distanciaEntre } from '@/utilidades/distancia';

// Registro de visita "estando físicamente cerca" (PRD, Mi recorrido). Toma la
// ubicación del teléfono y la compara con el catálogo (el guardado sirve sin
// señal: el GPS no necesita internet).

// A cuánto hay que estar del punto del lugar para que cuente como visita.
export const RADIO_VISITA_METROS = 200;
// El GPS puede errar; sumamos su imprecisión al radio, pero con tope para que
// una ubicación muy mala no "acerque" lugares lejanos.
const TOLERANCIA_MAXIMA_METROS = 100;
// Sin esto, en un lugar cerrado o sin cielo la búsqueda puede no terminar nunca.
const TIEMPO_MAXIMO_MS = 15_000;
// Si el GPS no responde a tiempo, sirve una ubicación de hace poco.
const ANTIGUEDAD_MAXIMA_MS = 2 * 60_000;

export type LugarCercano = { lugar: Lugar; distancia: number };

export type ResultadoCercania = {
  // Dentro del radio, del más cercano al más lejano.
  cercanos: LugarCercano[];
  // El más cercano aunque esté lejos, para decirle a la persona cuánto le falta.
  masCercano: LugarCercano | null;
};

export class ErrorCercania extends Error {}

async function ubicacionActual(): Promise<Location.LocationObject> {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) {
    throw new ErrorCercania(
      'Sin permiso de ubicación no podemos saber dónde estás. Podés escanear el QR o cargar la visita a mano.',
    );
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new ErrorCercania('La ubicación del teléfono está apagada. Prendela y probá de nuevo.');
  }

  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<null>((resolver) => {
    temporizador = setTimeout(() => resolver(null), TIEMPO_MAXIMO_MS);
  });
  try {
    const actual = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      vencido,
    ]);
    if (actual) return actual;
  } catch {
    // Seguimos con la última conocida.
  } finally {
    clearTimeout(temporizador);
  }

  const ultima = await Location.getLastKnownPositionAsync({ maxAge: ANTIGUEDAD_MAXIMA_MS }).catch(() => null);
  if (ultima) return ultima;
  throw new ErrorCercania(
    'No pudimos encontrar tu ubicación. Probá al aire libre, escaneá el QR o cargá la visita a mano.',
  );
}

export async function buscarLugaresCercanos(lugares: Lugar[]): Promise<ResultadoCercania> {
  const { coords } = await ubicacionActual();
  const yo = { latitud: coords.latitude, longitud: coords.longitude };
  const tolerancia = Math.min(coords.accuracy ?? 0, TOLERANCIA_MAXIMA_METROS);

  const ordenados = lugares
    .map((lugar) => ({ lugar, distancia: distanciaEntre(yo, lugar.coordenadas) }))
    .filter((c): c is LugarCercano => c.distancia !== null)
    .sort((a, b) => a.distancia - b.distancia);

  return {
    cercanos: ordenados.filter((c) => c.distancia <= RADIO_VISITA_METROS + tolerancia),
    masCercano: ordenados[0] ?? null,
  };
}
