import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { FiltroCategorias } from '@/components/FiltroCategorias';
import { Tarjeta } from '@/components/Tarjeta';
import { obtenerCategorias } from '@/servicios/categorias';
import { obtenerLugares } from '@/servicios/lugares';
import type { Categoria } from '@/tipos/categoria';
import type { Lugar } from '@/tipos/lugar';
import colores from '@/tema/colores';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export default function Lugares() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
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

  const lugaresVisibles = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    return lugares.filter((lugar) => {
      const coincideCategoria = categoriaId === null || lugar.categoriaId === categoriaId;
      const coincideBusqueda =
        termino.length === 0 ||
        normalizar(`${lugar.nombre} ${lugar.descripcionCorta} ${lugar.direccion}`).includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
  }, [busqueda, categoriaId, lugares]);

  return (
    <View className="flex-1 bg-fondo">
      <FiltroCategorias categorias={categorias} seleccionada={categoriaId} onSeleccionar={setCategoriaId} />

      <View className="mx-5 mt-4 flex-row items-center gap-2 rounded-xl border border-borde bg-superficie px-4">
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

      {cargando ? (
        <ActivityIndicator size="large" className="mt-8" />
      ) : error ? (
        <Text accessibilityRole="alert" className="px-5 pt-6 text-base text-error">
          {error}
        </Text>
      ) : (
        <FlatList
          data={lugaresVisibles}
          keyExtractor={(lugar) => lugar.id}
          className="flex-1"
          contentContainerClassName="gap-3 px-5 py-5"
          ListHeaderComponent={
            <Text className="text-sm text-texto-suave">
              {lugaresVisibles.length} {lugaresVisibles.length === 1 ? 'lugar' : 'lugares'}
            </Text>
          }
          ListEmptyComponent={
            <Text className="text-base text-texto-suave">No encontramos lugares con esos filtros.</Text>
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
                {item.accesible ? <Text className="text-sm font-medium text-primario">Lugar accesible</Text> : null}
              </Tarjeta>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
