import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColores } from '@/tema/useColores';

type Props = {
  onBack?: () => void;
};

export function Encabezado({ onBack }: Props) {
  const colores = useColores();
  return (
    <SafeAreaView edges={['top']} className="bg-primario-oscuro">
      <View className="h-14 flex-row items-center justify-center bg-primario-oscuro px-4">
        {/* Marca centrada: nombre de la app + logo de Colón como una sola pieza.
            Volver va aparte a la izquierda para no correr el centro. */}
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Mi Ciudad, Colón, Entre Ríos"
          className="flex-row items-center gap-3"
        >
          <Text className="text-2xl font-bold text-sobre-primario">Mi Ciudad</Text>
          <View className="h-7 w-px bg-sobre-primario/40" />
          <Image
            source={require('../../assets/images/logo.png')}
            contentFit="contain"
            // Proporción del archivo (1248×613).
            style={{ width: 74, height: 36 }}
          />
        </View>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            className="absolute bottom-0 left-2 top-0 w-12 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color={colores['sobre-primario']} />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
