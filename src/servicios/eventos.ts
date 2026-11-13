import { pedir, pedirLista, pedirUno } from '@/servicios/cliente';
import type { Evento } from '@/tipos/evento';

const EVENTOS_GUARDADOS_POR_PAGINA = 100;

export async function obtenerEventos(): Promise<Evento[]> {
  return pedirLista<Evento>('/eventos');
}

export async function obtenerEvento(id: string): Promise<Evento> {
  return pedirUno<Evento>(`/eventos/${encodeURIComponent(id)}`);
}

export async function obtenerEventosGuardados(): Promise<Evento[]> {
  return pedirLista<Evento>(`/yo/eventos-guardados?porPagina=${EVENTOS_GUARDADOS_POR_PAGINA}`);
}

export async function guardarEvento(eventoId: string): Promise<Evento> {
  return pedirUno<Evento>(`/yo/eventos-guardados/${encodeURIComponent(eventoId)}`, {
    method: 'PUT',
  });
}

export async function quitarEventoGuardado(eventoId: string): Promise<void> {
  await pedir(`/yo/eventos-guardados/${encodeURIComponent(eventoId)}`, { method: 'DELETE' });
}
