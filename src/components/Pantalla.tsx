import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  className?: string;
};

// Contenedor base de cada pantalla: fondo y márgenes consistentes.
export function Pantalla({ children, className = '' }: Props) {
  return <View className={`flex-1 gap-4 bg-fondo px-5 pt-6 ${className}`}>{children}</View>;
}
