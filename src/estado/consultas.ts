import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

// React Native no tiene "foco de ventana" como el navegador, y expo-router no
// desmonta las pantallas al cambiar de pestaña: sin esto, TanStack Query
// nunca se entera de que la app volvió a primer plano y no revalida nada.
AppState.addEventListener('change', (estado) => {
  focusManager.setFocused(estado === 'active');
});

// Un solo cliente para toda la app. staleTime bajo porque el catálogo cambia
// poco pero los favoritos sí: a los 30s, si se vuelve a pedir, se revalida
// en segundo plano en vez de mostrar un spinner de nuevo.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});
