import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { FiltroCategorias } from '@/components/FiltroCategorias';
import { Tarjeta } from '@/components/Tarjeta';
import { useSesion } from '@/estado/sesion';
import { agregarFavorito, obtenerFavoritos, quitarFavorito } from '@/servicios/favoritos';
import { obtenerCategorias } from '@/servicios/categorias';
import { obtenerLugares } from '@/servicios/lugares';
import type { Categoria } from '@/tipos/categoria';
import type { Favorito } from '@/tipos/favorito';
import type { Lugar } from '@/tipos/lugar';
import colores from '@/tema/colores';

// Centro de Colón, con zoom suficiente para ver la ciudad y el Molino Forclaz.
const REGION_COLON: Region = {
  latitude: -32.2236,
  longitude: -58.1428,
  latitudeDelta: 0.08,
  longitudeDelta: 0.12,
};

// Alturas en las que se frena el panel de lugares, como fracción de la zona
// del mapa: bajo (asoma el título y una tarjeta), medio y casi completo.
const ALTURAS_PANEL = [0.25, 0.5, 0.9];

export default function Mapa() {
  const { usuario } = useSesion();
  const queryClient = useQueryClient();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [altoZona, setAltoZona] = useState(0); // alto de la zona del mapa, para mapPadding
  const [mapaListo, setMapaListo] = useState(false);

  // El catálogo es público: se pide una vez, haya sesión o no.
  useEffect(() => {
    Promise.all([obtenerLugares(), obtenerCategorias()])
      .then(([lugaresObtenidos, categoriasObtenidas]) => {
        setLugares(lugaresObtenidos);
        setCategorias(categoriasObtenidas);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error desconocido'))
      .finally(() => setCargando(false));
  }, []);

  // Favoritos: no es estado nuestro, es una copia de lo que tiene el
  // servidor — por eso va con TanStack Query y no con useState+useEffect.
  // La clave incluye el usuario para no mostrar por un instante los
  // favoritos de otra cuenta si cambia la sesión; enabled la apaga sin
  // sesión (mirar no pide cuenta). Si falla (ej. token vencido: el cliente
  // ya cierra la sesión y abre el login), el mapa se sigue viendo, solo que
  // sin corazones marcados.
  const claveFavoritos = ['favoritos', usuario?.id] as const;
  const { data: favoritos = [] } = useQuery({
    queryKey: claveFavoritos,
    queryFn: obtenerFavoritos,
    enabled: Boolean(usuario),
    retry: 0,
  });

  // Se filtra acá y no en el servidor: el cambio es instantáneo y anda sin señal.
  const lugaresVisibles = categoriaId ? lugares.filter((lugar) => lugar.categoriaId === categoriaId) : lugares;
  const colorDe = (id: string) => categorias.find((categoria) => categoria.id === id)?.color;
  const favoritoDe = (lugarId: string) => favoritos.find((favorito) => favorito.lugarId === lugarId);

  // Actualización optimista con los tres tiempos de una mutación:
  // onMutate cambia la caché YA (el corazón reacciona al toque, no al
  // servidor), onError la vuelve al valor de antes si el pedido falla, y
  // onSettled invalida la clave para que quede exactamente como la tiene la
  // API — eso de paso refresca sola la lista de "Yo", sin que nadie se lo pida.
  const alternar = useMutation<void, Error, { lugarId: string; favoritoExistente?: Favorito }, { previos: Favorito[] }>({
    mutationFn: async ({ lugarId, favoritoExistente }) => {
      // Se descarta lo que devuelve la API (ej. el favorito recién creado,
      // con su id real): el dato de verdad lo trae el onSettled de abajo.
      if (favoritoExistente) {
        await quitarFavorito(lugarId);
      } else {
        await agregarFavorito(lugarId);
      }
    },
    onMutate: async ({ lugarId, favoritoExistente }) => {
      await queryClient.cancelQueries({ queryKey: claveFavoritos });
      const previos = queryClient.getQueryData<Favorito[]>(claveFavoritos) ?? [];
      queryClient.setQueryData<Favorito[]>(
        claveFavoritos,
        favoritoExistente
          ? previos.filter((favorito) => favorito.id !== favoritoExistente.id)
          : [
              ...previos,
              { id: `temporal-${lugarId}`, usuarioId: usuario!.id, lugarId, creadoEn: new Date().toISOString() },
            ],
      );
      return { previos };
    },
    onError: (_error, _variables, contexto) => {
      if (contexto) queryClient.setQueryData(claveFavoritos, contexto.previos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: claveFavoritos });
    },
  });

  function alternarFavorito(lugarId: string, favoritoExistente?: Favorito) {
    // Mirar no pide cuenta, guardar sí: sin sesión, el corazón lleva al login.
    if (!usuario) {
      router.push('/login');
      return;
    }
    alternar.mutate({ lugarId, favoritoExistente });
  }

  return (
    <View className="flex-1 bg-fondo">
      <FiltroCategorias categorias={categorias} seleccionada={categoriaId} onSeleccionar={setCategoriaId} />

      {/* El mapa ocupa todo lo que queda; el panel de lugares se apoya encima
          desde abajo. mapPadding corre el centro y el logo de Google para que
          no queden tapados por el panel cuando está bajo. */}
      <View className="flex-1" onLayout={(evento) => setAltoZona(evento.nativeEvent.layout.height)}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={REGION_COLON}
          onMapReady={() => setMapaListo(true)}
          // Solo después de onMapReady: antes, react-native-maps en Android se
          // cae (NullPointerException en applyBaseMapPadding) porque el mapa
          // de Google todavía no existe.
          mapPadding={mapaListo ? { top: 0, right: 0, left: 0, bottom: altoZona * ALTURAS_PANEL[0] } : undefined}
        >
          {lugaresVisibles.map((lugar) => (
            <Marker
              key={lugar.id}
              coordinate={{
                latitude: lugar.coordenadas.latitud,
                longitude: lugar.coordenadas.longitud,
              }}
              title={lugar.nombre}
              description={lugar.descripcionCorta}
              pinColor={colorDe(lugar.categoriaId)}
            />
          ))}
        </MapView>

        {/* Panel deslizable: arranca bajo (se ve el mapa grande) y se sube
            arrastrando. El mapa se muestra igual aunque falle la carga: el
            estado va dentro del panel. */}
        <BottomSheet
          snapPoints={ALTURAS_PANEL.map((altura) => `${altura * 100}%`)}
          index={0}
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: colores.superficie }}
          handleIndicatorStyle={{ backgroundColor: colores.borde, width: 48 }}
        >
          <Text className="px-5 pb-2 text-sm font-semibold uppercase text-texto-suave">
            {cargando ? 'Cargando lugares…' : `${lugaresVisibles.length} lugares`}
          </Text>
          {cargando ? (
            <ActivityIndicator size="large" className="mt-6" />
          ) : error ? (
            <Text className="px-5 pt-4 text-base text-error">{error}</Text>
          ) : (
            <BottomSheetFlatList
              data={lugaresVisibles}
              keyExtractor={(lugar: Lugar) => lugar.id}
              // Estilo y no className: NativeWind no conoce los componentes del panel.
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 20,
                paddingBottom: 24,
              }}
              ListEmptyComponent={<Text className="text-base text-texto-suave">No hay lugares en esta categoría.</Text>}
              renderItem={({ item }) => {
                const favoritoExistente = favoritoDe(item.id);
                return (
                  <Tarjeta className="flex-row items-start justify-between">
                    <View className="flex-1 gap-2">
                      <Text className="text-base font-semibold text-texto">{item.nombre}</Text>
                      <Text className="text-sm text-texto-suave">{item.descripcionCorta}</Text>
                    </View>
                    <Pressable
                      onPress={() => alternarFavorito(item.id, favoritoExistente)}
                      accessibilityRole="button"
                      accessibilityLabel={favoritoExistente ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      className="p-1"
                    >
                      <Ionicons
                        name={favoritoExistente ? 'heart' : 'heart-outline'}
                        size={22}
                        color={favoritoExistente ? colores.error : colores['texto-suave']}
                      />
                    </Pressable>
                  </Tarjeta>
                );
              }}
            />
          )}
        </BottomSheet>
      </View>
    </View>
  );
}
