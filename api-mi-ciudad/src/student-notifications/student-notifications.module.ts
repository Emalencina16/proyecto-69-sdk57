import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALMACEN_TOKENS_PUSH, ENVIADOR_PUSH } from '../common/notifications/ports.js';
import { DispositivoEntidad } from './device.entity.js';
import { EnviadorExpo } from './sender.js';
import { AlmacenTokensBase } from './token-store.js';

/** Las dos piezas de las push que programan los alumnos (AGENTS §19). */
@Module({
  imports: [TypeOrmModule.forFeature([DispositivoEntidad])],
  providers: [
    AlmacenTokensBase,
    EnviadorExpo,
    { provide: ALMACEN_TOKENS_PUSH, useExisting: AlmacenTokensBase },
    { provide: ENVIADOR_PUSH, useExisting: EnviadorExpo },
  ],
  exports: [ALMACEN_TOKENS_PUSH, ENVIADOR_PUSH],
})
export class NotificacionesAlumnosModulo {}
