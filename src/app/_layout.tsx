import '../../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { queryClient } from '@/estado/consultas';
import { SesionProvider } from '@/estado/sesion';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SesionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SesionProvider>
    </QueryClientProvider>
  );
}
