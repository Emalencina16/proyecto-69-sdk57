import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Cargando } from '@/components/Cargando';
import { EstadoVacio } from '@/components/EstadoVacio';
import { useVariablesTema } from '@/tema/useColores';

type Props = {
  visible: boolean;
  onCerrar: () => void;
  /**
   * Recibe el texto del QR. Devuelve `null` si lo reconoció (quien llama cierra
   * el escáner) o el mensaje a mostrar si no (QR ajeno, roto, sin señal).
   * Si lanza, se muestra un mensaje genérico: el escáner nunca se rompe.
   */
  onLeido: (texto: string) => Promise<string | null>;
};

// Un mismo QR que ya dio error se ignora un rato: la cámara lo sigue viendo
// varias veces por segundo y no queremos vibrar ni consultar en cada cuadro.
const IGNORAR_REPETIDO_MS = 3_000;

// Pantalla completa con la cámara para leer el QR del cartel (PRD, Mi
// recorrido). Al cerrar el Modal se desmonta la cámara (solo puede haber una
// vista de cámara activa por vez).
export function EscanerQr({ visible, onCerrar, onLeido }: Props) {
  // El Modal es otra ventana: le pasamos las variables del tema por las dudas.
  const variablesTema = useVariablesTema();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View style={[{ flex: 1 }, variablesTema]}>
        {visible ? <Contenido onCerrar={onCerrar} onLeido={onLeido} /> : null}
      </View>
    </Modal>
  );
}

function Contenido({ onCerrar, onLeido }: Omit<Props, 'visible'>) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ocupado = useRef(false);
  const ultimoFallido = useRef<{ texto: string; hasta: number } | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  async function alLeer({ data }: BarcodeScanningResult) {
    if (ocupado.current) return;
    const ahora = Date.now();
    const previo = ultimoFallido.current;
    if (previo && previo.texto === data && ahora < previo.hasta) return;

    ocupado.current = true;
    setProcesando(true);
    let mensaje: string | null;
    try {
      mensaje = await onLeido(typeof data === 'string' ? data : '');
    } catch {
      mensaje = 'No pudimos leer ese código. Probá de nuevo o cargá la visita a mano.';
    }
    if (!montado.current) return;
    if (mensaje) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      ultimoFallido.current = { texto: data, hasta: Date.now() + IGNORAR_REPETIDO_MS };
      setError(mensaje);
    }
    setProcesando(false);
    ocupado.current = false;
  }

  if (!permiso) {
    return (
      <SafeAreaView className="flex-1 bg-fondo">
        <Cargando texto="Abriendo la cámara..." />
      </SafeAreaView>
    );
  }

  if (!permiso.granted) {
    return (
      <SafeAreaView className="flex-1 justify-center gap-4 bg-fondo px-4">
        <EstadoVacio
          icono="camera-outline"
          titulo="Necesitamos la cámara"
          mensaje="Para leer el código QR del cartel hay que dar permiso de cámara. También podés cargar la visita a mano."
          accion={
            permiso.canAskAgain
              ? { titulo: 'Dar permiso', onPress: pedirPermiso }
              : { titulo: 'Abrir ajustes', onPress: () => Linking.openSettings() }
          }
        />
        <Boton titulo="Volver" variante="secundario" onPress={onCerrar} />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={procesando ? undefined : alLeer}
        onMountError={() => setError('No pudimos abrir la cámara. Cargá la visita a mano.')}
      />

      {/* Encima de la cámara: guía, mensajes y el botón para salir. */}
      <SafeAreaView className="absolute inset-0 justify-between px-4 py-4" pointerEvents="box-none">
        <Text className="rounded-control bg-black/60 px-4 py-3 text-center text-lg font-semibold text-white">
          Apuntá al código QR del cartel
        </Text>

        <View
          pointerEvents="none"
          className="h-64 w-64 self-center rounded-tarjeta border-4 border-white/80"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />

        <View className="gap-3">
          {procesando ? (
            <View className="flex-row items-center justify-center gap-3 rounded-control bg-black/60 px-4 py-3">
              <ActivityIndicator color="#fff" />
              <Text className="text-base text-white">Buscando el lugar...</Text>
            </View>
          ) : error ? (
            <Aviso tono="error">{error}</Aviso>
          ) : null}
          <Boton titulo="Cancelar" variante="secundario" icono="close" onPress={onCerrar} />
        </View>
      </SafeAreaView>
    </View>
  );
}
