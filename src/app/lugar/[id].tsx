import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import * as WebBrowser from 'expo-web-browser';
import { Linking, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { type NombreIcono } from '@/components/Boton';
import { Cargando } from '@/components/Cargando';
import { Chip } from '@/components/Chip';
import { EstadoVacio } from '@/components/EstadoVacio';
import { ReproductorAudioguia } from '@/components/ReproductorAudioguia';
import { EtiquetaSeccion } from '@/components/EtiquetaSeccion';
import { FilaAccion } from '@/components/FilaAccion';
import { Tarjeta } from '@/components/Tarjeta';
import { obtenerCategorias } from '@/servicios/categorias';
import { distanciaEntre, formatearDistancia } from '@/utilidades/distancia';
import { obtenerLugar } from '@/servicios/lugares';
import type { Categoria } from '@/tipos/categoria';
import type { Coordenadas } from '@/tipos/coordenadas';
import type { Horario, Lugar as LugarTipo } from '@/tipos/lugar';
import { useColores } from '@/tema/useColores';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// La semana se muestra de lunes a domingo.
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0] as const;
const ALTO_PORTADA = 240;

const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

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
  const textoDistancia = distanciaLugar === null ? null : formatearDistancia(distanciaLugar);

  return (
    <View className="flex-1 bg-fondo">
      {cargando ? (
        <Cargando />
      ) : error || !lugar ? (
        <EstadoVacio
          tono="error"
          icono="alert-circle-outline"
          titulo="No pudimos abrir este lugar"
          mensaje={error ?? 'No se encontró el lugar.'}
        />
      ) : (
        <ScrollView contentContainerClassName="pb-8">
          <Portada lugar={lugar} icono={categoria?.icono} />

          <View className="gap-5 px-5 pt-5">
            <View className="gap-2">
              {categoria ? (
                <View className="flex-row items-center gap-2">
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoria.color }} />
                  <Text className="text-sm font-semibold uppercase tracking-wide text-texto-suave">
                    {categoria.nombre}
                  </Text>
                </View>
              ) : null}
              <Text accessibilityRole="header" className="text-3xl font-bold text-texto">
                {lugar.nombre}
              </Text>
            </View>

            {/* Lo que se decide de un vistazo; solo lo que está informado. */}
            <View className="flex-row flex-wrap gap-2">
              <EstadoHorario horarios={lugar.horarios} />
              {textoDistancia ? <Chip icono="navigate-outline" texto={textoDistancia} /> : null}
              {cargandoUbicacion && !textoDistancia ? <Chip icono="navigate-outline" texto="Calculando…" /> : null}
              {lugar.precioEntrada === 0 ? <Chip icono="ticket-outline" texto="Entrada gratis" tono="exito" /> : null}
              {lugar.precioEntrada ? (
                <Chip icono="ticket-outline" texto={`Entrada ${formatoPrecio.format(lugar.precioEntrada)}`} />
              ) : null}
              {lugar.accesible ? <Chip icono="accessibility-outline" texto="Accesible" tono="exito" /> : null}
            </View>
            {errorUbicacion ? (
              <Text className="-mt-3 text-sm text-texto-suave">{errorUbicacion}</Text>
            ) : null}

            <ReproductorAudioguia lugar={lugar} />

            <Text className="text-base leading-6 text-texto">{lugar.descripcion}</Text>

            <View className="gap-2">
              <EtiquetaSeccion>Cómo llegar y contacto</EtiquetaSeccion>
              <Tarjeta relleno={false}>
                <FilaAccion
                  icono="location-outline"
                  texto={lugar.direccion}
                  accion="Cómo llegar"
                  onPress={() => abrirComoLlegar(lugar)}
                />
                {lugar.telefono ? (
                  <FilaAccion
                    icono="call-outline"
                    texto={lugar.telefono}
                    accion="Llamar"
                    onPress={() => Linking.openURL(`tel:${lugar.telefono!.replace(/[^\d+]/g, '')}`)}
                    separador
                  />
                ) : null}
                {lugar.sitioWeb ? (
                  <FilaAccion
                    icono="globe-outline"
                    texto={lugar.sitioWeb.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    accion="Abrir"
                    onPress={() => WebBrowser.openBrowserAsync(conProtocolo(lugar.sitioWeb!))}
                    separador
                  />
                ) : null}
              </Tarjeta>
            </View>

            {lugar.horarios.length > 0 ? (
              <View className="gap-2">
                <EtiquetaSeccion>Horarios</EtiquetaSeccion>
                <Tarjeta>
                  <TablaHorarios horarios={lugar.horarios} />
                </Tarjeta>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function conProtocolo(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

// Abre Google Maps (app o web) con el recorrido hasta el lugar.
function abrirComoLlegar(lugar: LugarTipo) {
  const { latitud, longitud } = lugar.coordenadas;
  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`);
}

// Portada a todo el ancho; con varias fotos se pasan deslizando.
function Portada({ lugar, icono }: { lugar: LugarTipo; icono?: string }) {
  const colores = useColores();
  const { width } = useWindowDimensions();
  const [actual, setActual] = useState(0);

  if (lugar.imagenes.length === 0) {
    return (
      <View
        style={{ height: ALTO_PORTADA * 0.6 }}
        className="items-center justify-center bg-primario-claro"
      >
        <Ionicons
          name={(icono as NombreIcono | undefined) ?? 'image-outline'}
          size={56}
          color={colores.primario}
        />
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActual(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {lugar.imagenes.map((imagen, indice) => (
          <FotoLugar
            key={`${lugar.id}-${imagen}`}
            uri={imagen}
            ancho={width}
            etiqueta={`Foto ${indice + 1} de ${lugar.imagenes.length} de ${lugar.nombre}`}
          />
        ))}
      </ScrollView>
      {lugar.imagenes.length > 1 ? (
        <View className="absolute bottom-3 right-3 rounded-full bg-primario-oscuro/70 px-3 py-1">
          <Text className="text-sm font-semibold text-white">
            {actual + 1} / {lugar.imagenes.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FotoLugar({ uri, ancho, etiqueta }: { uri: string; ancho: number; etiqueta: string }) {
  const colores = useColores();
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View
        style={{ width: ancho, height: ALTO_PORTADA }}
        className="items-center justify-center gap-2 bg-primario-claro"
      >
        <Ionicons name="image-outline" size={40} color={colores['texto-suave']} />
        <Text className="text-sm text-texto-suave">No se pudo cargar la foto.</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      accessibilityLabel={etiqueta}
      onError={() => setError(true)}
      style={{ width: ancho, height: ALTO_PORTADA, backgroundColor: colores['primario-claro'] }}
    />
  );
}

function aMinutos(hora: string) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ¿Está abierto en este momento? Contempla franjas que pasan la medianoche
// (ej. 20:00–02:00 del día anterior). null si hoy no hay horario cargado.
function abiertoAhora(horarios: Horario[], ahora = new Date()): boolean | null {
  const hoy = ahora.getDay();
  const ayer = (hoy + 6) % 7;
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();

  const deHoy = horarios.filter((h) => h.dia === hoy);
  const trasnoche = horarios.filter((h) => h.dia === ayer && aMinutos(h.cierra) <= aMinutos(h.abre));
  if (deHoy.length === 0 && trasnoche.length === 0) return null;

  const abiertoHoy = deHoy.some((h) => {
    const abre = aMinutos(h.abre);
    const cierra = aMinutos(h.cierra);
    return cierra > abre ? minutos >= abre && minutos < cierra : minutos >= abre;
  });
  const abiertoDesdeAyer = trasnoche.some((h) => minutos < aMinutos(h.cierra));
  return abiertoHoy || abiertoDesdeAyer;
}

function EstadoHorario({ horarios }: { horarios: Horario[] }) {
  const abierto = abiertoAhora(horarios);
  if (abierto === null) return null;
  return abierto ? (
    <Chip icono="time-outline" texto="Abierto ahora" tono="exito" />
  ) : (
    <Chip icono="time-outline" texto="Cerrado ahora" />
  );
}

// Un renglón por día (con todas sus franjas), de lunes a domingo; hoy en negrita.
function TablaHorarios({ horarios }: { horarios: Horario[] }) {
  const hoy = new Date().getDay();
  const dias = ORDEN_DIAS.filter((dia) => horarios.some((h) => h.dia === dia));

  return (
    <View className="gap-2">
      {dias.map((dia) => {
        const franjas = horarios
          .filter((h) => h.dia === dia)
          .sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre))
          .map((h) => `${h.abre}–${h.cierra}`)
          .join(' · ');
        const esHoy = dia === hoy;
        return (
          <View key={dia} className="flex-row gap-3">
            <Text className={`w-36 text-base ${esHoy ? 'font-bold text-texto' : 'text-texto-suave'}`}>
              {DIAS[dia]}
              {esHoy ? ' (hoy)' : ''}
            </Text>
            <Text className={`flex-1 text-base ${esHoy ? 'font-bold text-texto' : 'text-texto'}`}>{franjas}</Text>
          </View>
        );
      })}
    </View>
  );
}
