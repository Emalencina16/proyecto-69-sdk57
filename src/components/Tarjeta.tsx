import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  className?: string;
};

export function Tarjeta({ children, className = '' }: Props) {
  return (
    <View
      className={`gap-2 rounded-2xl border border-borde bg-superficie p-4 ${className}`}
      style={{
        shadowColor: '#12245f',
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
