import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { ReproductorAudioguia } from '@/components/ReproductorAudioguia';
import { Tarjeta } from '@/components/Tarjeta';
import { obtenerCategorias } from '@/servicios/categorias';
import { distanciaEntre } from '@/utilidades/distancia';
import { obtenerLugar } from '@/servicios/lugares';
import type { Categoria } from '@/tipos/categoria';
import type { Coordenadas } from '@/tipos/coordenadas';
import type { Lugar as LugarTipo } from '@/tipos/lugar';
import colores from '@/tema/colores';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    id: string;
    lugar: LugarTipo | null;
    categorias: Categoria[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let vigente = true;

    async function cargarUbicacion() {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted) {
          if (vigente) setErrorUbicacion('Permití el acceso a tu ubicación para ver la distancia.');
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
      } finally {
        if (vigente) setCargandoUbicacion(false);
      }
    }

    void cargarUbicacion();
    return () => {
      vigente = false;
    };
  }, []);

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
  const distanciaLugar = lugar && ubicacionUsuario ? distanciaEntre(ubicacionUsuario, lugar.coordenadas) : null;
  const textoDistancia =
    distanciaLugar === null
      ? cargandoUbicacion
        ? 'Calculando distancia…'
        : 'No disponible'
      : distanciaLugar < 1000
        ? `${Math.round(distanciaLugar)} m`
        : `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(distanciaLugar / 1000)} km`;

  return (
    <View className="flex-1 bg-fondo">
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
            {lugar.imagenes.length > 0 ? <Text className="text-base font-semibold text-texto">Fotos</Text> : null}
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
              <Text className="text-sm text-texto-suave">Este lugar no tiene fotos disponibles.</Text>
            )}
          </View>

          <Text className="text-base leading-6 text-texto">{lugar.descripcion}</Text>
          {categoria ? <DatoDetalle etiqueta="Categoría" valor={categoria.nombre} /> : null}
          <DatoDetalle etiqueta="Dirección" valor={lugar.direccion} />
          <DatoDetalle etiqueta="Distancia aproximada" valor={textoDistancia} />
          {errorUbicacion ? (
            <Text accessibilityRole="alert" className="text-sm text-error">
              {errorUbicacion}
            </Text>
          ) : null}
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
    </View>
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
      style={{ height: 224, width: 320, borderRadius: 12, backgroundColor: colores.superficie }}
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
