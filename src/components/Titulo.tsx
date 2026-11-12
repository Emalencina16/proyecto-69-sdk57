import { Text, View } from 'react-native';

type Props = {
  children: string;
  subtitulo?: string;
  className?: string;
};

// Título grande al principio de cada pantalla (el encabezado solo lleva el logo).
export function Titulo({ children, subtitulo, className = '' }: Props) {
  return (
    <View className={`gap-1 ${className}`}>
      <Text accessibilityRole="header" className="text-3xl font-bold text-texto">
        {children}
      </Text>
      {subtitulo ? <Text className="text-base text-texto-suave">{subtitulo}</Text> : null}
    </View>
  );
}
