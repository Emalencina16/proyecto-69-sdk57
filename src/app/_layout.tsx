import "../../global.css";
import { setAudioModeAsync } from "expo-audio";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
      <SesionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SesionProvider>
    </GestureHandlerRootView>
  );
}
