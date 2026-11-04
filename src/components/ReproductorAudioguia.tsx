import { Tarjeta } from '@/components/Tarjeta';
import { descargarAudio, obtenerAudioLocal } from '@/servicios/audioLocal';
import type { Lugar } from '@/tipos/lugar';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const SALTO_SEGUNDOS = 15;

function formatearTiempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const min = Math.floor(total / 60);
  const seg = String(total % 60).padStart(2, '0');
  return `${min}:${seg}`;
}

type Props = { lugar: Lugar };

export function ReproductorAudioguia({ lugar }: Props) {
  // Sin audioguía no se muestra nada: el PRD dice "cuando existe".
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
  const [uriLocal, setUriLocal] = useState<string | null>(() => obtenerAudioLocal(lugarId, url));
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  async function manejarDescarga() {
    setDescargando(true);
    setErrorDescarga(null);
    try {
      setUriLocal(await descargarAudio(lugarId, url));
    } catch (err) {
      console.error(err);
      setErrorDescarga('No se pudo descargar. Probá de nuevo con señal.');
    } finally {
      setDescargando(false);
    }
  }

  const fuente = uriLocal ?? url;

  return (
    <Tarjeta>
      <Text className="text-base font-semibold text-texto">Audioguía</Text>

      {/* key: al cambiar de URL remota a archivo local se crea un reproductor nuevo. */}
      <Controles key={fuente} fuente={fuente} nombre={nombre} duracionInicial={duracionInicial} />

      {uriLocal ? (
        <Text className="text-sm text-texto-suave">Descargada: la podés escuchar sin conexión.</Text>
      ) : (
        <Pressable
          onPress={manejarDescarga}
          disabled={descargando}
          className="rounded-lg border border-borde px-3 py-3"
        >
          <Text className="text-center text-sm font-semibold text-texto">
            {descargando ? 'Descargando...' : 'Descargar para escuchar sin conexión'}
          </Text>
        </Pressable>
      )}

      {errorDescarga ? <Text className="text-sm text-error">{errorDescarga}</Text> : null}
    </Tarjeta>
  );
}

type PropsControles = { fuente: string; nombre: string; duracionInicial: number };

function Controles({ fuente, nombre, duracionInicial }: PropsControles) {
  const player = useAudioPlayer({ uri: fuente });
  const estado = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((err) => console.error(err));
  }, []);

  function alternarReproduccion() {
    if (estado.playing) {
      player.pause();
      return;
    }
   
    player.setActiveForLockScreen(true, { title: `Audioguía: ${nombre}`, artist: nombre });
    player.play();
  }

  const total = estado.duration || duracionInicial;

  function moverSegundos(delta: number) {
    player.seekTo(Math.min(Math.max(estado.currentTime + delta, 0), total));
  }

  return (
    <>
      <Text className="text-sm text-texto-suave">
        {formatearTiempo(estado.currentTime)} / {formatearTiempo(total)} · faltan{' '}
        {formatearTiempo(total - estado.currentTime)}
      </Text>

      <View className="flex-row gap-2">
        <Pressable onPress={() => moverSegundos(-SALTO_SEGUNDOS)} className="rounded-lg border border-borde px-4 py-3">
          <Text className="text-base text-texto">-{SALTO_SEGUNDOS}s</Text>
        </Pressable>
        <Pressable onPress={alternarReproduccion} className="rounded-lg bg-blue-600 px-5 py-3">
          <Text className="text-base font-semibold text-white">{estado.playing ? 'Pausar' : 'Reproducir'}</Text>
        </Pressable>
        <Pressable onPress={() => moverSegundos(SALTO_SEGUNDOS)} className="rounded-lg border border-borde px-4 py-3">
          <Text className="text-base text-texto">+{SALTO_SEGUNDOS}s</Text>
        </Pressable>
      </View>
    </>
  );
}