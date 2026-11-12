import type { ReactNode } from 'react';
import { Text } from 'react-native';

type Props = {
  children: ReactNode;
  className?: string;
};

// Rótulo chico en mayúsculas que separa secciones dentro de una pantalla.
export function EtiquetaSeccion({ children, className = '' }: Props) {
  return (
    <Text
      accessibilityRole="header"
      className={`text-sm font-semibold uppercase tracking-wide text-texto-suave ${className}`}
    >
      {children}
    </Text>
  );
}
