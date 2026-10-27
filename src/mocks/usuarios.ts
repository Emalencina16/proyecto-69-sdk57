import type { Usuario } from '@/tipos/usuario';

// El PRD no define credenciales (la API real de la cátedra las va a manejar).
// Mientras tanto, los usuarios de db.json (servidos por json-server, ver el
// script "mock-api" en package.json) incluyen una contraseña de prueba para
// poder simular el login. Este campo NO existe en el tipo Usuario real y no
// debe usarse fuera de src/servicios/autenticacion.ts.
export interface UsuarioMock extends Usuario {
  contrasena: string;
}
