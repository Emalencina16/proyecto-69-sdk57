import { Text } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';

export default function Mapa() {
  return (
    <Pantalla>
      <Tarjeta>
        <Text className="text-sm font-semibold uppercase text-texto-suave">Pendiente</Text>
        <Text className="text-base text-texto">Mapa con expo-location + react-native-maps, lugares cercanos (src/servicios/lugares.ts).</Text>
      </Tarjeta>
    </Pantalla>
  );
}
