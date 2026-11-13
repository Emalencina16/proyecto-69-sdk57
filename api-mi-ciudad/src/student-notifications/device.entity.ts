import { Entity, Index, PrimaryColumn } from 'typeorm';
import { ColumnaEnum, ColumnaInstante, ColumnaTexto } from '../common/db/columns.js';
import type { PlataformaPush } from '../common/notifications/ports.js';

/**
 * Un teléfono que recibe push. El token de Expo es la clave primaria: es único, así que dos
 * registros simultáneos del mismo token no pueden duplicarlo (AGENTS §5.5, concurrencia).
 * Un usuario puede tener varios teléfonos; un teléfono es de un solo usuario a la vez.
 */
@Entity('dispositivos')
@Index(['usuarioId'])
export class DispositivoEntidad {
  // 200: el mismo máximo que valida el DTO. ColumnaId es de 40 y un token de Expo es más largo.
  @PrimaryColumn({ type: 'varchar', length: 200 })
  tokenExpo: string;

  @ColumnaTexto(40)
  usuarioId: string;

  @ColumnaEnum()
  plataforma: PlataformaPush;

  @ColumnaInstante()
  actualizadoEn: Date;
}
