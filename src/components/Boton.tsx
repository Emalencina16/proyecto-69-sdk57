import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useColores } from '@/tema/useColores';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  // normal: 48 px (mínimo de la app). grande: 56 px, para controles que se
  // usan caminando (reproductor). vertical: ícono arriba del texto (cámara/galería).
  tamano?: 'normal' | 'grande' | 'vertical';
  icono?: NombreIcono;
  // Muestra la ruedita en lugar del ícono y bloquea el botón.
  cargando?: boolean;
  deshabilitado?: boolean;
  // Para cuando el texto visible no alcanza (ej. "-15s").
  accessibilityLabel?: string;
  // Solo para ubicarlo en una fila (flex-1, min-w-*); no para cambiar su aspecto.
  className?: string;
  testID?: string;
};

const ALTO = {
  normal: 'min-h-12 flex-row gap-2 px-5',
  grande: 'min-h-14 flex-row gap-2 px-5',
  vertical: 'min-h-20 gap-1 px-3 py-3',
};

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  tamano = 'normal',
  icono,
  cargando = false,
  deshabilitado = false,
  accessibilityLabel,
  className = '',
  testID,
}: Props) {
  const colores = useColores();
  const esPrimario = variante === 'primario';
  const bloqueado = deshabilitado || cargando;
  const colorContenido = esPrimario ? colores['sobre-primario'] : colores.primario;
  const tamanoIcono = tamano === 'vertical' ? 28 : 22;

  return (
    <Pressable
      onPress={onPress}
      disabled={bloqueado}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: bloqueado, busy: cargando }}
      className={`items-center justify-center rounded-control active:opacity-80 ${ALTO[tamano]} ${
        esPrimario ? 'bg-primario' : 'border border-borde bg-superficie'
      } ${deshabilitado ? 'opacity-50' : ''} ${className}`}
    >
      {cargando ? (
        <ActivityIndicator color={colorContenido} />
      ) : icono ? (
        <Ionicons name={icono} size={tamanoIcono} color={colorContenido} />
      ) : null}
      <Text
        className={`text-center text-base font-bold ${esPrimario ? 'text-sobre-primario' : 'text-primario'}`}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}
