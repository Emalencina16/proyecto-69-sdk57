import "../../global.css";
import { setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";

import { router, Stack, usePathname } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Encabezado } from "@/components/Encabezado";
import { SesionProvider } from "@/estado/sesion";

// GestureHandlerRootView: lo necesita el panel deslizable de lugares del mapa
// (@gorhom/bottom-sheet) para reconocer el gesto de arrastrar.
export default function RootLayout() {
  const pathname = usePathname();
  const rutaConVolver = pathname === "/login" || pathname.startsWith("/lugar/");

  function volver() {
    if (router.canGoBack()) {
      router.back();
    } else if (pathname.startsWith("/lugar/")) {
      router.replace("/(tabs)/lugares");
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SesionProvider>
        <Encabezado onBack={rutaConVolver ? volver : undefined} />
        <Stack screenOptions={{ headerShown: false }} />
      </SesionProvider>
    </GestureHandlerRootView>
  );
}
