import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { obtenerYo } from '@/servicios/autenticacion';
import { configurarAlVencerSesion, configurarToken } from '@/servicios/cliente';
import { pedirHuella } from '@/servicios/huella';
import {
  borrarSesion,
  guardarPideHuella,
  guardarSesion,
  leerPideHuella,
  leerSesion,
} from '@/servicios/sesionGuardada';
import type { Sesion as SesionApi } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';

// La sesión persiste en SecureStore (ver servicios/sesionGuardada.ts). Al abrir
// la app se recupera la guardada y se entra sin esperar a la red; en segundo
// plano se pide GET /yo para refrescar el usuario. Si el token venció, la API
// responde 401 y el cliente llama a cerrar().
//
// Huella (PRD §5, opcional): si la persona la activó, antes de usar la sesión
// guardada se pide la huella. Si cancela, la app sigue sin cuenta (el mapa se
// mira igual) y la sesión queda "bloqueada": guardada pero sin usar, hasta que
// ponga la huella desde Yo o ingrese con email y contraseña.
//
// También se pide al volver a la app si estuvo más de 5 minutos en segundo
// plano (como las apps de bancos). Menos que eso no, para no molestar a quien
// sale un momento a otra app y vuelve.
const MINUTOS_EN_SEGUNDO_PLANO = 5;

type Sesion = {
  usuario: Usuario | null;
  cargando: boolean; // true mientras se lee la sesión guardada al arrancar
  bloqueada: boolean; // hay sesión guardada esperando la huella
  pideHuella: boolean; // la persona eligió que se le pida la huella al abrir
  iniciar: (sesion: SesionApi) => Promise<void>;
  cerrar: () => Promise<void>;
  desbloquear: () => Promise<boolean>;
  cambiarPideHuella: (pide: boolean) => Promise<boolean>;
};

const SesionContext = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [bloqueada, setBloqueada] = useState(false);
  const [pideHuella, setPideHuella] = useState(false);

  // Pone en uso una sesión guardada.
  const usar = useCallback((guardada: SesionApi) => {
    configurarToken(guardada.token);
    setUsuario(guardada.usuario);
    setBloqueada(false);
    // Sin señal falla y no pasa nada: seguimos con el usuario guardado.
    obtenerYo()
      .then((actual) => guardarSesion({ token: guardada.token, usuario: actual }).then(() => setUsuario(actual)))
      .catch(() => {});
  }, []);

  const cerrar = useCallback(async () => {
    configurarToken(null);
    setUsuario(null);
    setBloqueada(false);
    setPideHuella(false);
    await borrarSesion();
  }, []);

  const iniciar = useCallback(async (sesion: SesionApi) => {
    // Si ingresa otra persona en este teléfono, no hereda la huella de la anterior.
    const anterior = await leerSesion();
    if (anterior && anterior.usuario.id !== sesion.usuario.id) {
      await guardarPideHuella(false);
      setPideHuella(false);
    }
    configurarToken(sesion.token);
    setUsuario(sesion.usuario);
    setBloqueada(false);
    await guardarSesion(sesion);
  }, []);

  const desbloquear = useCallback(async () => {
    const guardada = await leerSesion();
    if (!guardada || !(await pedirHuella('Confirmá que sos vos para entrar'))) return false;
    usar(guardada);
    return true;
  }, [usar]);

  // Para activarla se pide la huella: así se confirma que el sensor anda y que
  // la huella registrada es de quien tiene la sesión. Desactivarla no la pide.
  const cambiarPideHuella = useCallback(async (pide: boolean) => {
    if (pide && !(await pedirHuella('Confirmá tu huella para activarla'))) return false;
    await guardarPideHuella(pide);
    setPideHuella(pide);
    return true;
  }, []);

  useEffect(() => {
    configurarAlVencerSesion(() => {
      cerrar();
      // Encima de la pantalla actual: si elige "Seguir sin cuenta" vuelve ahí.
      router.push('/login');
    });

    (async () => {
      const guardada = await leerSesion();
      if (guardada) {
        const pide = await leerPideHuella();
        setPideHuella(pide);
        if (!pide || (await pedirHuella('Confirmá que sos vos para entrar'))) usar(guardada);
        else setBloqueada(true);
      }
      setCargando(false);
    })();
  }, [cerrar, usar]);

  // El listener de AppState se registra una sola vez: lee usuario y
  // pideHuella por ref para ver siempre el valor actual.
  const enUso = useRef(false);
  const pide = useRef(false);
  const salioEn = useRef<number | null>(null);
  useEffect(() => {
    enUso.current = usuario !== null;
    pide.current = pideHuella;
  }, [usuario, pideHuella]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', async (estado) => {
      if (estado === 'background') {
        salioEn.current = Date.now();
        return;
      }
      if (estado !== 'active' || salioEn.current === null) return;

      const minutosAfuera = (Date.now() - salioEn.current) / 60_000;
      salioEn.current = null;
      if (!enUso.current || !pide.current || minutosAfuera < MINUTOS_EN_SEGUNDO_PLANO) return;

      // Se deja de usar la sesión hasta que ponga la huella; queda guardada.
      configurarToken(null);
      setUsuario(null);
      setBloqueada(true);
      const guardada = await leerSesion();
      if (guardada && (await pedirHuella('Confirmá que sos vos para entrar'))) usar(guardada);
    });
    return () => suscripcion.remove();
  }, [usar]);

  return (
    <SesionContext.Provider
      value={{ usuario, cargando, bloqueada, pideHuella, iniciar, cerrar, desbloquear, cambiarPideHuella }}
    >
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion se tiene que usar dentro de <SesionProvider>.');
  return contexto;
}
