import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { obtenerYo } from '@/servicios/autenticacion';
import { configurarAlVencerSesion, configurarToken } from '@/servicios/cliente';
import { borrarSesion, guardarSesion, leerSesion } from '@/servicios/sesionGuardada';
import type { Sesion as SesionApi } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';

// La sesión persiste en SecureStore (ver servicios/sesionGuardada.ts). Al abrir
// la app se recupera la guardada y se entra sin esperar a la red; en segundo
// plano se pide GET /yo para refrescar el usuario. Si el token venció, la API
// responde 401 y el cliente llama a cerrar().
type Sesion = {
  usuario: Usuario | null;
  cargando: boolean; // true mientras se lee la sesión guardada al arrancar
  iniciar: (sesion: SesionApi) => Promise<void>;
  cerrar: () => Promise<void>;
};

const SesionContext = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const cerrar = useCallback(async () => {
    configurarToken(null);
    setUsuario(null);
    await borrarSesion();
  }, []);

  const iniciar = useCallback(async (sesion: SesionApi) => {
    configurarToken(sesion.token);
    setUsuario(sesion.usuario);
    await guardarSesion(sesion);
  }, []);

  useEffect(() => {
    configurarAlVencerSesion(() => {
      cerrar();
      // Encima de la pantalla actual: si elige "Seguir sin cuenta" vuelve ahí.
      router.push('/login');
    });

    leerSesion().then((guardada) => {
      if (guardada) {
        configurarToken(guardada.token);
        setUsuario(guardada.usuario);
        // Sin señal falla y no pasa nada: seguimos con el usuario guardado.
        obtenerYo()
          .then((actual) => guardarSesion({ token: guardada.token, usuario: actual }).then(() => setUsuario(actual)))
          .catch(() => {});
      }
      setCargando(false);
    });
  }, [cerrar]);

  return (
    <SesionContext.Provider value={{ usuario, cargando, iniciar, cerrar }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion se tiene que usar dentro de <SesionProvider>.');
  return contexto;
}
