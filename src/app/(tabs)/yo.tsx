import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Switch, Text } from 'react-native';

import { Boton } from '@/components/Boton';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { useSesion } from '@/estado/sesion';
import { obtenerLugaresFavoritos } from '@/servicios/favoritos';
import { huellaDisponible } from '@/servicios/huella';
import colores from '@/tema/colores';

export default function Yo() {
  const sesion = useSesion();

  const {
    data: favoritos = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ['favoritos', sesion.usuario?.id, 'lugares'],
    queryFn: obtenerLugaresFavoritos,
    enabled: Boolean(sesion.usuario),
  });

  // La opción de huella solo se ofrece si el teléfono tiene una registrada.
  const [hayHuella, setHayHuella] = useState(false);
  useEffect(() => {
    huellaDisponible().then(setHayHuella);
  }, []);

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
        {/* Canceló la huella al abrir: la sesión sigue guardada y puede reintentar. */}
        {sesion.bloqueada && <Boton titulo="Entrar con huella" onPress={sesion.desbloquear} />}
        <Boton
          titulo={sesion.bloqueada ? 'Ingresar con email' : 'Ingresar'}
          variante={sesion.bloqueada ? 'secundario' : 'primario'}
          onPress={() => router.push('/login')}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Tarjeta>
        <Text className="text-sm font-semibold uppercase text-texto-suave">Usuario</Text>
        <Text className="text-base text-texto">{sesion.usuario.nombre}</Text>
      </Tarjeta>

      {hayHuella && (
        <Tarjeta className="flex-row items-center justify-between">
          <Text className="flex-1 text-base text-texto">Pedir huella al abrir la app</Text>
          <Switch
            value={sesion.pideHuella}
            onValueChange={(pide) => {
              sesion.cambiarPideHuella(pide);
            }}
            trackColor={{ true: colores.primario }}
            accessibilityLabel="Pedir huella al abrir la app"
          />
        </Tarjeta>
      )}

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
