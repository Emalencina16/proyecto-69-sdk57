import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReproductorAudioguia } from '@/components/ReproductorAudioguia';
import { Tarjeta } from '@/components/Tarjeta';
import { obtenerCategorias } from '@/servicios/categorias';
import { agregarImagenLugar, obtenerLugar } from '@/servicios/lugares';
import { useSesion } from '@/estado/sesion';
import type { Categoria } from '@/tipos/categoria';
import type { Lugar as LugarTipo } from '@/tipos/lugar';
import colores from '@/tema/colores';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useSesion();
  const [resultado, setResultado] = useState<{
    id: string;
    lugar: LugarTipo | null;
    categorias: Categoria[];
    error: string | null;
  } | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerLugar(id), obtenerCategorias()])
      .then(([lugarObtenido, categoriasObtenidas]) => {
        if (!vigente) return;
        setResultado({ id, lugar: lugarObtenido, categorias: categoriasObtenidas, error: null });
      })
      .catch((e) => {
        if (vigente) {
          setResultado({
            id,
            lugar: null,
            categorias: [],
            error: e instanceof Error ? e.message : 'No se pudo cargar el lugar.',
          });
        }
      });

    return () => {
      vigente = false;
    };
  }, [id]);

  const cargando = resultado?.id !== id;
  const lugar = resultado?.id === id ? resultado.lugar : null;
  const categorias = resultado?.id === id ? resultado.categorias : [];
  const error = resultado?.id === id ? resultado.error : null;
  const categoria = categorias.find((actual) => actual.id === lugar?.categoriaId);

  async function seleccionarFoto(origen: 'camara' | 'galeria') {
    if (!usuario) {
      router.push('/login');
      return;
    }

    setErrorImagen(null);
    try {
      if (origen === 'camara') {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
          setErrorImagen('Necesitamos permiso para usar la cámara.');
          return;
        }
      } else {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
          setErrorImagen('Necesitamos permiso para acceder a tus fotos.');
          return;
        }
      }

      const resultadoPicker =
        origen === 'camara'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.85,
            });
      if (resultadoPicker.canceled || !resultadoPicker.assets[0]) return;

      setSubiendoImagen(true);
      const lugarActualizado = await agregarImagenLugar(id, resultadoPicker.assets[0].uri);
      setResultado((actual) =>
        actual?.id === id ? { ...actual, lugar: lugarActualizado, error: null } : actual,
      );
    } catch (e) {
      setErrorImagen(e instanceof Error ? e.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendoImagen(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-fondo" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-borde bg-superficie px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a lugares"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/lugares'))}
          className="min-h-11 min-w-11 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color={colores.texto} />
        </Pressable>
        <Text className="text-lg font-bold text-texto">Detalle del lugar</Text>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" className="mt-8" />
      ) : error || !lugar ? (
        <Text accessibilityRole="alert" className="px-5 pt-6 text-base text-error">
          {error ?? 'No se encontró el lugar.'}
        </Text>
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-5 py-5">
          <Text className="text-2xl font-bold text-texto">{lugar.nombre}</Text>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-texto">Fotos</Text>
              <Text className="text-xs text-texto-suave">Las fotos subidas serán públicas</Text>
            </View>
            <View className="flex-row gap-2">
              <AccionFoto
                icono="images-outline"
                titulo="Elegir foto"
                deshabilitada={subiendoImagen}
                onPress={() => seleccionarFoto('galeria')}
              />
              <AccionFoto
                icono="camera-outline"
                titulo="Tomar foto"
                deshabilitada={subiendoImagen}
                onPress={() => seleccionarFoto('camara')}
              />
            </View>
            {subiendoImagen ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={colores.primario} />
                <Text className="text-sm text-texto-suave">Subiendo foto...</Text>
              </View>
            ) : null}
            {errorImagen ? (
              <Text accessibilityRole="alert" className="text-sm text-error">
                {errorImagen}
              </Text>
            ) : null}
            {lugar.imagenes.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {lugar.imagenes.map((imagen, indice) => (
                  <FotoLugar
                    key={`${lugar.id}-${imagen}`}
                    uri={imagen}
                    etiqueta={`Imagen ${indice + 1} de ${lugar.nombre}`}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text className="text-sm text-texto-suave">Este lugar no tiene imágenes cargadas.</Text>
            )}
          </View>

          <Text className="text-base leading-6 text-texto">{lugar.descripcion}</Text>
          {categoria ? <DatoDetalle etiqueta="Categoría" valor={categoria.nombre} /> : null}
          <DatoDetalle etiqueta="Dirección" valor={lugar.direccion} />
          <DatoDetalle
            etiqueta="Entrada"
            valor={
              lugar.precioEntrada === null
                ? 'Sin precio informado'
                : lugar.precioEntrada === 0
                  ? 'Gratis'
                  : `$${lugar.precioEntrada}`
            }
          />
          <DatoDetalle etiqueta="Teléfono" valor={lugar.telefono ?? 'No informado'} />
          <DatoDetalle etiqueta="Sitio web" valor={lugar.sitioWeb ?? 'No informado'} />
          <DatoDetalle
            etiqueta="Accesibilidad"
            valor={lugar.accesible ? 'Accesible' : 'No informado como accesible'}
          />
          <Tarjeta>
            <Text className="text-base font-semibold text-texto">Horarios</Text>
            {lugar.horarios.length > 0 ? (
              lugar.horarios.map((horario, indice) => (
                <Text key={`${horario.dia}-${horario.abre}-${indice}`} className="text-sm text-texto-suave">
                  {DIAS[horario.dia]}: {horario.abre}–{horario.cierra}
                </Text>
              ))
            ) : (
              <Text className="text-sm text-texto-suave">No informados</Text>
            )}
          </Tarjeta>
          {lugar.codigoQr ? <DatoDetalle etiqueta="Código QR" valor={lugar.codigoQr} /> : null}
          <ReproductorAudioguia lugar={lugar} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function AccionFoto({
  icono,
  titulo,
  deshabilitada,
  onPress,
}: {
  icono: 'images-outline' | 'camera-outline';
  titulo: string;
  deshabilitada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={deshabilitada}
      className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-borde bg-superficie px-3 active:opacity-80"
    >
      <Ionicons name={icono} size={18} color={colores.primario} />
      <Text className="text-sm font-semibold text-texto">{titulo}</Text>
    </Pressable>
  );
}

function FotoLugar({ uri, etiqueta }: { uri: string; etiqueta: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View className="h-56 w-80 items-center justify-center rounded-xl border border-borde bg-superficie px-4">
        <Text className="text-center text-sm text-texto-suave">No se pudo cargar esta imagen.</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      accessibilityLabel={etiqueta}
      onError={() => setError(true)}
      className="h-56 w-80 rounded-xl bg-superficie"
    />
  );
}

function DatoDetalle({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="gap-0.5">
      <Text className="text-sm font-semibold text-texto">{etiqueta}</Text>
      <Text className="text-sm text-texto-suave">{valor}</Text>
    </View>
  );
}
