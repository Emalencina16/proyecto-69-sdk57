import { pedirLista } from '@/servicios/cliente';
import type { Evento } from '@/tipos/evento';

export async function obtenerEventos(): Promise<Evento[]> {
  return pedirLista<Evento>('/eventos');
}
