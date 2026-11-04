import { Text, TextInput, View, type TextInputProps } from 'react-native';

import colores from '@/tema/colores';

type Props = TextInputProps & {
  etiqueta: string;
};

// Etiqueta + input con el estilo base de los formularios.
export function Campo({ etiqueta, ...inputProps }: Props) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-texto-suave">{etiqueta}</Text>
      <TextInput
        placeholderTextColor={colores['texto-suave']}
        className="rounded-lg border border-borde bg-superficie px-3 py-3 text-base text-texto"
        {...inputProps}
      />
    </View>
  );
}
