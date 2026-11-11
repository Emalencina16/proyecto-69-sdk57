import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { cancelarAvisoEvento } from '@/servicios/avisosEventos';
import { obtenerEvento } from '@/servicios/eventos';
import { obtenerLugar } from '@/servicios/lugares';
import type { EstadoEvento, Evento } from '@/tipos/evento';
import type { Lugar } from '@/tipos/lugar';
import colores from '@/tema/colores';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

const ETIQUETAS_ESTADO: Record<EstadoEvento, string> = {
  programado: 'Programado',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
};

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const FORMATO_PRECIO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function formatearFechaHora(fecha: string): string {
  return FORMATO_FECHA_HORA.format(new Date(fecha));
}

export default function DetalleEvento() {
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

  return (
    <Pantalla>
      {cargando ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={colores.primario} />
          <Text className="text-sm text-texto-suave">Cargando evento...</Text>
        </View>
      ) : error || !evento ? (
        <Text accessibilityRole="alert" className="pt-4 text-base text-error">
          {error ?? 'No se encontró el evento.'}
        </Text>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {evento.imagenUrl ? (
            <Image
              source={{ uri: evento.imagenUrl }}
              contentFit="cover"
              accessibilityLabel={`Imagen de ${evento.titulo}`}
              style={{
                width: '100%',
                height: 220,
                borderRadius: 16,
                backgroundColor: colores.superficie,
              }}
            />
          ) : null}

          <Tarjeta>
            <Text className="text-2xl font-bold text-texto">{evento.titulo}</Text>
            <Text className="text-sm font-semibold text-primario">
              {ETIQUETAS_ESTADO[evento.estado]}
            </Text>
            <Text className="text-base leading-6 text-texto">{evento.descripcion}</Text>
          </Tarjeta>

          <Tarjeta>
            <Text className="text-base font-semibold text-texto">Fecha y horario</Text>
            <DatoDetalle etiqueta="Inicio" valor={formatearFechaHora(evento.inicio)} />
            <DatoDetalle
              etiqueta="Fin"
              valor={evento.fin ? formatearFechaHora(evento.fin) : 'Hasta las 23:59 del mismo día'}
            />
          </Tarjeta>

          <Tarjeta>
            <Text className="text-base font-semibold text-texto">Ubicación</Text>
            {lugar ? (
              <>
                <DatoDetalle etiqueta="Lugar" valor={lugar.nombre} />
                <DatoDetalle etiqueta="Dirección" valor={lugar.direccion} />
              </>
            ) : evento.direccionLibre ? (
              <DatoDetalle etiqueta="Dirección" valor={evento.direccionLibre} />
            ) : evento.lugarId ? (
              <DatoDetalle etiqueta="Lugar" valor={evento.lugarId} />
            ) : (
              <Text className="text-sm text-texto-suave">No se informó una dirección.</Text>
            )}
            {errorLugar ? (
              <Text accessibilityRole="alert" className="text-sm text-error">
                {errorLugar}
              </Text>
            ) : null}
            {errorAviso ? (
              <Text accessibilityRole="alert" className="text-sm text-error">
                {errorAviso}
              </Text>
            ) : null}
            {coordenadas ? (
              <DatoDetalle
                etiqueta="Coordenadas"
                valor={`${coordenadas.latitud}, ${coordenadas.longitud}`}
              />
            ) : null}
          </Tarjeta>

          <Tarjeta>
            <Text className="text-base font-semibold text-texto">Precio</Text>
            <Text className="text-sm text-texto-suave">
              {evento.precio === null
                ? 'Sin precio informado'
                : evento.precio === 0
                  ? 'Gratis'
                  : FORMATO_PRECIO.format(evento.precio)}
            </Text>
          </Tarjeta>
        </ScrollView>
      )}
    </Pantalla>
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
