import { usuariosMock } from '@/mocks/usuarios';
import type { Usuario } from '@/tipos/usuario';

// Mismo shape de error que va a devolver la API real (ver PRD).
export interface ErrorApi {
  codigo: string;
  mensaje: string;
}

export class ErrorAutenticacion extends Error {
  codigo: string;

  constructor({ codigo, mensaje }: ErrorApi) {
    super(mensaje);
    this.codigo = codigo;
  }
}

function simularRedAsincrona<T>(valor: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

// Hoy busca en el mock; cuando llegue la API de la cátedra esto pasa a ser
// un fetch a POST /auth/login.
export async function iniciarSesion(email: string, contrasena: string): Promise<Usuario> {
  await simularRedAsincrona(null);

  const encontrado = usuariosMock.find((u) => u.email === email);

  if (!encontrado || encontrado.contrasena !== contrasena) {
    throw new ErrorAutenticacion({
      codigo: 'CREDENCIALES_INVALIDAS',
      mensaje: 'El email o la contraseña no son correctos.',
    });
  }

  const { contrasena: _contrasena, ...usuario } = encontrado;
  return usuario;
}
