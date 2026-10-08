import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import colores from '@/tema/colores';
import type { Categoria } from '@/tipos/categoria';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

type Props = {
  categorias: Categoria[];
  seleccionada: string | null; // null = todas
  onSeleccionar: (categoriaId: string | null) => void;
};

// Fila de chips horizontal. Botones altos (PDF: se usa con una mano y al sol).
export function FiltroCategorias({ categorias, seleccionada, onSeleccionar }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5 py-3"
      // grow-0 + shrink-0: la fila mide lo que miden los chips; si no, la lista
      // de abajo la achica y el mapa le tapa la mitad.
      className="shrink-0 grow-0 border-b border-borde bg-superficie"
    >
      <Chip
        nombre="Todas"
        icono="apps-outline"
        color={colores.primario}
        activo={seleccionada === null}
        onPress={() => onSeleccionar(null)}
      />
      {categorias.map((categoria) => (
        <Chip
          key={categoria.id}
          nombre={categoria.nombre}
          // El dato viene como string; el nombre lo cargamos nosotros (ver db.json).
          icono={categoria.icono as NombreIcono}
          color={categoria.color}
          activo={seleccionada === categoria.id}
          onPress={() => onSeleccionar(categoria.id)}
        />
      ))}
    </ScrollView>
  );
}

type PropsChip = {
  nombre: string;
  icono: NombreIcono;
  color: string;
  activo: boolean;
  onPress: () => void;
};

function Chip({ nombre, icono, color, activo, onPress }: PropsChip) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className="min-h-12 flex-row items-center gap-2 rounded-full border-2 px-4 active:opacity-80"
      // Color dinámico por categoría: no se puede con clases de Tailwind.
      style={{ borderColor: color, backgroundColor: activo ? color : colores.superficie }}
    >
      <Ionicons name={icono} size={20} color={activo ? '#ffffff' : color} />
      <Text className={`text-base font-semibold ${activo ? 'text-white' : 'text-texto'}`}>{nombre}</Text>
    </Pressable>
  );
}
