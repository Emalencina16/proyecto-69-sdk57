import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useColores } from '@/tema/useColores';

type Props = {
  children: ReactNode;
  className?: string;
  // false: sin relleno ni separación, para filas tocables de borde a borde.
  relleno?: boolean;
};

export function Tarjeta({ children, className = '', relleno = true }: Props) {
  const colores = useColores();
  return (
    <View
      className={`rounded-tarjeta border border-borde bg-superficie ${
        relleno ? 'gap-2 p-4' : 'overflow-hidden'
      } ${className}`}
      style={{
        shadowColor: colores['primario-oscuro'],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}
