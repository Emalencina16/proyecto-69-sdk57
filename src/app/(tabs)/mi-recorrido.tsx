import { useEffect, useState } from "react";
import { Text } from "react-native";

import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { obtenerVisitas } from "@/servicios/visitas";
import type { Visita } from "@/tipos/visita";

export default function MiRecorrido() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerVisitas()
      .then(setVisitas)
      .catch(() => setError("No pudimos cargar tu recorrido."))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <Pantalla>
        <Text className="text-base text-texto">Cargando tu recorrido...</Text>
      </Pantalla>
    );
  }

  if (error) {
    return (
      <Pantalla>
        <Text className="text-base text-texto">{error}</Text>
      </Pantalla>
    );
  }

  if (visitas.length === 0) {
    return (
      <Pantalla>
        <Text className="text-base text-texto">
          Todavía no registraste ninguna visita.
        </Text>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      {visitas.map((visita) => (
        <Tarjeta key={visita.id}>
          <Text className="text-sm font-semibold uppercase">
            {visita.lugarId}
          </Text>
          <Text className="text-base text-texto">
            {new Date(visita.fechaHora).toLocaleString("es-AR")}
          </Text>
          {visita.nota ? (
            <Text className="text-base text-texto">{visita.nota}</Text>
          ) : null}
          {!visita.sincronizada ? (
            <Text className="text-sm text-texto">Pendiente de subir</Text>
          ) : null}
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
