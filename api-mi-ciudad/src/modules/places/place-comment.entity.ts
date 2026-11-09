import { Entity, Index } from 'typeorm';
import { ColumnaId, ColumnaInstante, ColumnaTexto, ColumnaTextoLargo } from '../../common/db/columns.js';

@Entity('comentarios_lugares')
@Index(['lugarId', 'creadoEn', 'id'])
export class ComentarioLugarEntidad {
  @ColumnaId()
  id: string;

  @ColumnaTexto(40)
  lugarId: string;

  @ColumnaTexto(40)
  usuarioId: string;

  @ColumnaTexto(100)
  autor: string;

  @ColumnaTextoLargo()
  texto: string;

  @ColumnaInstante()
  creadoEn: Date;
}
