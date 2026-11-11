import Storage from 'expo-sqlite/kv-store';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  CANAL_AVISOS,
  pedirPermisoNotificaciones,
  prepararCanalAvisos,
} from '@/servicios/notificaciones';
import type { Evento } from '@/tipos/evento';

const CLAVE_AVISOS_EVENTOS = 'eventos.avisos-locales.v1';
const UNA_HORA_MS = 60 * 60 * 1000;

type AvisosEventos = Record<string, string>;

let colaAvisos: Promise<unknown> = Promise.resolve();

function enOrden<T>(operacion: () => Promise<T>): Promise<T> {
  const resultado = colaAvisos.then(operacion);
  colaAvisos = resultado.catch(() => {});
  return resultado;
}

async function leerAvisos(): Promise<AvisosEventos> {
  const texto = await Storage.getItem(CLAVE_AVISOS_EVENTOS);
  if (!texto) return {};

  const valor: unknown = JSON.parse(texto);
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('No se pudo leer la lista de avisos de eventos guardados.');
  }

  const avisos: AvisosEventos = {};
  for (const [eventoId, identificador] of Object.entries(valor)) {
    if (typeof identificador !== 'string') {
      throw new Error('La lista local de avisos de eventos tiene un formato inválido.');
    }
    avisos[eventoId] = identificador;
  }

  return avisos;
}

async function guardarAvisos(avisos: AvisosEventos): Promise<void> {
  await Storage.setItem(CLAVE_AVISOS_EVENTOS, JSON.stringify(avisos));
}

function verificarPlataforma(): void {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new Error('Los avisos locales de eventos están disponibles en Android y iOS.');
  }
}

async function cancelarSiProgramado(identificador: string, programados: Set<string>): Promise<void> {
  if (programados.has(identificador)) {
    await Notifications.cancelScheduledNotificationAsync(identificador);
  }
}

export function obtenerAvisosEventosProgramados(): Promise<string[]> {
  return enOrden(async () => {
    verificarPlataforma();
    const avisos = await leerAvisos();
    const notificaciones = await Notifications.getAllScheduledNotificationsAsync();
    const identificadoresProgramados = new Set(notificaciones.map(({ identifier }) => identifier));
    const vigentes = Object.fromEntries(
      Object.entries(avisos).filter(([, identificador]) =>
        identificadoresProgramados.has(identificador),
      ),
    );

    if (Object.keys(vigentes).length !== Object.keys(avisos).length) {
      await guardarAvisos(vigentes);
    }

    return Object.keys(vigentes);
  });
}

export function sincronizarAvisosEventosGuardados(eventos: Evento[]): Promise<string[]> {
  return enOrden(async () => {
    verificarPlataforma();
    const avisos = await leerAvisos();
    const notificaciones = await Notifications.getAllScheduledNotificationsAsync();
    const identificadoresProgramados = new Set(notificaciones.map(({ identifier }) => identifier));
    const eventosProgramados = new Set(
      eventos.filter((evento) => evento.estado === 'programado').map((evento) => evento.id),
    );
    const vigentes: AvisosEventos = {};

    for (const [eventoId, identificador] of Object.entries(avisos)) {
      if (eventosProgramados.has(eventoId) && identificadoresProgramados.has(identificador)) {
        vigentes[eventoId] = identificador;
        continue;
      }

      await cancelarSiProgramado(identificador, identificadoresProgramados);
    }

    if (Object.keys(vigentes).length !== Object.keys(avisos).length) {
      await guardarAvisos(vigentes);
    }

    return Object.keys(vigentes);
  });
}

export function programarAvisoEvento(evento: Evento): Promise<void> {
  return enOrden(async () => {
    verificarPlataforma();
    if (evento.estado !== 'programado') {
      throw new Error('Solo se puede programar un aviso para un evento programado.');
    }

    const fechaEvento = Date.parse(evento.inicio);
    const fechaAviso = fechaEvento - UNA_HORA_MS;
    if (!Number.isFinite(fechaEvento) || fechaAviso <= Date.now()) {
      throw new Error('Falta menos de una hora para el evento; ya no se puede programar el aviso.');
    }

    await prepararCanalAvisos();
    if (!(await pedirPermisoNotificaciones())) {
      throw new Error('No se otorgó permiso para mostrar notificaciones.');
    }

    const avisos = await leerAvisos();
    const notificaciones = await Notifications.getAllScheduledNotificationsAsync();
    const identificadoresProgramados = new Set(notificaciones.map(({ identifier }) => identifier));
    const anterior = avisos[evento.id];
    if (anterior) await cancelarSiProgramado(anterior, identificadoresProgramados);

    const identificador = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Evento en una hora',
        body: evento.titulo,
        data: { tipo: 'evento-recordatorio', eventoId: evento.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fechaAviso),
        channelId: CANAL_AVISOS,
      },
    });

    try {
      await guardarAvisos({ ...avisos, [evento.id]: identificador });
    } catch (error) {
      await Notifications.cancelScheduledNotificationAsync(identificador);
      throw error;
    }
  });
}

export function cancelarAvisoEvento(eventoId: string): Promise<void> {
  return enOrden(async () => {
    verificarPlataforma();
    const avisos = await leerAvisos();
    const identificador = avisos[eventoId];
    if (!identificador) return;

    const notificaciones = await Notifications.getAllScheduledNotificationsAsync();
    const identificadoresProgramados = new Set(notificaciones.map(({ identifier }) => identifier));
    await cancelarSiProgramado(identificador, identificadoresProgramados);

    const siguientes = { ...avisos };
    delete siguientes[eventoId];
    await guardarAvisos(siguientes);
  });
}
