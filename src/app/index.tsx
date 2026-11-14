import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSesion } from '@/estado/sesion';
import colores from '@/tema/colores';

// La app abre siempre en el mapa: para mirar no hace falta cuenta (PRD §5, "la
// cuenta es para guardar cosas"). El login aparece cuando la persona quiere
// guardar algo. Se espera a leer la sesión guardada para que el mapa ya
// arranque con los favoritos de quien estaba logueado.
export default function Index() {
  const { cargando } = useSesion();

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-fondo">
        <ActivityIndicator color={colores.primario} />
      </View>
    );
  }

  return <Redirect href="/mapa" />;
}
