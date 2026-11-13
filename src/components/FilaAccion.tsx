import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, Text } from 'react-native';

import type { NombreIcono } from '@/components/Boton';
import { useColores } from '@/tema/useColores';

type Props = {
  icono: NombreIcono;
  texto: string;
  // Sin acción la fila es solo informativa (ícono + texto).
  accion?: string;
  onPress?: () => void;
  // Línea arriba, para apilar filas dentro de una Tarjeta sin relleno.
  separador?: boolean;
};

// Fila de borde a borde dentro de una tarjeta: dirección → Cómo llegar,
// teléfono → Llamar, web → Abrir.
export function FilaAccion({ icono, texto, accion, onPress, separador = false }: Props) {
  const colores = useColores();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accion ? `${accion}: ${texto}` : texto}
      className={`min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-primario-claro ${
        separador ? 'border-t border-borde' : ''
      }`}
    >
      <Ionicons name={icono} size={22} color={colores.primario} />
      <Text className="flex-1 text-base text-texto">{texto}</Text>
      {accion ? <Text className="text-base font-bold text-primario">{accion}</Text> : null}
    </Pressable>
  );
}
