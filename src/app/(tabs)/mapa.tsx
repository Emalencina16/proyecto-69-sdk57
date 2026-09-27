import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { obtenerLugares } from '@/servicios/lugares';
import type { Lugar } from '@/tipos/lugar';

// Por ahora es una lista para probar el servicio de lugares contra la mock API.
// Después se reemplaza por el mapa (react-native-maps) con un marcador por lugar.
export default function Mapa() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerLugares()
      .then(setLugares)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error desconocido'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <Pantalla className="items-center justify-center">
        <ActivityIndicator size="large" />
      </Pantalla>
    );
  }

  if (error) {
    return (
      <Pantalla>
        <Text className="text-base text-error">{error}</Text>
      </Pantalla>
    );
  }

  return (
    <Pantalla className="pt-0">
      <FlatList
        data={lugares}
        keyExtractor={(lugar) => lugar.id}
        contentContainerClassName="gap-3 py-6"
        ListEmptyComponent={<Text className="text-base text-texto-suave">No hay lugares.</Text>}
        renderItem={({ item }) => (
          <Tarjeta>
            <Text className="text-base font-semibold text-texto">{item.nombre}</Text>
            <Text className="text-sm text-texto-suave">{item.descripcionCorta}</Text>
          </Tarjeta>
        )}
      />
    </Pantalla>
  );
}
