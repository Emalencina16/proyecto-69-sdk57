import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Reloj } from '../common/clock/clock.js';
import { esViolacionDeUnicidad } from '../common/db/uniqueness.js';
import type { AlmacenTokensPush, PlataformaPush } from '../common/notifications/ports.js';
import { DispositivoEntidad } from './device.entity.js';

/** Los tokens de Expo de cada usuario, en la tabla `dispositivos` (docs/NOTIFICATIONS.md). */
@Injectable()
export class AlmacenTokensBase implements AlmacenTokensPush {
  constructor(
    @InjectRepository(DispositivoEntidad) private readonly repo: Repository<DispositivoEntidad>,
    private readonly reloj: Reloj,
  ) {}

  /**
   * Idempotente por token. Si ya estaba (de este usuario o de otro), se actualizan el dueño y la
   * plataforma: es el mismo aparato, quizá con otra cuenta. Dos pedidos a la vez con el mismo
   * token: la clave primaria deja insertar a uno solo; el otro cae en el `catch` y actualiza.
   */
  async guardar(usuarioId: string, tokenExpo: string, plataforma: PlataformaPush): Promise<{ nuevo: boolean }> {
    const cambios = { usuarioId, plataforma, actualizadoEn: this.reloj.ahora() };
    if (await this.repo.existsBy({ tokenExpo })) {
      await this.repo.update({ tokenExpo }, cambios);
      return { nuevo: false };
    }
    try {
      // `insert` y no `save`: `save` hace SELECT + INSERT/UPDATE y taparía el choque.
      await this.repo.insert({ tokenExpo, ...cambios });
      return { nuevo: true };
    } catch (error) {
      if (!esViolacionDeUnicidad(error)) throw error;
      await this.repo.update({ tokenExpo }, cambios);
      return { nuevo: false };
    }
  }

  /** Si no existe, no pasa nada. */
  async borrar(tokenExpo: string): Promise<void> {
    await this.repo.delete({ tokenExpo });
  }

  /** Todos los teléfonos de esos usuarios, ordenados para que el resultado sea estable. */
  async tokensDe(usuarioIds: string[]): Promise<string[]> {
    if (usuarioIds.length === 0) return [];
    const filas = await this.repo.find({
      select: { tokenExpo: true },
      where: { usuarioId: In(usuarioIds) },
      order: { tokenExpo: 'ASC' },
    });
    return filas.map((f) => f.tokenExpo);
  }

  /** Los que Expo informó como dados de baja (`DeviceNotRegistered`). */
  async descartar(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.repo.delete({ tokenExpo: In(tokens) });
  }
}
