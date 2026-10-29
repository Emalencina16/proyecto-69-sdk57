import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Text } from 'react-native';

import { Boton } from '@/components/Boton';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { useSesion } from '@/estado/sesion';
import { obtenerLugaresFavoritos } from '@/servicios/favoritos';

export default function Yo() {
  const sesion = useSesion();

  // Antes hacía falta useFocusEffect porque expo-router no desmonta las
  // tabs: un useEffect normal solo pedía la lista la primera vez que se
  // visitaba esta pantalla, y no se enteraba si se marcaba un favorito en
  // Mapa. Con TanStack Query no hace falta acordarse de refrescar nada:
  // ['favoritos', usuario.id, ...] comparte el mismo prefijo de clave que
  // usa mapa.tsx, así que cuando esa pantalla invalida ['favoritos',
  // usuario.id] tras una mutación, esta consulta se entera y se vuelve a
  // pedir sola, esté o no en foco.
  const {
    data: favoritos = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ['favoritos', sesion.usuario?.id, 'lugares'],
    queryFn: obtenerLugaresFavoritos,
    enabled: Boolean(sesion.usuario),
  });

  // Al cerrar sesión se queda en Yo, que pasa a mostrar el botón de ingresar.
  function cerrarSesion() {
    sesion.cerrar();
  }

  if (!sesion.usuario) {
    return (
      <Pantalla>
        <Tarjeta>
          <Text className="text-base text-texto">
            No hace falta una cuenta para mirar. Ingresá para guardar tus lugares favoritos y tu recorrido.
          </Text>
        </Tarjeta>
        <Boton titulo="Ingresar" onPress={() => router.push('/login')} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Tarjeta>
        <Text className="text-sm font-semibold uppercase text-texto-suave">Usuario</Text>
        <Text className="text-base text-texto">{sesion.usuario.nombre}</Text>
      </Tarjeta>

      <Text className="text-sm font-semibold uppercase text-texto-suave">Favoritos</Text>

      {isPending ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text className="text-base text-error">{error.message}</Text>
      ) : (
        <FlatList
          data={favoritos}
          keyExtractor={(lugar) => lugar.id}
          contentContainerClassName="gap-3"
          ListEmptyComponent={
            <Text className="text-base text-texto-suave">Todavía no marcaste ningún lugar como favorito.</Text>
          }
          renderItem={({ item }) => (
            <Tarjeta>
              <Text className="text-base font-semibold text-texto">{item.nombre}</Text>
              <Text className="text-sm text-texto-suave">{item.descripcionCorta}</Text>
            </Tarjeta>
          )}
        />
      )}

      <Boton titulo="Cerrar sesión" variante="secundario" onPress={cerrarSesion} />
    </Pantalla>
  );
}
