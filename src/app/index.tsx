import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSesion } from '@/estado/sesion';
import colores from '@/tema/colores';

// Si hay una sesión guardada en el teléfono se entra directo al mapa; si no,
// a login. Mientras se lee la sesión guardada se muestra un indicador.
export default function Index() {
  const { usuario, cargando } = useSesion();

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-fondo">
        <ActivityIndicator color={colores.primario} />
      </View>
    );
  }

  return <Redirect href={usuario ? '/mapa' : '/login'} />;
}
