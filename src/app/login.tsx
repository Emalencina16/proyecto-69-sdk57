import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { useSesion } from '@/estado/sesion';
import { iniciarSesion } from '@/servicios/autenticacion';
import { useColores } from '@/tema/useColores';

export default function Login() {
  const colores = useColores();
  const sesion = useSesion();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al login se llega desde una pantalla (el corazón del mapa, Yo, Mi
  // recorrido): se vuelve a esa. Si se abrió solo (ej. sesión vencida), al mapa.
  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/mapa');
  }

  async function handleSubmit() {
    setError(null);
    setCargando(true);
    try {
      await sesion.iniciar(await iniciarSesion(email, contrasena));
      volver();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-fondo" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-8 items-center gap-2">
          {/* El logo ya está en el encabezado: acá, un ícono para no repetirlo. */}
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primario-claro">
            <Ionicons name="person-circle-outline" size={48} color={colores.primario} />
          </View>
          <Text accessibilityRole="header" className="mt-2 text-center text-3xl font-bold text-texto">
            Ingresá a tu cuenta
          </Text>
          <Text className="text-center text-base text-texto-suave">Guardá tus favoritos y tu recorrido</Text>
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

          {error ? <Aviso tono="error">{error}</Aviso> : null}

          <View className="mt-2">
            <Boton
              titulo={cargando ? 'Ingresando...' : 'Ingresar'}
              icono="log-in-outline"
              onPress={handleSubmit}
              cargando={cargando}
            />
          </View>

          <Boton titulo="Seguir sin cuenta" variante="secundario" onPress={volver} deshabilitado={cargando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
