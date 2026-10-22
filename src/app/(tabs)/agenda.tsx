import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { obtenerEventos } from '@/servicios/eventos';
import type { Evento } from '@/tipos/evento';
import { useEffect, useState } from 'react';
import { FlatList, Text } from 'react-native';

function formatearFecha(fechaHora: string): string {
  const [fecha] = fechaHora.split('T');
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export default function Agenda() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerEventos()
      .then((eventosObtenidos) => {
        setEventos(eventosObtenidos);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudieron cargar los eventos.');
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);
  const inicioDeHoy = new Date();
inicioDeHoy.setHours(0, 0, 0, 0);

const eventosFuturos = eventos
  .filter((evento) => new Date(evento.inicio).getTime() >= inicioDeHoy.getTime())
  .sort(
    (primerEvento, segundoEvento) =>
      new Date(primerEvento.inicio).getTime() -
      new Date(segundoEvento.inicio).getTime(),
  );

  return (
    <Pantalla>
      <Text className="text-sm text-texto-suave">
        {cargando
          ? 'Cargando eventos...'
          : error
            ? `Error: ${error}`
            : `Eventos proximos: ${eventosFuturos.length}`}
      </Text>
      <FlatList
  data={eventosFuturos}
  keyExtractor={(evento) => evento.id}
  className="flex-1"
  contentContainerClassName="gap-3 pb-6"
  ListEmptyComponent={
    <Text className="text-sm text-texto-suave">No hay eventos.</Text>
  }
  renderItem={({ item }) => (
    <Tarjeta>
      <Text className="text-base font-semibold text-texto">
        {item.titulo}
      </Text>
      <Text className="text-sm text-texto-suave">
        {item.descripcion}
      </Text>
      <Text className="text-sm text-texto-suave">
        Inicio: {formatearFecha(item.inicio)}
      </Text>
      <Text className="text-sm text-texto-suave">
        Precio: {
          item.precio === 0
            ? 'Gratis'
            : item.precio === null
              ? 'Sin precio informado'
              : `$${item.precio}`
        }
      </Text>
    </Tarjeta>
  )}
/>
    </Pantalla>
  );
}
