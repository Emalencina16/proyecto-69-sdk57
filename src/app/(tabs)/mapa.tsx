import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function Mapa() {
  const { usuario } = useSesion();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([obtenerLugares(), obtenerCategorias(), usuario ? obtenerFavoritos() : []])
      .then(([lugaresObtenidos, categoriasObtenidas, favoritosObtenidos]) => {
        setLugares(lugaresObtenidos);
        setCategorias(categoriasObtenidas);
        setFavoritos(favoritosObtenidos);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error desconocido'))
      .finally(() => setCargando(false));
  }, [usuario]);

  // Se filtra acá y no en el servidor: el cambio es instantáneo y anda sin señal.
  const lugaresVisibles = categoriaId ? lugares.filter((lugar) => lugar.categoriaId === categoriaId) : lugares;
  const colorDe = (id: string) => categorias.find((categoria) => categoria.id === id)?.color;
  const favoritoDe = (lugarId: string) => favoritos.find((favorito) => favorito.lugarId === lugarId);

  async function alternarFavorito(lugarId: string) {
    if (!usuario) return;
    const favoritoExistente = favoritoDe(lugarId);

    // Al quitar, optimista: el corazón se apaga antes de que vuelva el
    // servidor, y si el pedido falla se vuelve a prender.
    if (favoritoExistente) {
      setFavoritos((actuales) => actuales.filter((favorito) => favorito.id !== favoritoExistente.id));
      try {
        await quitarFavorito(lugarId);
      } catch {
        setFavoritos((actuales) => [...actuales, favoritoExistente]);
      }
    } else {
      try {
        const favoritoNuevo = await agregarFavorito(lugarId);
        setFavoritos((actuales) => [...actuales, favoritoNuevo]);
      } catch {
        // Sin señal o error de la API: el corazón queda como estaba.
      }
    }
  }

  return (
    <View className="flex-1 bg-fondo">
      <FiltroCategorias categorias={categorias} seleccionada={categoriaId} onSeleccionar={setCategoriaId} />

      <View className="h-72 shrink-0 border-b border-borde">
        <MapView style={StyleSheet.absoluteFill} initialRegion={REGION_COLON}>
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
      </View>

      {/* El mapa se muestra igual aunque falle la carga: el estado va acá abajo. */}
      {cargando ? (
        <ActivityIndicator size="large" className="mt-6" />
      ) : error ? (
        <Text className="px-5 pt-6 text-base text-error">{error}</Text>
      ) : (
        <FlatList
          data={lugaresVisibles}
          keyExtractor={(lugar) => lugar.id}
          className="flex-1"
          contentContainerClassName="gap-3 px-5 py-6"
          ListEmptyComponent={
            <Text className="text-base text-texto-suave">No hay lugares en esta categoría.</Text>
          }
          renderItem={({ item }) => {
            const esFavorito = Boolean(favoritoDe(item.id));
            return (
              <Tarjeta className="flex-row items-start justify-between">
                <View className="flex-1 gap-2">
                  <Text className="text-base font-semibold text-texto">{item.nombre}</Text>
                  <Text className="text-sm text-texto-suave">{item.descripcionCorta}</Text>
                </View>
                <Pressable
                  onPress={() => alternarFavorito(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  className="p-1"
                >
                  <Ionicons
                    name={esFavorito ? 'heart' : 'heart-outline'}
                    size={22}
                    color={esFavorito ? colores.error : colores['texto-suave']}
                  />
                </Pressable>
              </Tarjeta>
            );
          }}
        />
      )}
    </View>
  );
}
