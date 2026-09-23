import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { iniciarSesion } from '@/servicios/autenticacion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(email, contrasena);
      router.replace('/mapa');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-fondo">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-8 gap-1">
          <Text className="text-center text-3xl font-bold text-primario">Mi Ciudad Colón</Text>
          <Text className="text-center text-base text-texto-suave">Ingresá para continuar</Text>
        </View>

        <View className="gap-4">
          <Campo
            etiqueta="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@email.com"
            testID="input-email"
          />

          <Campo
            etiqueta="Contraseña"
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            placeholder="••••••••"
            testID="input-contrasena"
          />

          {error && <Text className="text-sm text-error">{error}</Text>}

          <View className="mt-2">
            <Boton titulo={cargando ? 'Ingresando...' : 'Ingresar'} onPress={handleSubmit} deshabilitado={cargando} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
