import { pedirLista } from "@/servicios/cliente";
import type { Visita } from "@/tipos/visita";

// Visitas de quien tiene la sesión (el usuario sale del token). La API ya las
// devuelve en orden de recorrido: de la más antigua a la más nueva.

// Por defecto la API pagina de a 20; para visitas admite hasta 500.
const VISITAS_POR_PAGINA = 500;

export async function obtenerVisitas(): Promise<Visita[]> {
  return pedirLista<Visita>(`/yo/visitas?porPagina=${VISITAS_POR_PAGINA}`);
}
