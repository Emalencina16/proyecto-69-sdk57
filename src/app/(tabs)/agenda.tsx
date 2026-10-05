import { Text } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';

export default function Agenda() {
  return (
    <Pantalla>
      <Tarjeta>
        <Text className="text-sm font-semibold uppercase text-texto-suave">Pendiente</Text>
        <Text className="text-base text-texto">Eventos por día, empezando por hoy (src/servicios/eventos.ts).</Text>
      </Tarjeta>
    </Pantalla>
  );
}
