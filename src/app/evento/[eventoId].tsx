import { Aviso } from '@/components/Aviso';
import { Cargando } from '@/components/Cargando';
import { Chip } from '@/components/Chip';
import { EstadoVacio } from '@/components/EstadoVacio';
import { EtiquetaSeccion } from '@/components/EtiquetaSeccion';
import { FilaAccion } from '@/components/FilaAccion';
import { Tarjeta } from '@/components/Tarjeta';
import { cancelarAvisoEvento } from '@/servicios/avisosEventos';
import { obtenerEvento } from '@/servicios/eventos';
import { obtenerLugar } from '@/servicios/lugares';
import type { EstadoEvento, Evento } from '@/tipos/evento';
import type { Lugar } from '@/tipos/lugar';
import { useColores } from '@/tema/useColores';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';

// Solo se avisa lo que cambia los planes; "programado" es lo normal.
const AVISO_ESTADO: Partial<Record<EstadoEvento, { tono: 'advertencia' | 'error'; texto: string }>> = {
  suspendido: { tono: 'advertencia', texto: 'Este evento está suspendido. Revisá antes de ir.' },
  cancelado: { tono: 'error', texto: 'Este evento se canceló.' },
  finalizado: { tono: 'advertencia', texto: 'Este evento ya terminó.' },
};

const ALTO_PORTADA = 220;

const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const FORMATO_PRECIO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

// La API manda la hora de Argentina con su zona ("…T18:00:00-03:00"): el día
// sale de la parte de fecha (mediodía, para que ningún huso lo corra) y la hora
// se corta del texto, igual que en la Agenda.
function dia(fechaHora: string): string {
  const texto = FORMATO_FECHA.format(new Date(`${fechaHora.slice(0, 10)}T12:00:00`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function hora(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

// "Viernes, 23 de octubre · 18:00 a 21:00 h", o dos renglones si dura varios días.
function renglonesHorario(inicio: string, fin: string | null): string[] {
  if (!fin) return [`${dia(inicio)} · desde las ${hora(inicio)} h`];
  if (fin.slice(0, 10) === inicio.slice(0, 10)) return [`${dia(inicio)} · ${hora(inicio)} a ${hora(fin)} h`];
  return [`Desde: ${dia(inicio)}, ${hora(inicio)} h`, `Hasta: ${dia(fin)}, ${hora(fin)} h`];
}

export default function DetalleEvento() {
  const colores = useColores();
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const [resultado, setResultado] = useState<{
    eventoId: string;
    evento: Evento | null;
    lugar: Lugar | null;
    error: string | null;
    errorLugar: string | null;
    errorAviso: string | null;
  } | null>(null);

  useEffect(() => {
    let vigente = true;

    async function cargarEvento() {
      try {
        const evento = await obtenerEvento(eventoId);
        let lugar: Lugar | null = null;
        let errorLugar: string | null = null;
        let errorAviso: string | null = null;

        if (evento.estado !== 'programado') {
          try {
            await cancelarAvisoEvento(evento.id);
          } catch (err) {
            console.error(err);
            errorAviso = 'No se pudo cancelar el aviso local del evento.';
          }
        }

        if (evento.lugarId) {
          try {
            lugar = await obtenerLugar(evento.lugarId);
          } catch (err) {
            console.error(err);
            errorLugar = 'No se pudieron cargar los datos del lugar.';
          }
        }

        if (vigente) setResultado({ eventoId, evento, lugar, error: null, errorLugar, errorAviso });
      } catch (err) {
        console.error(err);
        if (vigente) {
          setResultado({
            eventoId,
            evento: null,
            lugar: null,
            error: err instanceof Error ? err.message : 'No se pudo cargar el evento.',
            errorLugar: null,
            errorAviso: null,
          });
        }
      }
    }

    void cargarEvento();

    return () => {
      vigente = false;
    };
  }, [eventoId]);

  const cargando = resultado?.eventoId !== eventoId;
  const evento = resultado?.eventoId === eventoId ? resultado.evento : null;
  const lugar = resultado?.eventoId === eventoId ? resultado.lugar : null;
  const error = resultado?.eventoId === eventoId ? resultado.error : null;
  const errorLugar = resultado?.eventoId === eventoId ? resultado.errorLugar : null;
  const errorAviso = resultado?.eventoId === eventoId ? resultado.errorAviso : null;
  const coordenadas = evento?.coordenadas ?? lugar?.coordenadas ?? null;

  const aviso = evento ? AVISO_ESTADO[evento.estado] : undefined;
  const precio =
    evento?.precio === null || evento?.precio === undefined
      ? null
      : evento.precio === 0
        ? 'Gratis'
        : FORMATO_PRECIO.format(evento.precio);
  const direccion = lugar?.direccion ?? evento?.direccionLibre ?? null;

  return (
    <View className="flex-1 bg-fondo">
      {cargando ? (
        <Cargando texto="Cargando evento..." />
      ) : error || !evento ? (
        <EstadoVacio
          tono="error"
          icono="alert-circle-outline"
          titulo="No pudimos abrir este evento"
          mensaje={error ?? 'No se encontró el evento.'}
        />
      ) : (
        <ScrollView contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
          {evento.imagenUrl ? (
            <Image
              source={{ uri: evento.imagenUrl }}
              contentFit="cover"
              accessibilityLabel={`Imagen de ${evento.titulo}`}
              style={{ width: '100%', height: ALTO_PORTADA, backgroundColor: colores['primario-claro'] }}
            />
          ) : (
            <View
              style={{ height: ALTO_PORTADA * 0.6 }}
              className="items-center justify-center bg-primario-claro"
            >
              <Ionicons name="calendar-outline" size={56} color={colores.primario} />
            </View>
          )}

          <View className="gap-5 px-5 pt-5">
            <View className="gap-3">
              <Text accessibilityRole="header" className="text-3xl font-bold text-texto">
                {evento.titulo}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip icono="time-outline" texto={`${hora(evento.inicio)} h`} />
                {precio ? (
                  <Chip icono="ticket-outline" texto={precio} tono={evento.precio === 0 ? 'exito' : 'neutro'} />
                ) : null}
              </View>
            </View>

            {aviso ? (
              <Aviso tono={aviso.tono} icono={evento.estado === 'suspendido' ? 'rainy-outline' : undefined}>
                {aviso.texto}
              </Aviso>
            ) : null}

            <Text className="text-base leading-6 text-texto">{evento.descripcion}</Text>

            <View className="gap-2">
              <EtiquetaSeccion>Cuándo</EtiquetaSeccion>
              <Tarjeta relleno={false}>
                {renglonesHorario(evento.inicio, evento.fin).map((renglon, indice) => (
                  <FilaAccion
                    key={renglon}
                    icono={indice === 0 ? 'calendar-outline' : 'flag-outline'}
                    texto={renglon}
                    separador={indice > 0}
                  />
                ))}
              </Tarjeta>
            </View>

            <View className="gap-2">
              <EtiquetaSeccion>Dónde</EtiquetaSeccion>
              {lugar || direccion || coordenadas ? (
                <Tarjeta relleno={false}>
                  {lugar ? (
                    <FilaAccion
                      icono="business-outline"
                      texto={lugar.nombre}
                      accion="Ver lugar"
                      onPress={() => router.push({ pathname: '/lugar/[id]', params: { id: lugar.id } })}
                    />
                  ) : null}
                  {direccion ? (
                    <FilaAccion
                      icono="location-outline"
                      texto={direccion}
                      accion={coordenadas ? 'Cómo llegar' : undefined}
                      onPress={coordenadas ? () => abrirComoLlegar(coordenadas) : undefined}
                      separador={Boolean(lugar)}
                    />
                  ) : coordenadas ? (
                    <FilaAccion
                      icono="location-outline"
                      texto="Ver en el mapa"
                      accion="Cómo llegar"
                      onPress={() => abrirComoLlegar(coordenadas)}
                      separador={Boolean(lugar)}
                    />
                  ) : null}
                </Tarjeta>
              ) : (
                <Text className="text-base text-texto-suave">No se informó una dirección.</Text>
              )}
              {errorLugar ? <Aviso tono="advertencia">{errorLugar}</Aviso> : null}
            </View>

            {errorAviso ? <Aviso tono="advertencia">{errorAviso}</Aviso> : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// Abre Google Maps (app o web) con el recorrido hasta el evento.
function abrirComoLlegar({ latitud, longitud }: { latitud: number; longitud: number }) {
  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`);
}
