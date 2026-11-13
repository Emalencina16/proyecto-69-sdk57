import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { NombreIcono } from '@/components/Boton';
import { type Colores, useColores } from '@/tema/useColores';

type Tono = 'info' | 'exito' | 'advertencia' | 'error';

const ESTILO: Record<Tono, { fondo: string; color: keyof Colores; icono: NombreIcono }> = {
  info: { fondo: 'bg-rio-claro', color: 'rio', icono: 'information-circle-outline' },
  exito: { fondo: 'bg-exito-claro', color: 'exito', icono: 'checkmark-circle-outline' },
  advertencia: { fondo: 'bg-advertencia-claro', color: 'advertencia', icono: 'alert-circle-outline' },
  error: { fondo: 'bg-error-claro', color: 'error', icono: 'close-circle-outline' },
};

type Props = {
  children: ReactNode;
  tono?: Tono;
  icono?: NombreIcono;
  className?: string;
};

// Franja de aviso dentro de una pantalla (sin conexión, visita guardada, error).
export function Aviso({ children, tono = 'info', icono, className = '' }: Props) {
  const colores = useColores();
  const estilo = ESTILO[tono];

  return (
    <View
      accessibilityRole={tono === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      className={`flex-row items-center gap-3 rounded-control px-4 py-3 ${estilo.fondo} ${className}`}
    >
      <Ionicons name={icono ?? estilo.icono} size={24} color={colores[estilo.color]} />
      <Text className="flex-1 text-base text-texto">{children}</Text>
    </View>
  );
}
