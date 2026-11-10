import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EnviadorPush, MensajePush } from '../common/notifications/ports.js';
import type { Entorno } from '../config/environment.js';
import { ENTORNO } from '../config/environment.module.js';

/** Expo rechaza el pedido entero si trae más de 100 mensajes. */
const MENSAJES_POR_PEDIDO = 100;
/** Si Expo no contesta, el aviso se pierde pero no queda colgado. */
const TIEMPO_MAXIMO_MS = 10_000;

/** Lo que Expo espera: un mensaje por teléfono. */
interface MensajeExpo {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

/** Un ticket por mensaje, en el mismo orden en que se mandaron. */
interface TicketExpo {
  status?: string;
  message?: string;
  details?: { error?: string };
}

/** Manda las push a la API de Expo (docs/NOTIFICATIONS.md). Nunca lanza: los errores van al log. */
@Injectable()
export class EnviadorExpo implements EnviadorPush {
  private readonly log = new Logger('Push');

  constructor(@Inject(ENTORNO) private readonly entorno: Entorno) {}

  async enviar(mensajes: MensajePush[]): Promise<{ tokensInvalidos: string[] }> {
    const individuales: MensajeExpo[] = mensajes.flatMap((m) =>
      m.tokens.map((to) => ({ to, title: m.titulo, body: m.cuerpo, data: m.datos })),
    );
    const tokensInvalidos: string[] = [];
    for (let i = 0; i < individuales.length; i += MENSAJES_POR_PEDIDO) {
      const tanda = individuales.slice(i, i + MENSAJES_POR_PEDIDO);
      tokensInvalidos.push(...(await this.enviarTanda(tanda)));
    }
    return { tokensInvalidos };
  }

  /** Devuelve los tokens de la tanda que Expo marcó como `DeviceNotRegistered`. */
  private async enviarTanda(tanda: MensajeExpo[]): Promise<string[]> {
    let tickets: TicketExpo[];
    try {
      const respuesta = await fetch(this.entorno.EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(tanda),
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
      if (!respuesta.ok) {
        this.log.warn(`Expo respondió ${respuesta.status} a una tanda de ${tanda.length}`);
        return [];
      }
      const cuerpo = (await respuesta.json()) as { data?: unknown };
      if (!Array.isArray(cuerpo.data)) {
        this.log.warn('Expo respondió sin la lista de tickets');
        return [];
      }
      tickets = cuerpo.data as TicketExpo[];
    } catch (error) {
      this.log.warn(`No se pudo hablar con Expo: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }

    const invalidos: string[] = [];
    tanda.forEach((mensaje, i) => {
      const ticket = tickets[i];
      if (ticket?.status !== 'error') return;
      if (ticket.details?.error === 'DeviceNotRegistered') invalidos.push(mensaje.to);
      else this.log.warn(`Expo rechazó un mensaje: ${ticket.details?.error ?? ticket.message ?? 'sin detalle'}`);
    });
    return invalidos;
  }
}
