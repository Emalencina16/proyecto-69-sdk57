import { Text } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';

export default function MiRecorrido() {
  return (
    <Pantalla>
      <Tarjeta>
        <Text className="text-sm font-semibold uppercase text-texto-suave">Pendiente</Text>
        <Text className="text-base text-texto">Visitas registradas (QR, GPS o manual) con foto y nota (src/servicios/visitas.ts).</Text>
      </Tarjeta>
    </Pantalla>
  );
}
