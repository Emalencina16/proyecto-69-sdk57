import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { pedir, pedirUno } from '@/servicios/cliente';
import type { Dispositivo, PruebaNotificacion } from '@/tipos/api';

// Notificaciones push (PRD, docs/NOTIFICATIONS.md de la API).
//
// 1. Al tener sesión, el teléfono pide permiso, saca su token de Expo
//    ("ExponentPushToken[...]") y lo manda a POST /dispositivos.
// 2. La API guarda token ↔ usuario. Cuando hay algo para avisar (un evento
//    guardado que se suspende o cancela, o la prueba), le pide a Expo que lo
//    entregue; Expo lo pasa a Google (FCM) y llega aunque la app esté cerrada.
// 3. Al cerrar sesión se manda DELETE /dispositivos/:token, para que este
//    teléfono no siga recibiendo avisos de la cuenta que salió.
//
// Nada de esto es imprescindible para usar la app: si no hay permiso, no hay
// señal o falta configurar Firebase, se anota en la consola y se sigue.
//
// Necesita development build (Expo Go en Android no recibe push desde SDK 53)
// y un emulador con Google Play o un teléfono real.

// Con la app abierta, la notificación se muestra igual (por defecto no).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// En Android 13+ el pedido de permiso no aparece hasta que exista un canal.
const CANAL = 'avisos';

// El token que se mandó a la API, para darlo de baja al cerrar sesión.
let tokenRegistrado: string | null = null;

function idDelProyecto(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function tienePermiso(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Llamar con la sesión ya configurada en el cliente (POST /dispositivos pide
// token). Idempotente: la API responde 200 si el teléfono ya estaba.
export async function registrarTelefono(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Avisos de Mi Ciudad',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    if (!(await tienePermiso())) {
      console.warn('[notificaciones] sin permiso: este teléfono no va a recibir avisos');
      return;
    }
    const projectId = idDelProyecto();
    if (!projectId) {
      console.warn('[notificaciones] falta el projectId de EAS en app.json');
      return;
    }
    const { data: tokenExpo } = await Notifications.getExpoPushTokenAsync({ projectId });
    await pedirUno<Dispositivo>('/dispositivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenExpo, plataforma: Platform.OS === 'ios' ? 'ios' : 'android' }),
    });
    tokenRegistrado = tokenExpo;
    console.log('[notificaciones] teléfono registrado:', tokenExpo);
  } catch (error) {
    console.warn('[notificaciones] no se pudo registrar el teléfono', error);
  }
}

// Llamar ANTES de sacar el token de sesión del cliente (el DELETE lo necesita).
export async function darDeBajaTelefono(): Promise<void> {
  if (!tokenRegistrado) return;
  const token = tokenRegistrado;
  tokenRegistrado = null;
  try {
    await pedir(`/dispositivos/${encodeURIComponent(token)}`, { method: 'DELETE' });
  } catch (error) {
    // Sin señal queda registrado: la próxima cuenta que entre en este teléfono
    // lo toma (la API pasa el token al último usuario que lo registra).
    console.warn('[notificaciones] no se pudo dar de baja el teléfono', error);
  }
}

// POST /dispositivos/prueba: la API manda "¡Las notificaciones funcionan!" a
// todos los teléfonos de quien tiene la sesión. Devuelve a cuántos.
export async function mandarPrueba(): Promise<number> {
  const { enviadas } = await pedirUno<PruebaNotificacion>('/dispositivos/prueba', { method: 'POST' });
  return enviadas;
}
