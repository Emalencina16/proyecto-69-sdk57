import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  className?: string;
};

export function Tarjeta({ children, className = '' }: Props) {
  return <View className={`gap-2 rounded-xl border border-borde bg-superficie p-4 ${className}`}>{children}</View>;
}
