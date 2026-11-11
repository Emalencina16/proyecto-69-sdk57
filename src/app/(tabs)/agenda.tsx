import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { useSesion } from '@/estado/sesion';
import {
  cancelarAvisoEvento,
  obtenerAvisosEventosProgramados,
  programarAvisoEvento,
  sincronizarAvisosEventosGuardados,
} from '@/servicios/avisosEventos';
import {
  guardarEvento,
  obtenerEventos,
  obtenerEventosGuardados,
  quitarEventoGuardado,
} from '@/servicios/eventos';
import type { Evento } from '@/tipos/evento';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MAX_EVENTOS_VISIBLES = 5;

function claveFecha(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fechaHora: string): string {
  const [anio, mes, dia] = fechaHora.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

function eventosEnFecha(eventos: Evento[], fecha: string): Evento[] {
  return eventos.filter((evento) => {
    const inicio = evento.inicio.slice(0, 10);
    const fin = (evento.fin ?? evento.inicio).slice(0, 10);
    return inicio <= fecha && fecha <= fin;
  });
}

function tituloMes(fecha: Date): string {
  const titulo = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(fecha);
  return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

export default function Agenda() {
  const sesion = useSesion();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventosGuardados, setEventosGuardados] = useState<{
    usuarioId: string;
    ids: Set<string>;
    error: string | null;
  } | null>(null);
  const [eventosActualizandose, setEventosActualizandose] = useState<Set<string>>(
    () => new Set(),
  );
  const [avisosLocales, setAvisosLocales] = useState<Set<string>>(() => new Set());
  const [avisosActualizandose, setAvisosActualizandose] = useState<Set<string>>(
    () => new Set(),
  );
  const [errorAvisoLocal, setErrorAvisoLocal] = useState<string | null>(null);
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    obtenerEventos()
      .then((eventosObtenidos) => {
        if (!vigente) return;
        setEventos(eventosObtenidos);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        if (vigente) setError('No se pudieron cargar los eventos.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const usuarioId = sesion.usuario?.id;
      if (!usuarioId) return;

      let vigente = true;
      obtenerEventosGuardados()
        .then((eventosObtenidos) => {
          if (!vigente) return;
          setEventosGuardados({
            usuarioId,
            ids: new Set(eventosObtenidos.map((evento) => evento.id)),
            error: null,
          });
          return sincronizarAvisosEventosGuardados(eventosObtenidos)
            .then((idsAvisados) => {
              if (vigente) setAvisosLocales(new Set(idsAvisados));
            })
            .catch((err) => {
              console.error(err);
              if (vigente) {
                setErrorAvisoLocal(
                  err instanceof Error ? err.message : 'No se pudieron sincronizar los avisos locales.',
                );
              }
            });
        })
        .catch((err) => {
          console.error(err);
          if (!vigente) return;
          setEventosGuardados((actuales) => ({
            usuarioId,
            ids: actuales?.usuarioId === usuarioId ? actuales.ids : new Set(),
            error: err instanceof Error ? err.message : 'No se pudieron cargar los eventos guardados.',
          }));
        });

      return () => {
        vigente = false;
      };
    }, [sesion.usuario?.id]),
  );

  useFocusEffect(
    useCallback(() => {
      if (sesion.usuario) return;

      let vigente = true;
      obtenerAvisosEventosProgramados()
        .then((idsAvisados) => {
          if (vigente) setAvisosLocales(new Set(idsAvisados));
        })
        .catch((err) => {
          console.error(err);
          if (vigente) {
            setErrorAvisoLocal(
              err instanceof Error ? err.message : 'No se pudieron cargar los avisos locales.',
            );
          }
        });

      return () => {
        vigente = false;
      };
    }, [sesion.usuario]),
  );

  const idsEventosGuardados =
    eventosGuardados && eventosGuardados.usuarioId === sesion.usuario?.id
      ? eventosGuardados.ids
      : new Set<string>();
  const errorEventosGuardados =
    eventosGuardados && eventosGuardados.usuarioId === sesion.usuario?.id
      ? eventosGuardados.error
      : null;
  const cargandoEventosGuardados =
    sesion.usuario !== null && eventosGuardados?.usuarioId !== sesion.usuario.id;

  async function alternarEventoGuardado(evento: Evento) {
    if (!sesion.usuario) {
      router.push('/login');
      return;
    }

    if (cargandoEventosGuardados || eventosActualizandose.has(evento.id)) return;

    const usuarioId = sesion.usuario.id;
    setEventosActualizandose((actuales) => new Set(actuales).add(evento.id));

    try {
      if (idsEventosGuardados.has(evento.id)) {
        await quitarEventoGuardado(evento.id);
        setEventosGuardados((actuales) => ({
          usuarioId,
          ids: new Set(
            actuales?.usuarioId === usuarioId ? [...actuales.ids].filter((id) => id !== evento.id) : [],
          ),
          error: null,
        }));
        try {
          await cancelarAvisoEvento(evento.id);
          setAvisosLocales((actuales) => {
            const siguientes = new Set(actuales);
            siguientes.delete(evento.id);
            return siguientes;
          });
          setErrorAvisoLocal(null);
        } catch (err) {
          console.error(err);
          setErrorAvisoLocal(
            'El evento se desguardó, pero no se pudo cancelar su aviso local.',
          );
        }
      } else {
        await guardarEvento(evento.id);
        setEventosGuardados((actuales) => ({
          usuarioId,
          ids: new Set(actuales?.usuarioId === usuarioId ? [...actuales.ids, evento.id] : [evento.id]),
          error: null,
        }));
      }
    } catch (err) {
      console.error(err);
      setEventosGuardados((actuales) => ({
        usuarioId,
        ids: actuales?.usuarioId === usuarioId ? actuales.ids : new Set(),
        error: err instanceof Error ? err.message : 'No se pudo actualizar el evento guardado.',
      }));
    } finally {
      setEventosActualizandose((actuales) => {
        const siguientes = new Set(actuales);
        siguientes.delete(evento.id);
        return siguientes;
      });
    }
  }

  async function alternarAvisoLocal(evento: Evento) {
    if (!idsEventosGuardados.has(evento.id) || evento.estado !== 'programado') return;
    if (avisosActualizandose.has(evento.id)) return;

    setAvisosActualizandose((actuales) => new Set(actuales).add(evento.id));
    setErrorAvisoLocal(null);
    try {
      if (avisosLocales.has(evento.id)) {
        await cancelarAvisoEvento(evento.id);
        setAvisosLocales((actuales) => {
          const siguientes = new Set(actuales);
          siguientes.delete(evento.id);
          return siguientes;
        });
      } else {
        await programarAvisoEvento(evento);
        setAvisosLocales((actuales) => new Set(actuales).add(evento.id));
      }
    } catch (err) {
      console.error(err);
      setErrorAvisoLocal(
        err instanceof Error ? err.message : 'No se pudo actualizar el aviso del evento.',
      );
    } finally {
      setAvisosActualizandose((actuales) => {
        const siguientes = new Set(actuales);
        siguientes.delete(evento.id);
        return siguientes;
      });
    }
  }

  const hoy = new Date();
  const fechaDeHoy = claveFecha(hoy);
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const eventosFuturos = eventos
    .filter((evento) => new Date(evento.inicio).getTime() >= inicioDeHoy)
    .sort(
      (primerEvento, segundoEvento) =>
        new Date(primerEvento.inicio).getTime() - new Date(segundoEvento.inicio).getTime(),
    );
  const eventosDelPeriodo = fechaSeleccionada
    ? eventosEnFecha(eventosFuturos, fechaSeleccionada)
    : eventosFuturos;
  const eventosVisibles = eventosDelPeriodo.slice(0, MAX_EVENTOS_VISIBLES);

  const primerDiaMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
  const espaciosIniciales = (primerDiaMes.getDay() + 6) % 7;
  const celdasCalendario = Array.from(
    { length: Math.ceil((espaciosIniciales + diasEnMes) / 7) * 7 },
    (_, indice) => {
      const dia = indice - espaciosIniciales + 1;
      return dia > 0 && dia <= diasEnMes ? dia : null;
    },
  );
  const fechasConEventos = new Set(
    eventosFuturos.flatMap((evento) => {
      const inicio = new Date(`${evento.inicio.slice(0, 10)}T00:00:00`);
      const fin = new Date(`${(evento.fin ?? evento.inicio).slice(0, 10)}T00:00:00`);
      const fechas: string[] = [];

      for (const fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
        fechas.push(claveFecha(fecha));
      }

      return fechas;
    }),
  );
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const puedeIrAlMesAnterior =
    mesVisible.getFullYear() > mesActual.getFullYear() ||
    (mesVisible.getFullYear() === mesActual.getFullYear() &&
      mesVisible.getMonth() > mesActual.getMonth());

  function cambiarMes(desplazamiento: number) {
    setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + desplazamiento, 1));
    setFechaSeleccionada(null);
  }

  return (
    <Pantalla>
      <FlatList
        data={eventosVisibles}
        keyExtractor={(evento) => evento.id}
        className="flex-1"
        contentContainerClassName="gap-3 pb-6"
        ListHeaderComponent={
          <View className="gap-4 pb-1">
            <Tarjeta className="gap-4">
              <View className="flex-row items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mes anterior"
                  accessibilityState={{ disabled: !puedeIrAlMesAnterior }}
                  disabled={!puedeIrAlMesAnterior}
                  onPress={() => cambiarMes(-1)}
                  className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
                >
                  <Text
                    className={`text-2xl ${puedeIrAlMesAnterior ? 'text-texto' : 'text-texto-suave'}`}
                  >
                    ‹
                  </Text>
                </Pressable>
                <Text className="text-base font-semibold text-texto">{tituloMes(mesVisible)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mes siguiente"
                  onPress={() => cambiarMes(1)}
                  className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
                >
                  <Text className="text-2xl text-texto">›</Text>
                </Pressable>
              </View>

              <View className="flex-row">
                {DIAS_SEMANA.map((dia, indice) => (
                  <Text
                    key={`${dia}-${indice}`}
                    className="flex-1 text-center text-xs font-semibold text-texto-suave"
                  >
                    {dia}
                  </Text>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {celdasCalendario.map((dia, indice) => {
                  if (dia === null) {
                    return <View key={`vacio-${indice}`} className="w-[14.285%] py-1" />;
                  }

                  const fecha = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia);
                  const fechaClave = claveFecha(fecha);
                  const esHoy = fechaClave === fechaDeHoy;
                  const seleccionada = fechaClave === fechaSeleccionada;
                  const tieneEventos = fechasConEventos.has(fechaClave);
                  const esPasada = fechaClave < fechaDeHoy;

                  return (
                    <Pressable
                      key={fechaClave}
                      accessibilityRole="button"
                      accessibilityLabel={`${dia} de ${tituloMes(mesVisible)}${tieneEventos ? ', hay eventos' : ''}`}
                      accessibilityState={{ selected: seleccionada, disabled: esPasada }}
                      disabled={esPasada}
                      onPress={() => setFechaSeleccionada(fechaClave)}
                      className="w-[14.285%] items-center py-1"
                    >
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-full ${
                          seleccionada
                            ? 'bg-primario'
                            : esHoy
                              ? 'border border-primario'
                              : ''
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            seleccionada
                              ? 'font-semibold text-white'
                              : esPasada
                                ? 'text-texto-suave'
                                : 'text-texto'
                          }`}
                        >
                          {dia}
                        </Text>
                      </View>
                      <View
                        className={`mt-1 h-1 w-1 rounded-full ${
                          tieneEventos ? (seleccionada ? 'bg-white' : 'bg-primario') : 'bg-transparent'
                        }`}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-texto-suave">• Fechas con eventos</Text>
                {fechaSeleccionada ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver próximos eventos"
                    onPress={() => setFechaSeleccionada(null)}
                    className="py-1"
                  >
                    <Text className="text-sm font-semibold text-primario">Ver próximos</Text>
                  </Pressable>
                ) : null}
              </View>
            </Tarjeta>

            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-texto">
                {fechaSeleccionada
                  ? `Eventos del ${formatearFecha(`${fechaSeleccionada}T00:00:00`)}`
                  : 'Próximos eventos'}
              </Text>
              <Text className="text-sm text-texto-suave">
                {cargando ? 'Cargando...' : `${eventosVisibles.length} de ${eventosDelPeriodo.length}`}
              </Text>
            </View>
            {error ? (
              <Text accessibilityRole="alert" className="text-sm text-error">
                {error}
              </Text>
            ) : null}
            {errorEventosGuardados ? (
              <Text accessibilityRole="alert" className="text-sm text-error">
                {errorEventosGuardados}
              </Text>
            ) : null}
            {errorAvisoLocal ? (
              <Text accessibilityRole="alert" className="text-sm text-error">
                {errorAvisoLocal}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text className="text-sm text-texto-suave">
            {cargando
              ? 'Cargando eventos...'
              : fechaSeleccionada
                ? 'No hay eventos para este día.'
                : 'No hay eventos próximos.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Tarjeta>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver detalles de ${item.titulo}`}
              onPress={() =>
                router.push({ pathname: '/evento/[eventoId]', params: { eventoId: item.id } })
              }
              className="gap-2 active:opacity-80"
            >
              <Text className="text-base font-semibold text-texto">{item.titulo}</Text>
              <Text className="text-sm text-texto-suave">{item.descripcion}</Text>
              <Text className="text-sm text-texto-suave">
                Inicio: {formatearFecha(item.inicio)}
              </Text>
              <Text className="text-sm text-texto-suave">
                Precio:{' '}
                {item.precio === 0
                  ? 'Gratis'
                  : item.precio === null
                    ? 'Sin precio informado'
                    : `$${item.precio}`}
              </Text>
              <Text className="text-sm font-semibold text-primario">Ver detalles</Text>
            </Pressable>
            {(item.estado === 'programado' || item.estado === 'suspendido') && !sesion.cargando ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  sesion.usuario
                    ? idsEventosGuardados.has(item.id)
                      ? `Quitar ${item.titulo} de eventos guardados`
                      : `Guardar ${item.titulo}`
                    : `Ingresá para guardar ${item.titulo}`
                }
                accessibilityState={{
                  disabled:
                    Boolean(sesion.usuario) &&
                    (cargandoEventosGuardados || eventosActualizandose.has(item.id)),
                  selected: idsEventosGuardados.has(item.id),
                }}
                disabled={
                  Boolean(sesion.usuario) &&
                  (cargandoEventosGuardados || eventosActualizandose.has(item.id))
                }
                onPress={() => alternarEventoGuardado(item)}
                className="min-h-11 flex-row items-center justify-center rounded-xl border border-borde px-4 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-primario">
                  {!sesion.usuario
                    ? 'Ingresá para guardar'
                    : eventosActualizandose.has(item.id)
                      ? 'Actualizando...'
                      : cargandoEventosGuardados
                        ? 'Cargando guardados...'
                        : idsEventosGuardados.has(item.id)
                          ? 'Quitar de guardados'
                          : 'Guardar evento'}
                </Text>
              </Pressable>
            ) : null}
            {item.estado === 'programado' && idsEventosGuardados.has(item.id) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  avisosLocales.has(item.id)
                    ? `Desactivar notificaciones para ${item.titulo}`
                    : `Activar notificaciones para ${item.titulo}`
                }
                accessibilityState={{ disabled: avisosActualizandose.has(item.id) }}
                disabled={avisosActualizandose.has(item.id)}
                onPress={() => alternarAvisoLocal(item)}
                className="min-h-11 flex-row items-center justify-center rounded-xl border border-borde px-2 active:opacity-80"
              >
                <Text numberOfLines={1} className="text-xs font-semibold text-primario">
                  {avisosActualizandose.has(item.id)
                    ? 'Actualizando aviso...'
                    : avisosLocales.has(item.id)
                      ? 'Desactivar notificaciones'
                      : 'Activar notificaciones'}
                </Text>
              </Pressable>
            ) : null}
          </Tarjeta>
        )}
      />
    </Pantalla>
  );
}
