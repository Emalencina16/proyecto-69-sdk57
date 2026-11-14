import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { useSesion } from "@/estado/sesion";
import { obtenerCatalogo } from "@/servicios/catalogo";
import { obtenerRecorrido, registrarVisita } from "@/servicios/visitas";
import type { Lugar } from "@/tipos/lugar";
import type { Visita } from "@/tipos/visita";
import colores from "@/tema/colores";

// quality 0.5 deja la foto muy por debajo del límite de 5 MB de la API.
const OPCIONES_FOTO: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.5,
};

export default function MiRecorrido() {
  const { usuario } = useSesion();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [lugarElegido, setLugarElegido] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
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
        // Sin señal, los dos devuelven lo guardado en el teléfono. Sin lugares
        // se ve igual el recorrido (con el id en lugar del nombre).
        const [recorrido, catalogo] = await Promise.all([
          obtenerRecorrido(),
          obtenerCatalogo().catch(() => null),
        ]);
        setVisitas(recorrido.visitas);
        setLugares(catalogo?.lugares ?? []);
        setSinConexion(recorrido.sinConexion || !catalogo || catalogo.sinConexion);
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
    setFoto(null);
    setErrorRegistro(null);
  }

  // Cámara (lo que pide el PRD: "sacar una foto en el lugar") o galería.
  // La galería no pide permiso en Android/iOS modernos; la cámara sí.
  async function elegirFoto(desde: "camara" | "galeria") {
    setErrorRegistro(null);
    try {
      if (desde === "camara") {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
          setErrorRegistro("Sin permiso de cámara. Podés elegir una foto de la galería.");
          return;
        }
      }
      const resultado =
        desde === "camara"
          ? await ImagePicker.launchCameraAsync(OPCIONES_FOTO)
          : await ImagePicker.launchImageLibraryAsync(OPCIONES_FOTO);
      if (!resultado.canceled) setFoto(resultado.assets[0].uri);
    } catch {
      setErrorRegistro("No pudimos abrir la cámara ni la galería.");
    }
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
        foto,
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
        {sinConexion ? (
          <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-borde bg-primario-claro px-4 py-3">
            <Ionicons name="cloud-offline-outline" size={24} color={colores.primario} />
            <Text className="flex-1 text-base text-texto">
              Sin conexión. Te mostramos lo guardado en el teléfono; las visitas nuevas se suben
              cuando vuelva la señal.
            </Text>
          </View>
        ) : null}
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
              {visita.fotoUri ? (
                <Image
                  source={{ uri: visita.fotoUri }}
                  contentFit="cover"
                  accessibilityLabel={`Foto de la visita a ${nombreDe(visita.lugarId)}`}
                  style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }}
                />
              ) : null}
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

            {foto ? (
              <View>
                <Image
                  source={{ uri: foto }}
                  contentFit="cover"
                  accessibilityLabel="Foto elegida para la visita"
                  style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }}
                />
                <Pressable
                  onPress={() => setFoto(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar foto"
                  hitSlop={8}
                  className="absolute right-2 top-2 rounded-full bg-superficie active:opacity-80"
                >
                  <Ionicons name="close-circle" size={32} color={colores.error} />
                </Pressable>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <BotonFoto
                  icono="camera-outline"
                  titulo="Cámara"
                  descripcion="Sacar foto con la cámara"
                  onPress={() => elegirFoto("camara")} />
                <BotonFoto
                  icono="images-outline"
                  titulo="Galería"
                  descripcion="Elegir foto de la galería"
                  onPress={() => elegirFoto("galeria")} />
              </View>
            )}

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

// Mismo aspecto que el Boton secundario, con ícono arriba del texto.
function BotonFoto({
  icono,
  titulo,
  descripcion,
  onPress,
}: {
  icono: "camera-outline" | "images-outline";
  titulo: string;
  descripcion: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      className="min-h-20 flex-1 items-center justify-center gap-1 rounded-xl border border-borde bg-superficie px-3 py-3 active:opacity-80"
    >
      <Ionicons name={icono} size={28} color={colores.primario} />
      <Text className="text-base font-bold text-primario">{titulo}</Text>
    </Pressable>
  );
}