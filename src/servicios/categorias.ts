import { pedirLista } from '@/servicios/cliente';
import type { Categoria } from '@/tipos/categoria';

// La API ya las devuelve ordenadas por `orden`.
export async function obtenerCategorias(): Promise<Categoria[]> {
  return pedirLista<Categoria>('/categorias');
}
