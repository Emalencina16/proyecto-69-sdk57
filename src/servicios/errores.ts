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

export const errorDeServidor = () =>
  new ErrorServicio({ codigo: 'ERROR_SERVIDOR', mensaje: 'Ocurrió un error en el servidor.' });
