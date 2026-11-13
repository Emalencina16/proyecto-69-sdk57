import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Text, View } from 'react-native';

import type { NombreIcono } from '@/components/Boton';
import { type Colores, useColores } from '@/tema/useColores';

type Tono = 'neutro' | 'exito' | 'advertencia' | 'error';

const ESTILO: Record<Tono, { caja: string; texto: string; color: keyof Colores }> = {
  neutro: { caja: 'border border-borde bg-superficie', texto: 'text-texto', color: 'texto' },
  exito: { caja: 'bg-exito-claro', texto: 'text-exito', color: 'exito' },
  advertencia: { caja: 'bg-advertencia-claro', texto: 'text-advertencia', color: 'advertencia' },
  error: { caja: 'bg-error-claro', texto: 'text-error', color: 'error' },
};

// Dato corto en una pastilla: "Abierto ahora", "Gratis", "Suspendido".
export function Chip({ icono, texto, tono = 'neutro' }: { icono?: NombreIcono; texto: string; tono?: Tono }) {
  const colores = useColores();
  const estilo = ESTILO[tono];
  return (
    <View className={`flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 ${estilo.caja}`}>
      {icono ? <Ionicons name={icono} size={16} color={colores[estilo.color]} /> : null}
      <Text className={`text-sm font-medium ${estilo.texto}`}>{texto}</Text>
    </View>
  );
}
