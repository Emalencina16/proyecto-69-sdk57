import type { Coordenadas } from '@/tipos/coordenadas';

export function distanciaEntre(a: Coordenadas, b: Coordenadas): number | null {
  if (
    !Number.isFinite(a.latitud) ||
    !Number.isFinite(a.longitud) ||
    !Number.isFinite(b.latitud) ||
    !Number.isFinite(b.longitud) ||
    Math.abs(a.latitud) > 90 ||
    Math.abs(b.latitud) > 90 ||
    Math.abs(a.longitud) > 180 ||
    Math.abs(b.longitud) > 180
  ) {
    return null;
  }

  const radianes = Math.PI / 180;
  const diferenciaLatitud = (b.latitud - a.latitud) * radianes;
  const diferenciaLongitud = (b.longitud - a.longitud) * radianes;
  const senoLatitud = Math.sin(diferenciaLatitud / 2);
  const senoLongitud = Math.sin(diferenciaLongitud / 2);
  const haversine = Math.min(
    1,
    senoLatitud ** 2 +
      Math.cos(a.latitud * radianes) * Math.cos(b.latitud * radianes) * senoLongitud ** 2,
  );

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
