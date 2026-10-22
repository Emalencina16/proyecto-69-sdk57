import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Usuario } from '@/tipos/usuario';

// Hoy nada persiste la sesión entre reinicios (ver comentario en app/index.tsx).
// Este contexto es lo mínimo para que, mientras la app está abierta, el resto
// de las pantallas sepan qué usuario inició sesión (lo necesita Favoritos).
type Sesion = {
  usuario: Usuario | null;
  iniciar: (usuario: Usuario) => void;
  cerrar: () => void;
};

const SesionContext = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  return (
    <SesionContext.Provider value={{ usuario, iniciar: setUsuario, cerrar: () => setUsuario(null) }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion se tiene que usar dentro de <SesionProvider>.');
  return contexto;
}
