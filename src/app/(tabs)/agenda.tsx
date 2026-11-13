import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Cargando } from '@/components/Cargando';
import { Chip } from '@/components/Chip';
import { EstadoVacio } from '@/components/EstadoVacio';
import { EtiquetaSeccion } from '@/components/EtiquetaSeccion';
import { Tarjeta } from '@/components/Tarjeta';
import { Titulo } from '@/components/Titulo';
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
import { useColores } from '@/tema/useColores';
import type { Evento } from '@/tipos/evento';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
// Se muestran de a tandas; "Ver más" suma otra.
const MAX_EVENTOS_VISIBLES = 5;
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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

// La API manda la hora de Argentina con su zona ("2026-10-23T18:00:00-03:00"):
// cortar el texto da el día y la hora locales del evento, esté donde esté el teléfono.
function diaYMes(fechaHora: string): { dia: string; mes: string } {
  return { dia: String(Number(fechaHora.slice(8, 10))), mes: MESES_CORTOS[Number(fechaHora.slice(5, 7)) - 1] };
}

function hora(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

function textoPrecio(precio: number | null): string | null {
  if (precio === null) return null;
  return precio === 0 ? 'Gratis' : `$ ${new Intl.NumberFormat('es-AR').format(precio)}`;
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
  const colores = useColores();
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
  const [cantidadVisible, setCantidadVisible] = useState(MAX_EVENTOS_VISIBLES);

  // Al cambiar de día (o volver a "próximos") se arranca de nuevo por la primera tanda.
  useEffect(() => {
    setCantidadVisible(MAX_EVENTOS_VISIBLES);
  }, [fechaSeleccionada]);

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
  const eventosVisibles = eventosDelPeriodo.slice(0, cantidadVisible);
  const eventosOcultos = eventosDelPeriodo.length - eventosVisibles.length;

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
    <View className="flex-1 bg-fondo">
      <FlatList
        data={cargando ? [] : eventosVisibles}
        keyExtractor={(evento) => evento.id}
        className="flex-1"
        contentContainerClassName="gap-3 px-5 py-5"
        ListHeaderComponent={
          <View className="gap-4 pb-1">
            <Titulo subtitulo="Qué pasa en Colón: fiestas, ferias y espectáculos.">Agenda</Titulo>

            <Tarjeta className="gap-3">
              <View className="flex-row items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mes anterior"
                  accessibilityState={{ disabled: !puedeIrAlMesAnterior }}
                  disabled={!puedeIrAlMesAnterior}
                  onPress={() => cambiarMes(-1)}
                  className={`h-12 w-12 items-center justify-center rounded-full active:bg-primario-claro ${
                    puedeIrAlMesAnterior ? '' : 'opacity-30'
                  }`}
                >
                  <Ionicons name="chevron-back" size={24} color={colores.texto} />
                </Pressable>
                <Text className="text-lg font-semibold text-texto">{tituloMes(mesVisible)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mes siguiente"
                  onPress={() => cambiarMes(1)}
                  className="h-12 w-12 items-center justify-center rounded-full active:bg-primario-claro"
                >
                  <Ionicons name="chevron-forward" size={24} color={colores.texto} />
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
                      accessibilityLabel={`${dia} de ${tituloMes(mesVisible)}${esHoy ? ', hoy' : ''}${tieneEventos ? ', hay eventos' : ''}`}
                      accessibilityState={{ selected: seleccionada, disabled: esPasada }}
                      disabled={esPasada}
                      onPress={() => setFechaSeleccionada(fechaClave)}
                      className="w-[14.285%] items-center py-1"
                    >
                      <View
                        // Radio en número: con rounded-full el fondo salía cuadrado en Android.
                        style={{ borderRadius: 20 }}
                        className={`h-10 w-10 items-center justify-center ${
                          seleccionada
                            ? 'bg-primario'
                            : esHoy
                              ? 'border-2 border-primario'
                              : tieneEventos
                                ? 'bg-primario-claro'
                                : ''
                        }`}
                      >
                        <Text
                          className={`text-base ${
                            seleccionada
                              ? 'font-bold text-sobre-primario'
                              : esPasada
                                ? 'text-texto-suave opacity-60'
                                : tieneEventos || esHoy
                                  ? 'font-semibold text-texto'
                                  : 'text-texto'
                          }`}
                        >
                          {dia}
                        </Text>
                      </View>
                      <View
                        style={{ borderRadius: 3 }}
                        className={`mt-1 h-1.5 w-1.5 ${
                          tieneEventos ? 'bg-primario' : 'bg-transparent'
                        }`}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View className="min-h-8 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View style={{ borderRadius: 3 }} className="h-1.5 w-1.5 bg-primario" />
                  <Text className="text-sm text-texto-suave">Días con eventos</Text>
                </View>
                {fechaSeleccionada ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver todos los próximos eventos"
                    onPress={() => setFechaSeleccionada(null)}
                    hitSlop={8}
                    className="flex-row items-center gap-1 py-1"
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colores.primario} />
                    <Text className="text-sm font-bold text-primario">Ver todos</Text>
                  </Pressable>
                ) : null}
              </View>
            </Tarjeta>

            {error ? <Aviso tono="error">{error}</Aviso> : null}
            {errorEventosGuardados ? <Aviso tono="error">{errorEventosGuardados}</Aviso> : null}
            {errorAvisoLocal ? <Aviso tono="advertencia">{errorAvisoLocal}</Aviso> : null}

            <EtiquetaSeccion className="mt-2">
              {fechaSeleccionada
                ? `Eventos del ${formatearFecha(`${fechaSeleccionada}T00:00:00`)}`
                : 'Próximos eventos'}
              {!cargando && eventosDelPeriodo.length > 0 ? ` · ${eventosDelPeriodo.length}` : ''}
            </EtiquetaSeccion>
            {cargando ? <Cargando texto="Cargando eventos..." /> : null}
          </View>
        }
        ListEmptyComponent={
          cargando || error ? null : (
            <EstadoVacio
              icono="calendar-outline"
              titulo={fechaSeleccionada ? 'No hay eventos este día' : 'No hay eventos próximos'}
              mensaje={
                fechaSeleccionada
                  ? 'Probá con otro día marcado en el calendario.'
                  : 'Cuando se carguen fiestas, ferias o espectáculos, van a aparecer acá.'
              }
            />
          )
        }
        ListFooterComponent={
          eventosOcultos > 0 ? (
            <Boton
              titulo={`Ver más eventos (${eventosOcultos})`}
              variante="secundario"
              icono="chevron-down"
              onPress={() => setCantidadVisible((actual) => actual + MAX_EVENTOS_VISIBLES)}
              className="mt-1"
            />
          ) : null
        }
        renderItem={({ item }) => {
          const { dia, mes } = diaYMes(item.inicio);
          const guardado = idsEventosGuardados.has(item.id);
          const actualizando = eventosActualizandose.has(item.id);
          const precio = textoPrecio(item.precio);
          const sePuedeGuardar = item.estado === 'programado' || item.estado === 'suspendido';

          return (
            <Tarjeta className="gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver detalles de ${item.titulo}`}
                onPress={() =>
                  router.push({ pathname: '/evento/[eventoId]', params: { eventoId: item.id } })
                }
                className="flex-row gap-3 active:opacity-70"
              >
                {/* Bloque de fecha, como en una agenda de papel. */}
                <View className="h-16 w-14 items-center justify-center rounded-control bg-primario-claro">
                  <Text className="text-2xl font-bold leading-7 text-primario">{dia}</Text>
                  <Text className="text-xs font-semibold uppercase text-primario">{mes}</Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-base font-semibold text-texto">{item.titulo}</Text>
                  <Text className="text-sm text-texto-suave" numberOfLines={2}>
                    {item.descripcion}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap gap-2">
                    <Chip icono="time-outline" texto={`${hora(item.inicio)} h`} />
                    {precio ? (
                      <Chip icono="ticket-outline" texto={precio} tono={item.precio === 0 ? 'exito' : 'neutro'} />
                    ) : null}
                    {item.estado === 'suspendido' ? (
                      <Chip icono="rainy-outline" texto="Suspendido" tono="advertencia" />
                    ) : null}
                    {item.estado === 'cancelado' ? (
                      <Chip icono="close-circle-outline" texto="Cancelado" tono="error" />
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colores['texto-suave']} />
              </Pressable>

              {sePuedeGuardar && !sesion.cargando ? (
                !sesion.usuario ? (
                  <Boton
                    titulo="Ingresá para guardarlo"
                    variante="secundario"
                    icono="bookmark-outline"
                    accessibilityLabel={`Ingresá para guardar ${item.titulo}`}
                    onPress={() => alternarEventoGuardado(item)}
                  />
                ) : (
                  <View className="flex-row gap-2">
                    <Boton
                      titulo={guardado ? 'Guardado' : 'Guardar'}
                      variante={guardado ? 'primario' : 'secundario'}
                      icono={guardado ? 'bookmark' : 'bookmark-outline'}
                      accessibilityLabel={
                        guardado ? `Quitar ${item.titulo} de eventos guardados` : `Guardar ${item.titulo}`
                      }
                      cargando={actualizando}
                      deshabilitado={cargandoEventosGuardados}
                      onPress={() => alternarEventoGuardado(item)}
                      className="flex-1"
                    />
                    {item.estado === 'programado' && guardado ? (
                      <Boton
                        titulo={avisosLocales.has(item.id) ? 'Aviso activo' : 'Avisarme'}
                        variante={avisosLocales.has(item.id) ? 'primario' : 'secundario'}
                        icono={avisosLocales.has(item.id) ? 'notifications' : 'notifications-outline'}
                        accessibilityLabel={
                          avisosLocales.has(item.id)
                            ? `Desactivar notificaciones para ${item.titulo}`
                            : `Activar notificaciones para ${item.titulo}`
                        }
                        cargando={avisosActualizandose.has(item.id)}
                        onPress={() => alternarAvisoLocal(item)}
                        className="flex-1"
                      />
                    ) : null}
                  </View>
                )
              ) : null}
            </Tarjeta>
          );
        }}
      />
    </View>
  );
}
