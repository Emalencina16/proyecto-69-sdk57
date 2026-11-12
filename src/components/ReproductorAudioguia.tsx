import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { descargarAudio, obtenerAudioLocal } from '@/servicios/audioLocal';
import { ErrorServicio } from '@/servicios/errores';
import type { Lugar } from '@/tipos/lugar';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useNetworkState } from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

const SALTO_SEGUNDOS = 15;

function formatearTiempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const min = Math.floor(total / 60);
  const seg = String(total % 60).padStart(2, '0');
  return `${min}:${seg}`;
}

type Props = { lugar: Lugar };

export function ReproductorAudioguia({ lugar }: Props) {
  
  if (!lugar.audioguia) return null;
  return (
    <Reproductor
      lugarId={lugar.id}
      nombre={lugar.nombre}
      url={lugar.audioguia.url}
      duracionInicial={lugar.audioguia.duracionSegundos}
    />
  );
}

type PropsReproductor = {
  lugarId: string;
  nombre: string;
  url: string;
  duracionInicial: number;
};

function Reproductor({ lugarId, nombre, url, duracionInicial }: PropsReproductor) {
  const red = useNetworkState();
  const [uriLocal, setUriLocal] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  
  useEffect(() => {
    let vigente = true;
    obtenerAudioLocal(lugarId, url).then((uri) => {
      if (vigente) setUriLocal(uri);
    });
    return () => {
      vigente = false;
    };
  }, [lugarId, url]);

  
  const fuente = uriLocal ?? url;
  const [fuenteActiva, setFuenteActiva] = useState(fuente);
  const [reproduciendo, setReproduciendo] = useState(false);
  const posicion = useRef(0);

  useEffect(() => {
    if (!reproduciendo && fuenteActiva !== fuente) setFuenteActiva(fuente);
  }, [reproduciendo, fuente, fuenteActiva]);

  const sinSenal = !uriLocal && red.isInternetReachable === false;

  async function manejarDescarga() {
    setDescargando(true);
    setErrorDescarga(null);
    try {
      setUriLocal(await descargarAudio(lugarId, url));
    } catch (err) {
      console.error(err);
      setErrorDescarga(err instanceof ErrorServicio ? err.message : 'No se pudo descargar.');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <Tarjeta>
      {!abierto ? (
        <Boton
          titulo={`Escuchar audioguía ${formatearTiempo(duracionInicial)}`}
          onPress={() => setAbierto(true)}
          tamano="grande"
          icono="headset-outline"
          deshabilitado={sinSenal}
          accessibilityLabel={`Escuchar audioguía, dura ${formatearTiempo(duracionInicial)}`}
        />
      ) : (
        <Controles
          key={fuenteActiva}
          fuente={fuenteActiva}
          nombre={nombre}
          duracionInicial={duracionInicial}
          leerPosicion={() => posicion.current}
          guardarPosicion={(s) => {
            posicion.current = s;
          }}
          onReproduciendo={setReproduciendo}
        />
      )}

      {sinSenal ? (
        <Aviso tono="advertencia" icono="cloud-offline-outline">
          Sin señal. Esta audioguía no está descargada.
        </Aviso>
      ) : null}

      {uriLocal ? (
        <Aviso tono="exito" icono="checkmark-circle-outline">
          Descargada: se escucha sin conexión.
        </Aviso>
      ) : (
        <Boton
          titulo={descargando ? 'Descargando...' : 'Descargar para escuchar sin conexión'}
          onPress={manejarDescarga}
          variante="secundario"
          tamano="grande"
          icono="download-outline"
          cargando={descargando}
          deshabilitado={sinSenal}
          accessibilityLabel="Descargar audioguía para escuchar sin conexión"
        />
      )}

      {errorDescarga ? <Aviso tono="error">{errorDescarga}</Aviso> : null}
    </Tarjeta>
  );
}

type PropsControles = {
  fuente: string;
  nombre: string;
  duracionInicial: number;
  leerPosicion: () => number;
  guardarPosicion: (segundos: number) => void;
  onReproduciendo: (valor: boolean) => void;
};

function Controles({
  fuente,
  nombre,
  duracionInicial,
  leerPosicion,
  guardarPosicion,
  onReproduciendo,
}: PropsControles) {
  const player = useAudioPlayer({ uri: fuente });
  const estado = useAudioPlayerStatus(player);
  const arrancado = useRef(false);

  const total = estado.duration || duracionInicial;
  const progreso = total > 0 ? Math.min(estado.currentTime / total, 1) : 0;
  const cargando = !estado.isLoaded || estado.isBuffering;

  useEffect(() => {
  if (!estado.isLoaded || arrancado.current) return;
  arrancado.current = true;
  const previa = leerPosicion();
  if (previa > 0) player.seekTo(previa);
  try {
    player.setActiveForLockScreen(true, { title: `Audioguía: ${nombre}`, artist: 'Colón' });
  } catch (err) {
    console.warn('No se pudo activar la pantalla de bloqueo', err);
  }
  player.play();
}, [estado.isLoaded, player, nombre, leerPosicion]);

  useEffect(() => {
    if (arrancado.current) guardarPosicion(estado.currentTime);
  }, [estado.currentTime, guardarPosicion]);

  useEffect(() => {
    onReproduciendo(estado.playing);
  }, [estado.playing, onReproduciendo]);

  
  useEffect(() => {
    return () => {
      try {
        player.clearLockScreenControls();
      } catch {}
    };
  }, [player]);

  async function alternarReproduccion() {
  if (estado.playing) {
    player.pause();
    return;
  }
  if (estado.didJustFinish || estado.currentTime >= total - 0.5) {
    await player.seekTo(0);
  }
  try {
    player.setActiveForLockScreen(true, { title: `Audioguía: ${nombre}`, artist: 'Colón' });
  } catch (err) {
    console.warn('No se pudo activar la pantalla de bloqueo', err);
  }
  player.play();
}

  function moverSegundos(delta: number) {
    player.seekTo(Math.min(Math.max(estado.currentTime + delta, 0), total));
  }

  return (
    <>
      <Text className="text-base text-texto">
        {formatearTiempo(estado.currentTime)} / {formatearTiempo(total)} · faltan{' '}
        {formatearTiempo(total - estado.currentTime)}
        {cargando ? ' · Cargando...' : ''}
      </Text>

      <View className="h-3 overflow-hidden rounded-full bg-borde">
        <View className="h-3 rounded-full bg-primario" style={{ width: `${progreso * 100}%` }} />
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Boton
          titulo={`-${SALTO_SEGUNDOS}s`}
          onPress={() => moverSegundos(-SALTO_SEGUNDOS)}
          variante="secundario"
          tamano="grande"
          accessibilityLabel={`Retroceder ${SALTO_SEGUNDOS} segundos`}
          className="min-w-20"
        />

        <Boton
          titulo={estado.playing ? 'Pausar' : 'Reproducir'}
          onPress={alternarReproduccion}
          tamano="grande"
          icono={estado.playing ? 'pause' : 'play'}
          accessibilityLabel={estado.playing ? 'Pausar audioguía' : 'Reproducir audioguía'}
          className="min-w-32 flex-1"
        />

        <Boton
          titulo={`+${SALTO_SEGUNDOS}s`}
          onPress={() => moverSegundos(SALTO_SEGUNDOS)}
          variante="secundario"
          tamano="grande"
          accessibilityLabel={`Adelantar ${SALTO_SEGUNDOS} segundos`}
          className="min-w-20"
        />
      </View>
    </>
  );
}