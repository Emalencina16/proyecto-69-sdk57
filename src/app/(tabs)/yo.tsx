import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function Yo() {
  return (
    <View>
      <Text>Yo</Text>
      <Text>Pendiente: perfil, favoritos y preferencias (falta persistir la sesión para saber quién sos).</Text>
      <Button title="Cerrar sesión" onPress={() => router.replace('/login')} />
    </View>
  );
}
