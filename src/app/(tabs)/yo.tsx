import { router } from 'expo-router';
import { Text } from 'react-native';

import { Boton } from '@/components/Boton';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';

export default function Yo() {
  return (
    <Pantalla>
      <Tarjeta>
        <Text className="text-sm font-semibold uppercase text-texto-suave">Pendiente</Text>
        <Text className="text-base text-texto">
          Perfil, favoritos y preferencias (falta persistir la sesión para saber quién sos).
        </Text>
      </Tarjeta>
      <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => router.replace('/login')} />
    </Pantalla>
  );
}
