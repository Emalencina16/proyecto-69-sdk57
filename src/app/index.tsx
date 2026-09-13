import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

import { iniciarSesion } from '@/servicios/autenticacion';
import type { Usuario } from '@/tipos/usuario';

export default function Login() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  async function handleSubmit() {
    setError(null);
    setCargando(true);
    try {
      const usuarioLogueado = await iniciarSesion(email, contrasena);
      setUsuario(usuarioLogueado);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  }

  if (usuario) {
    return (
      <View>
        <Text>Bienvenido/a, {usuario.nombre}</Text>
        <Text>{usuario.email}</Text>
        <Button title="Cerrar sesión" onPress={() => setUsuario(null)} />
      </View>
    );
  }

  return (
    <View>
      <Text>Mi Ciudad Colón</Text>

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        testID="input-email"
      />

      <Text>Contraseña</Text>
      <TextInput
        value={contrasena}
        onChangeText={setContrasena}
        secureTextEntry
        testID="input-contrasena"
      />

      {error && <Text>{error}</Text>}

      <Button title={cargando ? 'Ingresando...' : 'Ingresar'} onPress={handleSubmit} disabled={cargando} />
    </View>
  );
}
