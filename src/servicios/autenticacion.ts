import { API_URL } from '@/config/api';
import type { UsuarioMock } from '@/mocks/usuarios';
import { ErrorServicio, errorDeRed, errorDeServidor } from '@/servicios/errores';
import type { Usuario } from '@/tipos/usuario';

// Hoy pega contra json-server (ver db.json + script "mock-api"); cuando
// llegue la API de la cátedra esto pasa a ser un POST /auth/login. La firma
// y el contrato (resuelve Usuario, lanza ErrorServicio) no cambian, así
// que login.tsx no necesita tocarse.
export async function iniciarSesion(email: string, contrasena: string): Promise<Usuario> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/usuarios?email=${encodeURIComponent(email)}`);
  } catch (error) {
    // eslint-disable-next-line no-console -- temporal, para diagnosticar el fetch a la mock API
    console.error('[iniciarSesion] fetch falló contra', API_URL, error);
    throw errorDeRed();
  }

  if (!respuesta.ok) throw errorDeServidor();

  const encontrados: UsuarioMock[] = await respuesta.json();
  const encontrado = encontrados[0];

  if (!encontrado || encontrado.contrasena !== contrasena) {
    throw new ErrorServicio({
      codigo: 'CREDENCIALES_INVALIDAS',
      mensaje: 'El email o la contraseña no son correctos.',
    });
  }

  const { contrasena: _contrasena, ...usuario } = encontrado;
  return usuario;
}
