import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Cargando } from '@/components/Cargando';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FiltroCategorias } from '@/components/FiltroCategorias';
import { Tarjeta } from '@/components/Tarjeta';
import { Titulo } from '@/components/Titulo';
import { obtenerCategorias } from '@/servicios/categorias';
import { obtenerLugares } from '@/servicios/lugares';
import { distanciaEntre } from '@/utilidades/distancia';
import type { Categoria } from '@/tipos/categoria';
import type { Coordenadas } from '@/tipos/coordenadas';
import type { Lugar } from '@/tipos/lugar';
import { useColores } from '@/tema/useColores';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export default function Lugares() {
  const colores = useColores();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([obtenerLugares(), obtenerCategorias()])
      .then(([lugaresObtenidos, categoriasObtenidas]) => {
        setLugares(lugaresObtenidos);
        setCategorias(categoriasObtenidas);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los lugares.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    let vigente = true;

    async function cargarUbicacion() {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted) {
          if (vigente) setErrorUbicacion('Permití el acceso a tu ubicación para ordenar los lugares por cercanía.');
          return;
        }

        const ubicacion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (vigente) {
          setUbicacionUsuario({
            latitud: ubicacion.coords.latitude,
            longitud: ubicacion.coords.longitude,
          });
        }
      } catch (e) {
        if (vigente) {
          setErrorUbicacion(
            e instanceof Error ? `No se pudo obtener tu ubicación: ${e.message}` : 'No se pudo obtener tu ubicación.',
          );
        }
      }
    }

    void cargarUbicacion();
    return () => {
      vigente = false;
    };
  }, []);

  const lugaresVisibles = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    const filtrados = lugares.filter((lugar) => {
      const coincideCategoria = categoriaId === null || lugar.categoriaId === categoriaId;
      const coincideBusqueda =
        termino.length === 0 ||
        normalizar(`${lugar.nombre} ${lugar.descripcionCorta} ${lugar.direccion}`).includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
    if (!ubicacionUsuario) return filtrados;

    return filtrados
      .map((lugar, indice) => ({
        lugar,
        indice,
        distancia: distanciaEntre(ubicacionUsuario, lugar.coordenadas),
      }))
      .sort((a, b) => {
        if (a.distancia === null) return b.distancia === null ? a.indice - b.indice : 1;
        if (b.distancia === null) return -1;
        return a.distancia - b.distancia || a.indice - b.indice;
      })
      .map(({ lugar }) => lugar);
  }, [busqueda, categoriaId, lugares, ubicacionUsuario]);

  return (
    <View className="flex-1 bg-fondo">
      <FiltroCategorias categorias={categorias} seleccionada={categoriaId} onSeleccionar={setCategoriaId} />

      <View className="mx-5 mt-4 flex-row items-center gap-2 rounded-control border border-borde bg-superficie px-4">
        <Ionicons name="search" size={20} color={colores['texto-suave']} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar lugares"
          placeholderTextColor={colores['texto-suave']}
          accessibilityLabel="Buscar lugares"
          returnKeyType="search"
          className="flex-1 py-3 text-base text-texto"
        />
      </View>

      {errorUbicacion ? (
        <Aviso tono="advertencia" icono="navigate-outline" className="mx-5 mt-3">
          {errorUbicacion}
        </Aviso>
      ) : null}

      {cargando ? (
        <Cargando />
      ) : error ? (
        <EstadoVacio tono="error" icono="alert-circle-outline" titulo="No pudimos cargar los lugares" mensaje={error} />
      ) : (
        <FlatList
          data={lugaresVisibles}
          keyExtractor={(lugar) => lugar.id}
          className="flex-1"
          contentContainerClassName="gap-3 px-5 py-5"
          ListHeaderComponent={
            <Titulo
              subtitulo={`${lugaresVisibles.length} ${lugaresVisibles.length === 1 ? 'lugar' : 'lugares'}${
                ubicacionUsuario ? ' · los más cercanos primero' : ''
              }`}
            >
              Lugares
            </Titulo>
          }
          ListEmptyComponent={
            <EstadoVacio
              icono="search-outline"
              titulo="No encontramos lugares"
              mensaje="Probá con otra búsqueda o sacá algún filtro."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${item.nombre}`}
              onPress={() => router.push({ pathname: '/lugar/[id]', params: { id: item.id } })}
            >
              <Tarjeta>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-base font-semibold text-texto">{item.nombre}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colores['texto-suave']} />
                </View>
                <Text className="text-sm text-texto-suave">{item.descripcionCorta}</Text>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="location-outline" size={16} color={colores['texto-suave']} />
                  <Text className="flex-1 text-sm text-texto-suave">{item.direccion}</Text>
                </View>
                {item.accesible ? (
                  <View className="flex-row items-center gap-1.5 self-start rounded-full bg-exito-claro px-2.5 py-1">
                    <Ionicons name="accessibility-outline" size={16} color={colores.exito} />
                    <Text className="text-sm font-medium text-exito">Accesible</Text>
                  </View>
                ) : null}
              </Tarjeta>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
