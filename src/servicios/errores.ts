import type { ErrorApi } from '@/tipos/api';

// Error que lanzan los servicios. Lleva el mismo `codigo` que va a devolver
// la API real (ver PRD), así las pantallas pueden decidir qué mostrar.
export class ErrorServicio extends Error {
  codigo: string;

  constructor({ codigo, mensaje }: ErrorApi) {
    super(mensaje);
    this.codigo = codigo;
  }
}

export const errorDeRed = () =>
  new ErrorServicio({ codigo: 'ERROR_RED', mensaje: 'No se pudo conectar con el servidor.' });

// Mismo código que errorDeRed: para los servicios es lo mismo (sin respuesta,
// se puede reintentar; la cola de visitas la trata como pasajera). Cambia el
// mensaje: la API publicada en Render se duerme y el primer pedido tarda ~1 min.
export const errorDeTiempo = () =>
  new ErrorServicio({
    codigo: 'ERROR_RED',
    mensaje: 'El servidor tarda en responder. Esperá un momento y probá de nuevo.',
  });

export const errorDeServidor = () =>
  new ErrorServicio({ codigo: 'ERROR_SERVIDOR', mensaje: 'Ocurrió un error en el servidor.' });
