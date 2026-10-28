import { pedirUno } from '@/servicios/cliente';
import type { Sesion } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';

// Si el email o la contraseña no coinciden, la API responde
// CREDENCIALES_INVALIDAS y el cliente lo lanza como ErrorServicio con el
// mensaje listo para mostrar.
export async function iniciarSesion(email: string, contrasena: string): Promise<Sesion> {
  return pedirUno<Sesion>('/auth/ingreso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), contrasena }),
  });
}

// El usuario dueño del token actual.
export async function obtenerYo(): Promise<Usuario> {
  return pedirUno<Usuario>('/yo');
}
