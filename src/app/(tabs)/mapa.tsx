import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { Cargando } from '@/components/Cargando';
import { EstadoVacio } from '@/components/EstadoVacio';
import { EtiquetaSeccion } from '@/components/EtiquetaSeccion';
import { FiltroCategorias } from '@/components/FiltroCategorias';
import { Tarjeta } from '@/components/Tarjeta';
import { useSesion } from '@/estado/sesion';
import { agregarFavorito, obtenerFavoritos, quitarFavorito } from '@/servicios/favoritos';
import { obtenerCategorias } from '@/servicios/categorias';
import { obtenerLugares } from '@/servicios/lugares';
import type { Categoria } from '@/tipos/categoria';
import type { Favorito } from '@/tipos/favorito';
import type { Lugar } from '@/tipos/lugar';
import { ESTILO_MAPA_OSCURO } from '@/tema/estiloMapaOscuro';
import { useColores, useEsOscuro } from '@/tema/useColores';
import radios from '@/tema/radios';

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
  const colores = useColores();
  const esOscuro = useEsOscuro();
  const { usuario } = useSesion();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
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

  // Los favoritos van aparte y se vuelven a pedir al ingresar o salir. Si
  // fallan (ej. token vencido: el cliente ya cierra la sesión y abre el
  // login), el mapa se sigue viendo, solo que sin corazones marcados.
  useEffect(() => {
    if (!usuario) {
      setFavoritos([]);
      return;
    }
    obtenerFavoritos()
      .then(setFavoritos)
      .catch(() => setFavoritos([]));
  }, [usuario]);

  // Se filtra acá y no en el servidor: el cambio es instantáneo y anda sin señal.
  const lugaresVisibles = categoriaId ? lugares.filter((lugar) => lugar.categoriaId === categoriaId) : lugares;
  const categoriaDe = (id: string) => categorias.find((categoria) => categoria.id === id);
  const verDetalle = (lugarId: string) => router.push({ pathname: '/lugar/[id]', params: { id: lugarId } });
  const favoritoDe = (lugarId: string) => favoritos.find((favorito) => favorito.lugarId === lugarId);

  async function alternarFavorito(lugarId: string) {
    // Mirar no pide cuenta, guardar sí: sin sesión, el corazón lleva al login.
    if (!usuario) {
      router.push('/login');
      return;
    }
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

      {/* El mapa ocupa todo lo que queda; el panel de lugares se apoya encima
          desde abajo. mapPadding corre el centro y el logo de Google para que
          no queden tapados por el panel cuando está bajo. */}
      <View className="flex-1" onLayout={(evento) => setAltoZona(evento.nativeEvent.layout.height)}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={REGION_COLON}
          // Android (Google) usa el estilo; iOS (Apple Maps) sigue el tema solo.
          customMapStyle={esOscuro ? ESTILO_MAPA_OSCURO : []}
          userInterfaceStyle={esOscuro ? 'dark' : 'light'}
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
              pinColor={categoriaDe(lugar.categoriaId)?.color}
              // Tocar el globito del marcador abre el detalle, igual que la tarjeta.
              onCalloutPress={() => verDetalle(lugar.id)}
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
          backgroundStyle={{
            backgroundColor: colores.superficie,
            borderTopLeftRadius: radios.hoja,
            borderTopRightRadius: radios.hoja,
          }}
          handleIndicatorStyle={{ backgroundColor: colores.borde, width: 48 }}
        >
          <EtiquetaSeccion className="px-5 pb-2">
            {cargando ? 'Cargando lugares…' : `${lugaresVisibles.length} lugares`}
          </EtiquetaSeccion>
          {cargando ? (
            <Cargando />
          ) : error ? (
            <EstadoVacio tono="error" icono="alert-circle-outline" titulo="No pudimos cargar los lugares" mensaje={error} />
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
              ListEmptyComponent={<EstadoVacio icono="location-outline" titulo="No hay lugares en esta categoría" />}
              renderItem={({ item }) => {
                const esFavorito = Boolean(favoritoDe(item.id));
                const categoria = categoriaDe(item.categoriaId);
                return (
                  <Tarjeta className="flex-row items-center gap-1 py-2 pr-1">
                    {/* Toda la tarjeta abre el detalle, menos el corazón. */}
                    <Pressable
                      onPress={() => verDetalle(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver detalle de ${item.nombre}`}
                      className="flex-1 gap-1 py-2 active:opacity-70"
                    >
                      <Text className="text-base font-semibold text-texto">{item.nombre}</Text>
                      <Text className="text-sm text-texto-suave" numberOfLines={2}>
                        {item.descripcionCorta}
                      </Text>
                      {categoria ? (
                        <View className="flex-row items-center gap-2 pt-1">
                          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoria.color }} />
                          <Text className="text-sm text-texto-suave">{categoria.nombre}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                    {/* 48 px de área táctil, como el resto de la app (una mano y al sol). */}
                    <Pressable
                      onPress={() => alternarFavorito(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={esFavorito ? `Quitar ${item.nombre} de favoritos` : `Guardar ${item.nombre} en favoritos`}
                      accessibilityState={{ selected: esFavorito }}
                      className="h-12 w-12 items-center justify-center rounded-full active:bg-acento-claro"
                    >
                      <Ionicons
                        name={esFavorito ? 'heart' : 'heart-outline'}
                        size={26}
                        color={esFavorito ? colores.acento : colores['texto-suave']}
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
