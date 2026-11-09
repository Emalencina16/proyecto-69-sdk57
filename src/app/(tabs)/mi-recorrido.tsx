import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";

import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { useSesion } from "@/estado/sesion";
import { obtenerLugares } from "@/servicios/lugares";
import { obtenerVisitas, registrarVisita } from "@/servicios/visitas";
import type { Lugar } from "@/tipos/lugar";
import type { Visita } from "@/tipos/visita";

export default function MiRecorrido() {
  const { usuario } = useSesion();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [registrando, setRegistrando] = useState(false);
  const [lugarElegido, setLugarElegido] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(
    async (segundoPlano = false) => {
      if (!usuario) {
        setVisitas([]);
        setCargando(false);
        return;
      }
      if (!segundoPlano) setCargando(true);
      setError(null);
      try {
        const [v, l] = await Promise.all([
          obtenerVisitas(),
          obtenerLugares().catch(() => [] as Lugar[]),
        ]);
        setVisitas(v);
        setLugares(l);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos cargar tu recorrido.");
      } finally {
        setCargando(false);
      }
    },
    [usuario],
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const nombreDe = (id: string) => lugares.find((l) => l.id === id)?.nombre ?? id;

  function abrirFormulario() {
    setAviso(null);
    setRegistrando(true);
  }

  function cerrarFormulario() {
    setRegistrando(false);
    setLugarElegido(null);
    setNota("");
    setErrorRegistro(null);
  }

  async function confirmar() {
    if (!lugarElegido) return;
    setGuardando(true);
    setErrorRegistro(null);
    try {
      const registrada = await registrarVisita({
        lugarId: lugarElegido,
        origen: "manual",
        nota: nota.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAviso(
        registrada.sincronizada
          ? "Visita registrada."
          : "Visita guardada en tu teléfono. Se sube cuando vuelva la señal.",
      );
      cerrarFormulario();
      await cargar(true);
    } catch (e) {
      setErrorRegistro(e instanceof Error ? e.message : "No se pudo registrar la visita.");
    } finally {
      setGuardando(false);
    }
  }

  if (!usuario) {
    return (
      <Pantalla>
        <Text className="text-base text-texto">
          Ingresá para ver y guardar los lugares que visitaste.
        </Text>
        <Boton titulo="Ingresar" onPress={() => router.push("/login")} />
      </Pantalla>
    );
  }

  if (cargando) {
    return (
      <Pantalla>
        <Text className="text-base text-texto">Cargando tu recorrido...</Text>
      </Pantalla>
    );
  }

  if (error) {
    return (
      <Pantalla>
        <Text className="text-base text-texto">{error}</Text>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {aviso ? (
          <Text className="text-base font-semibold text-texto">{aviso}</Text>
        ) : null}

        {visitas.length === 0 ? (
          <Text className="text-base text-texto">
            Todavía no registraste ninguna visita.
          </Text>
        ) : (
          visitas.map((visita) => (
            <Tarjeta key={visita.id}>
              <Text className="text-sm font-semibold uppercase text-texto">
                {nombreDe(visita.lugarId)}
              </Text>
              <Text className="text-base text-texto">
                {new Date(visita.fechaHora).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </Text>
              {visita.nota ? (
                <Text className="text-base text-texto">{visita.nota}</Text>
              ) : null}
              {!visita.sincronizada ? (
                <Text className="text-sm text-texto">Pendiente de subir</Text>
              ) : null}
            </Tarjeta>
          ))
        )}

        {!registrando ? (
          <Boton titulo="Registrar visita" onPress={abrirFormulario} />
        ) : (
          <>
            <Text className="text-base font-semibold text-texto mt-4">¿Dónde estuviste?</Text>

            {lugares.length === 0 ? (
              <Text className="text-base text-texto">
                No pudimos cargar los lugares. Probá de nuevo con señal.
              </Text>
            ) : (
              lugares.map((l) => (
                <Boton
                  key={l.id}
                  titulo={l.nombre}
                  variante={lugarElegido === l.id ? "primario" : "secundario"}
                  onPress={() => setLugarElegido(l.id)}
                />
              ))
            )}

            <Campo
              etiqueta="Nota (opcional)"
              value={nota}
              onChangeText={setNota}
              maxLength={200}
              multiline
            />

            {errorRegistro ? (
              <Text className="text-base text-error">{errorRegistro}</Text>
            ) : null}

            <Boton
              titulo={guardando ? "Guardando..." : "Confirmar"}
              onPress={confirmar}
              deshabilitado={!lugarElegido || guardando}
            />
            <Boton titulo="Cancelar" variante="secundario" onPress={cerrarFormulario} />
          </>
        )}
      </ScrollView>
    </Pantalla>  );
}