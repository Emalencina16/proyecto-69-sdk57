// Forma de las respuestas de la API de la cátedra (ver PRD).
export interface MetaApi {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaApi<T> {
  datos: T;
  meta: MetaApi;
}

export interface ErrorApi {
  codigo: string;
  mensaje: string;
}

export interface RespuestaErrorApi {
  error: ErrorApi;
}
