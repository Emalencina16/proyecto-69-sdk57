import type { Usuario } from '@/tipos/usuario';

// El PRD no define credenciales (la API real de la cátedra las va a manejar).
// Mientras tanto, cada mock de Usuario se completa acá con una contraseña
// de prueba para poder simular el login. Este campo NO existe en el tipo
// Usuario real y no debe usarse fuera de src/servicios/autenticacion.ts.
//
// Este mismo array es la fuente de los datos servidos por json-server
// (ver db.json y el script "mock-api" en package.json). Si se agrega o
// edita un usuario acá, hay que reflejar el cambio en db.json.
export interface UsuarioMock extends Usuario {
  contrasena: string;
}

export const usuariosMock: UsuarioMock[] = [
  {
    id: 'usr-201',
    nombre: 'Lucía Méndez',
    email: 'lucia@mail.com',
    avatarUrl: null,
    creadoEn: '2026-09-02T18:20:00-03:00',
    contrasena: '123456',
    preferencias: {
      categoriasFavoritas: ['cat-museos', 'cat-playas'],
      avisarProximidad: true,
      radioAvisoMetros: 250,
      tema: 'sistema',
    },
  },
  {
    id: 'usr-202',
    nombre: 'Valeria Sosa',
    email: 'valeria@colon.tur.ar',
    avatarUrl: null,
    creadoEn: '2026-01-15T09:00:00-03:00',
    contrasena: 'turismo2026',
    preferencias: {
      categoriasFavoritas: [],
      avisarProximidad: false,
      radioAvisoMetros: 500,
      tema: 'claro',
    },
  },
];
