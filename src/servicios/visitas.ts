import { visitasMock } from "@/mocks/visitas";
import type { Visita } from "@/tipos/visita";

// Hoy devuelve los datos de prueba de src/mocks/visitas.ts.
// Más adelante se reemplaza por la base local del teléfono (SQLite) y la API.
// Es async desde el primer día, así las pantallas no cambian después.

const visitas: Visita[] = [...visitasMock];

export async function obtenerVisitas(): Promise<Visita[]> {
  // Recorrido en orden: de la visita más antigua a la más nueva.
  return [...visitas].sort(
    (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
  );
}
