import type { ComentarioLugar } from '../../../contract/comentarios.js';
import { aIsoConZona } from '../../common/dates/dates.js';
import type { ComentarioLugarEntidad } from './place-comment.entity.js';

export function comentarioAContrato(comentario: ComentarioLugarEntidad): ComentarioLugar {
  return {
    id: comentario.id,
    lugarId: comentario.lugarId,
    usuarioId: comentario.usuarioId,
    autor: comentario.autor,
    texto: comentario.texto,
    creadoEn: aIsoConZona(comentario.creadoEn),
  };
}
