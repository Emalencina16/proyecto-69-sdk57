import "../../global.css";
import { setAudioModeAsync } from "expo-audio";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { queryClient } from "@/estado/consultas";
import { SesionProvider } from "@/estado/sesion";

// GestureHandlerRootView: lo necesita el panel deslizable de lugares del mapa
// (@gorhom/bottom-sheet) para reconocer el gesto de arrastrar.
export default function RootLayout() {
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((err) => console.error(err));
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SesionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SesionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
