import { Pressable, Text } from 'react-native';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
  testID?: string;
};

export function Boton({ titulo, onPress, variante = 'primario', deshabilitado = false, testID }: Props) {
  const esPrimario = variante === 'primario';

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      testID={testID}
      className={`items-center rounded-lg px-4 py-3 active:opacity-80 ${
        esPrimario ? 'bg-primario' : 'border border-borde bg-superficie'
      } ${deshabilitado ? 'opacity-50' : ''}`}
    >
      <Text className={`text-base font-semibold ${esPrimario ? 'text-white' : 'text-texto'}`}>{titulo}</Text>
    </Pressable>
  );
}
