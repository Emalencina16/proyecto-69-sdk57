import '../../global.css';

import { Stack } from 'expo-router';

import { SesionProvider } from '@/estado/sesion';

export default function RootLayout() {
  return (
    <SesionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SesionProvider>
  );
}
