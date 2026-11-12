import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Text, View } from 'react-native';

import { Boton, type NombreIcono } from '@/components/Boton';
import { useColores } from '@/tema/useColores';

type Props = {
  icono: NombreIcono;
  titulo: string;
  mensaje?: string;
  // error: mismo bloque con el ícono en rojo (falló la carga, no hay nada que mostrar).
  tono?: 'neutro' | 'error';
  accion?: { titulo: string; onPress: () => void };
  className?: string;
};

// Pantalla o lista sin contenido: ícono, explicación y, si hay, qué hacer.
export function EstadoVacio({ icono, titulo, mensaje, tono = 'neutro', accion, className = '' }: Props) {
  const colores = useColores();
  const esError = tono === 'error';

  return (
    <View
      accessibilityRole={esError ? 'alert' : undefined}
      className={`items-center gap-3 px-4 py-8 ${className}`}
    >
      <View
        className={`h-16 w-16 items-center justify-center rounded-full ${
          esError ? 'bg-error-claro' : 'bg-primario-claro'
        }`}
      >
        <Ionicons name={icono} size={32} color={esError ? colores.error : colores.primario} />
      </View>
      <Text className="text-center text-lg font-semibold text-texto">{titulo}</Text>
      {mensaje ? <Text className="text-center text-base text-texto-suave">{mensaje}</Text> : null}
      {accion ? (
        <Boton titulo={accion.titulo} onPress={accion.onPress} className="mt-2 self-stretch" />
      ) : null}
    </View>
  );
}
