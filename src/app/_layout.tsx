import '../../global.css';
import { setAudioModeAsync } from 'expo-audio';

import { Stack } from 'expo-router';
import { useEffect } from 'react';


import { SesionProvider } from '@/estado/sesion';

export default function RootLayout() {
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((err) => console.error(err));
  }, []);
  return (
    <SesionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SesionProvider>
  );
}
