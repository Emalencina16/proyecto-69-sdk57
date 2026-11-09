import { Entity, Index } from 'typeorm';
import { ColumnaId, ColumnaInstante, ColumnaTexto } from '../../common/db/columns.js';

@Entity('imagenes_lugares')
@Index(['lugarId', 'creadoEn', 'id'])
export class ImagenLugarEntidad {
  @ColumnaId()
  id: string;

  @ColumnaTexto(40)
  lugarId: string;

  @ColumnaTexto(40)
  usuarioId: string;

  @ColumnaTexto(200)
  clave: string;

  @ColumnaInstante()
  creadoEn: Date;
}
