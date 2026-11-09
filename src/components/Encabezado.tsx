import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import colores from '@/tema/colores';

type Props = {
  onBack?: () => void;
};

export function Encabezado({ onBack }: Props) {
  return (
    <SafeAreaView edges={['top']} className="bg-primario-oscuro">
      <View className="h-14 flex-row items-center gap-3 border-b border-borde bg-superficie px-4">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color={colores.texto} />
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}
        <Image
          source={require('../../assets/images/logo.png')}
          contentFit="contain"
          accessibilityLabel="Colón, Entre Ríos"
          style={{ width: 112, height: 50 }}
        />
      </View>
    </SafeAreaView>
  );
}
