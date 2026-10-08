import { API_URL } from '@/config/api';
import { errorDeRed, errorDeServidor } from '@/servicios/errores';
import type { Evento } from '@/tipos/evento';

export async function obtenerEventos(): Promise<Evento[]> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/eventos`);
  } catch {
    throw errorDeRed();
  }

  if (!respuesta.ok) throw errorDeServidor();

  const eventos: Evento[] = await respuesta.json();
  return eventos;
}

