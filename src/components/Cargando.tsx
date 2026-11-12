import { ActivityIndicator, Text, View } from 'react-native';

import { useColores } from '@/tema/useColores';

type Props = {
  texto?: string;
  className?: string;
};

// Estado de carga de una pantalla o sección, siempre con el color de marca.
export function Cargando({ texto, className = '' }: Props) {
  const colores = useColores();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={texto ?? 'Cargando'}
      className={`items-center justify-center gap-3 py-8 ${className}`}
    >
      <ActivityIndicator size="large" color={colores.primario} />
      {texto ? <Text className="text-center text-base text-texto-suave">{texto}</Text> : null}
    </View>
  );
}
