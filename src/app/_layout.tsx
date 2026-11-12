import "../../global.css";
import { setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

import { router, Stack, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Encabezado } from "@/components/Encabezado";
import { SesionProvider } from "@/estado/sesion";
import { cancelarAvisoEvento } from "@/servicios/avisosEventos";
import { useColores, useVariablesTema } from "@/tema/useColores";

type DatosNotificacionEvento = {
  tipo: "evento-estado" | "evento-recordatorio";
  eventoId: string;
  estado?: string;
};

function leerDatosNotificacion(
  datos: Record<string, unknown> | undefined,
): DatosNotificacionEvento | null {
  if (!datos) return null;
  if (
    (datos.tipo === "evento-estado" || datos.tipo === "evento-recordatorio") &&
    typeof datos.eventoId === "string"
  ) {
    return {
      tipo: datos.tipo,
      eventoId: datos.eventoId,
      estado: typeof datos.estado === "string" ? datos.estado : undefined,
    };
  }
  return null;
}

// GestureHandlerRootView: lo necesita el panel deslizable de lugares del mapa
// (@gorhom/bottom-sheet) para reconocer el gesto de arrastrar.
export default function RootLayout() {
  const pathname = usePathname();
  const colores = useColores();
  const variablesTema = useVariablesTema();

  // Fondo de la ventana nativa (se ve un instante al abrir y al rotar).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colores.fondo).catch(() => {});
  }, [colores.fondo]);
  const respuestasProcesadas = useRef(new Set<string>());
  const rutaConVolver =
    pathname === "/login" || pathname.startsWith("/lugar/") || pathname.startsWith("/evento/");

  function volver() {
    if (router.canGoBack()) {
      router.back();
    } else if (pathname.startsWith("/lugar/")) {
      router.replace("/(tabs)/lugares");
    } else if (pathname.startsWith("/evento/")) {
      router.replace("/(tabs)/agenda");
    } else {
      router.replace("/mapa");
    }
  }

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    let vigente = true;

    async function manejarRespuesta(respuesta: Notifications.NotificationResponse) {
      const { identifier } = respuesta.notification.request;
      if (respuestasProcesadas.current.has(identifier)) return;
      respuestasProcesadas.current.add(identifier);

      const datos = leerDatosNotificacion(respuesta.notification.request.content.data);
      if (datos) {
        if (
          datos.tipo === "evento-estado" &&
          ["suspendido", "cancelado", "finalizado"].includes(datos.estado ?? "")
        ) {
          try {
            await cancelarAvisoEvento(datos.eventoId);
          } catch (err) {
            console.error('No se pudo cancelar el aviso local del evento.', err);
          }
        }

        if (vigente) {
          router.push({
            pathname: "/evento/[eventoId]",
            params: { eventoId: datos.eventoId },
          });
        }
      }

      await Notifications.clearLastNotificationResponseAsync();
    }

    const respuesta = Notifications.addNotificationResponseReceivedListener((evento) => {
      void manejarRespuesta(evento).catch((err) => {
        console.error("No se pudo procesar la respuesta a la notificación.", err);
      });
    });
    const recibida = Notifications.addNotificationReceivedListener((notificacion) => {
      const datos = leerDatosNotificacion(notificacion.request.content.data);
      if (
        datos?.tipo === "evento-estado" &&
        ["suspendido", "cancelado", "finalizado"].includes(datos.estado ?? "")
      ) {
        void cancelarAvisoEvento(datos.eventoId).catch((err) => {
          console.error("No se pudo cancelar el aviso local del evento.", err);
        });
      }
    });

    Notifications.getLastNotificationResponseAsync()
      .then((ultimaRespuesta) => {
        if (ultimaRespuesta && vigente) return manejarRespuesta(ultimaRespuesta);
      })
      .catch((err) => {
        console.error("No se pudo leer la notificación que abrió la app.", err);
      });

    return () => {
      vigente = false;
      respuesta.remove();
      recibida.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* La franja de arriba es primario-oscuro en los dos temas: texto claro. */}
      <StatusBar style="light" />
      {/* Variables de color del tema del teléfono: las leen todas las clases. */}
      <View style={[{ flex: 1 }, variablesTema]}>
        <SesionProvider>
          <Encabezado onBack={rutaConVolver ? volver : undefined} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }} />
        </SesionProvider>
      </View>
    </GestureHandlerRootView>
  );
}
