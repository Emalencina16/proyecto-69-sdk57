import type { Coordenadas } from '@/tipos/coordenadas';

export type EstadoEvento = 'programado' | 'suspendido' | 'cancelado' | 'finalizado';

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  lugarId: string | null;
  direccionLibre: string | null;
  coordenadas: Coordenadas | null; // sólo si no hay lugarId
  inicio: string;
  fin: string | null;
  imagenUrl: string | null;
  precio: number | null;
  estado: EstadoEvento;
}
