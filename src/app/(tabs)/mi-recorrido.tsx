import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Aviso } from "@/components/Aviso";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Cargando } from "@/components/Cargando";
import { EscanerQr } from "@/components/EscanerQr";
import { EstadoVacio } from "@/components/EstadoVacio";
import { EtiquetaSeccion } from "@/components/EtiquetaSeccion";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Titulo } from "@/components/Titulo";
import { useSesion } from "@/estado/sesion";
import { obtenerCatalogo } from "@/servicios/catalogo";
import {
  buscarLugaresCercanos,
  ErrorCercania,
  RADIO_VISITA_METROS,
  type LugarCercano,
} from "@/servicios/cercania";
import { ErrorServicio } from "@/servicios/errores";
import { obtenerLugarPorQr } from "@/servicios/lugares";
import { obtenerRecorrido, registrarVisita } from "@/servicios/visitas";
import type { Lugar } from "@/tipos/lugar";
import type { OrigenVisita, Visita } from "@/tipos/visita";
import { formatearDistancia } from "@/utilidades/distancia";
import { leerCodigoQr } from "@/utilidades/qr";
import { useColores } from "@/tema/useColores";
import radios from "@/tema/radios";

// Mismo texto que el error QR_NO_RECONOCIDO de la API.
const QR_AJENO = "Ese código no es de Mi Ciudad. Probá con el cartel de otro lugar.";

// quality 0.5 deja la foto muy por debajo del límite de 5 MB de la API.
const OPCIONES_FOTO: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.5,
};

export default function MiRecorrido() {
  const colores = useColores();
  const { usuario } = useSesion();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [lugarElegido, setLugarElegido] = useState<string | null>(null);
  // "qr" si el lugar salió del cartel; si después lo cambia a mano, "manual".
  const [origen, setOrigen] = useState<OrigenVisita>("manual");
  const [escaneando, setEscaneando] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  // Con origen "gps": los lugares dentro del radio, del más cercano al más lejano.
  const [cercanos, setCercanos] = useState<LugarCercano[]>([]);
  const [nota, setNota] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tono: "exito" | "advertencia" } | null>(null);

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
  const lugaresVisitados = new Set(visitas.map((v) => v.lugarId)).size;

  function abrirFormulario() {
    setAviso(null);
    setRegistrando(true);
  }

  function cerrarFormulario() {
    setRegistrando(false);
    setLugarElegido(null);
    setOrigen("manual");
    setCercanos([]);
    setNota("");
    setFoto(null);
    setErrorRegistro(null);
  }

  function elegirLugarAMano(id: string | null) {
    setLugarElegido(id);
    setOrigen("manual");
  }

  // "Estando físicamente cerca" (PRD): si hay lugares a menos del radio, abre
  // el formulario con el más cercano elegido; si hay varios, deja elegir
  // entre esos sin perder el origen "gps".
  async function registrarPorCercania() {
    setAviso(null);
    setErrorRegistro(null);
    // Con el formulario abierto el aviso va adentro, al lado de los botones.
    const avisar = (texto: string) =>
      registrando ? setErrorRegistro(texto) : setAviso({ texto, tono: "advertencia" });
    if (lugares.length === 0) {
      avisar("No pudimos cargar los lugares. Probá de nuevo con señal.");
      return;
    }
    setBuscandoUbicacion(true);
    try {
      const { cercanos: encontrados, masCercano } = await buscarLugaresCercanos(lugares);
      if (encontrados.length === 0) {
        avisar(
          masCercano
            ? `No hay lugares a menos de ${RADIO_VISITA_METROS} m. El más cercano es ${masCercano.lugar.nombre}, a ${formatearDistancia(masCercano.distancia)}.`
            : `No hay lugares a menos de ${RADIO_VISITA_METROS} m.`,
        );
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCercanos(encontrados);
      setLugarElegido(encontrados[0].lugar.id);
      setOrigen("gps");
      setErrorRegistro(null);
      setRegistrando(true);
    } catch (e) {
      avisar(e instanceof ErrorCercania ? e.message : "No pudimos encontrar tu ubicación.");
    } finally {
      setBuscandoUbicacion(false);
    }
  }

  function abrirEscaner() {
    setAviso(null);
    setErrorRegistro(null);
    setEscaneando(true);
  }

  // Lo que leyó la cámara. Devuelve null si encontró el lugar o el mensaje
  // para mostrar si no. Primero contra el catálogo del teléfono (anda sin
  // señal y no cuelga); si no hay catálogo, le pregunta a la API.
  async function alLeerQr(texto: string): Promise<string | null> {
    const id = leerCodigoQr(texto);
    if (!id) return QR_AJENO;

    let lugar: Lugar | undefined;
    if (lugares.length > 0) {
      lugar = lugares.find((l) => l.id === id && l.codigoQr === texto.trim());
      if (!lugar) return QR_AJENO;
    } else {
      try {
        lugar = await obtenerLugarPorQr(texto.trim());
      } catch (e) {
        return e instanceof ErrorServicio ? e.message : QR_AJENO;
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLugarElegido(lugar.id);
    setOrigen("qr");
    setErrorRegistro(null);
    setRegistrando(true);
    setEscaneando(false);
    return null;
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
        origen,
        nota: nota.trim() || null,
        foto,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAviso(
        registrada.sincronizada
          ? { texto: "Visita registrada.", tono: "exito" }
          : {
              texto: "Visita guardada en tu teléfono. Se sube cuando vuelva la señal.",
              tono: "advertencia",
            },
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
        <EstadoVacio
          icono="footsteps-outline"
          titulo="Tu recorrido por Colón"
          mensaje="Ingresá para ver y guardar los lugares que visitaste."
          accion={{ titulo: "Ingresar", onPress: () => router.push("/login") }}
        />
      </Pantalla>
    );
  }

  if (cargando) {
    return (
      <Pantalla>
        <Cargando texto="Cargando tu recorrido..." />
      </Pantalla>
    );
  }

  if (error) {
    return (
      <Pantalla>
        <EstadoVacio
          tono="error"
          icono="alert-circle-outline"
          titulo="No pudimos cargar tu recorrido"
          mensaje={error}
          accion={{ titulo: "Reintentar", onPress: () => cargar() }}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <ScrollView
        contentContainerClassName="gap-4 pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Titulo
          subtitulo={
            visitas.length === 0
              ? "Los lugares de Colón que vas conociendo."
              : `${lugaresVisitados} ${lugaresVisitados === 1 ? "lugar visitado" : "lugares visitados"} · ${visitas.length} ${visitas.length === 1 ? "visita" : "visitas"}`
          }
        >
          Mi recorrido
        </Titulo>

        {sinConexion ? (
          <Aviso tono="advertencia" icono="cloud-offline-outline">
            Sin conexión. Te mostramos lo guardado en el teléfono; las visitas nuevas se suben
            cuando vuelva la señal.
          </Aviso>
        ) : null}
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}

        {/* Registrar va arriba: con muchas visitas no hay que bajar hasta el final. */}
        {!registrando ? (
          <View className="gap-3">
            <Boton
              titulo="Escanear QR del cartel"
              icono="qr-code-outline"
              onPress={abrirEscaner}
            />
            <Boton
              titulo={buscandoUbicacion ? "Buscando tu ubicación..." : "Estoy en el lugar"}
              variante="secundario"
              icono="navigate-outline"
              accessibilityLabel="Registrar el lugar donde estoy, por ubicación"
              cargando={buscandoUbicacion}
              onPress={registrarPorCercania}
            />
            <Boton
              titulo="Cargar a mano"
              variante="secundario"
              icono="add-circle-outline"
              onPress={abrirFormulario}
            />
          </View>
        ) : (
          <Tarjeta className="gap-4">
            <EtiquetaSeccion>Nueva visita</EtiquetaSeccion>

            <SelectorLugar
              lugares={lugares}
              elegido={lugarElegido}
              onElegir={elegirLugarAMano}
            />
            {origen === "qr" && lugarElegido ? (
              <Aviso tono="exito" icono="qr-code-outline">
                Lugar leído del código QR.
              </Aviso>
            ) : null}
            {origen === "manual" ? (
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-texto-suave">
                  ¿Estás en el lugar? Que lo encuentre la app:
                </Text>
                <View className="flex-row gap-3">
                  <Boton
                    titulo="Escanear QR"
                    variante="secundario"
                    tamano="vertical"
                    icono="qr-code-outline"
                    accessibilityLabel="Escanear el código QR del cartel"
                    onPress={abrirEscaner}
                    className="flex-1"
                  />
                  <Boton
                    titulo={buscandoUbicacion ? "Buscando..." : "Por ubicación"}
                    variante="secundario"
                    tamano="vertical"
                    icono="navigate-outline"
                    accessibilityLabel="Buscar el lugar donde estoy, por ubicación"
                    cargando={buscandoUbicacion}
                    onPress={registrarPorCercania}
                    className="flex-1"
                  />
                </View>
              </View>
            ) : null}
            {origen === "gps" && lugarElegido ? (
              <LugaresCercanos
                cercanos={cercanos}
                elegido={lugarElegido}
                onElegir={setLugarElegido}
              />
            ) : null}

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
                  style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radios.control }}
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
                <Boton
                  titulo="Cámara"
                  variante="secundario"
                  tamano="vertical"
                  icono="camera-outline"
                  accessibilityLabel="Sacar foto con la cámara"
                  onPress={() => elegirFoto("camara")}
                  className="flex-1"
                />
                <Boton
                  titulo="Galería"
                  variante="secundario"
                  tamano="vertical"
                  icono="images-outline"
                  accessibilityLabel="Elegir foto de la galería"
                  onPress={() => elegirFoto("galeria")}
                  className="flex-1"
                />
              </View>
            )}

            {errorRegistro ? <Aviso tono="error">{errorRegistro}</Aviso> : null}

            <Boton
              titulo={guardando ? "Guardando..." : "Confirmar"}
              icono="checkmark"
              onPress={confirmar}
              cargando={guardando}
              deshabilitado={!lugarElegido}
            />
            <Boton titulo="Cancelar" variante="secundario" onPress={cerrarFormulario} />
          </Tarjeta>
        )}

        {visitas.length === 0 ? (
          <EstadoVacio
            icono="map-outline"
            titulo="Todavía no registraste ninguna visita"
            mensaje="Cuando pases por un lugar, registralo acá con una nota o una foto."
          />
        ) : (
          <>
            <EtiquetaSeccion className="mt-2">Tus visitas</EtiquetaSeccion>
            {visitas.map((visita) => (
              <Tarjeta key={visita.id}>
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 text-lg font-semibold text-texto">
                    {nombreDe(visita.lugarId)}
                  </Text>
                  {!visita.sincronizada ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-advertencia-claro px-2.5 py-1">
                      <Ionicons name="cloud-upload-outline" size={16} color={colores.advertencia} />
                      <Text className="text-sm font-medium text-advertencia">Pendiente de subir</Text>
                    </View>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="calendar-outline" size={16} color={colores["texto-suave"]} />
                  <Text className="text-sm text-texto-suave">
                    {new Date(visita.fechaHora).toLocaleString("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                </View>
                {visita.fotoUri ? (
                  <Image
                    source={{ uri: visita.fotoUri }}
                    contentFit="cover"
                    accessibilityLabel={`Foto de la visita a ${nombreDe(visita.lugarId)}`}
                    style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radios.control }}
                  />
                ) : null}
                {visita.nota ? <Text className="text-base text-texto">{visita.nota}</Text> : null}
              </Tarjeta>
            ))}
          </>
        )}
      </ScrollView>

      <EscanerQr
        visible={escaneando}
        onCerrar={() => setEscaneando(false)}
        onLeido={alLeerQr}
      />
    </Pantalla>
  );
}

// Con origen "gps": a cuánto está del elegido y, si hay otros dentro del
// radio, los ofrece para cambiar sin pasar a "manual".
function LugaresCercanos({
  cercanos,
  elegido,
  onElegir,
}: {
  cercanos: LugarCercano[];
  elegido: string;
  onElegir: (id: string) => void;
}) {
  const colores = useColores();
  const actual = cercanos.find((c) => c.lugar.id === elegido);
  const otros = cercanos.filter((c) => c.lugar.id !== elegido);

  return (
    <View className="gap-2">
      {actual ? (
        <Aviso tono="exito" icono="navigate-outline">
          Estás a {formatearDistancia(actual.distancia)} de {actual.lugar.nombre}.
        </Aviso>
      ) : null}
      {otros.length > 0 ? (
        <>
          <Text className="text-sm font-medium text-texto-suave">¿Estás en otro? También cerca:</Text>
          <View className="overflow-hidden rounded-control border border-borde">
            {otros.map(({ lugar, distancia }, indice) => (
              <Pressable
                key={lugar.id}
                onPress={() => onElegir(lugar.id)}
                accessibilityRole="button"
                accessibilityLabel={`Elegir ${lugar.nombre}, a ${formatearDistancia(distancia)}`}
                className={`min-h-12 flex-row items-center gap-3 bg-superficie px-4 py-3 active:bg-primario-claro ${
                  indice > 0 ? "border-t border-borde" : ""
                }`}
              >
                <Ionicons name="location-outline" size={20} color={colores["texto-suave"]} />
                <Text className="flex-1 text-base text-texto">{lugar.nombre}</Text>
                <Text className="text-sm text-texto-suave">{formatearDistancia(distancia)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

// Sin tildes ni mayúsculas, para que "colon" encuentre "Colón".
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const MAX_SUGERENCIAS = 5;

// Elegir el lugar de la visita: buscador + pocas filas, en vez de un botón por
// lugar (con todo el catálogo la lista era larguísima). Elegido, se colapsa.
function SelectorLugar({
  lugares,
  elegido,
  onElegir,
}: {
  lugares: Lugar[];
  elegido: string | null;
  onElegir: (id: string | null) => void;
}) {
  const colores = useColores();
  const [busqueda, setBusqueda] = useState("");

  if (lugares.length === 0) {
    return (
      <Aviso tono="advertencia" icono="cloud-offline-outline">
        No pudimos cargar los lugares. Probá de nuevo con señal.
      </Aviso>
    );
  }

  const lugarElegido = lugares.find((l) => l.id === elegido);
  if (lugarElegido) {
    return (
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-texto-suave">¿Dónde estuviste?</Text>
        <View className="min-h-12 flex-row items-center gap-3 rounded-control border-2 border-primario bg-primario-claro pl-4">
          <Ionicons name="location" size={20} color={colores.primario} />
          <Text className="flex-1 text-base font-semibold text-texto">{lugarElegido.nombre}</Text>
          <Pressable
            onPress={() => onElegir(null)}
            accessibilityRole="button"
            accessibilityLabel="Cambiar el lugar elegido"
            className="min-h-12 justify-center px-4 active:opacity-70"
          >
            <Text className="text-base font-bold text-primario">Cambiar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const termino = normalizar(busqueda.trim());
  const coincidencias = termino
    ? lugares.filter((l) => normalizar(l.nombre).includes(termino))
    : lugares;
  const visibles = coincidencias.slice(0, MAX_SUGERENCIAS);
  const ocultos = coincidencias.length - visibles.length;

  return (
    <View className="gap-2">
      <Campo
        etiqueta="¿Dónde estuviste?"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscá el lugar por nombre"
        autoCorrect={false}
        returnKeyType="search"
      />
      {visibles.length === 0 ? (
        <Text className="text-base text-texto-suave">No hay lugares con ese nombre.</Text>
      ) : (
        <View className="overflow-hidden rounded-control border border-borde">
          {visibles.map((l, indice) => (
            <Pressable
              key={l.id}
              onPress={() => {
                onElegir(l.id);
                setBusqueda("");
              }}
              accessibilityRole="button"
              accessibilityLabel={`Elegir ${l.nombre}`}
              className={`min-h-12 flex-row items-center gap-3 bg-superficie px-4 py-3 active:bg-primario-claro ${
                indice > 0 ? "border-t border-borde" : ""
              }`}
            >
              <Ionicons name="location-outline" size={20} color={colores["texto-suave"]} />
              <Text className="flex-1 text-base text-texto">{l.nombre}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {ocultos > 0 ? (
        <Text className="text-sm text-texto-suave">
          Y {ocultos} {ocultos === 1 ? "lugar más" : "lugares más"}: escribí para encontrarlo.
        </Text>
      ) : null}
    </View>
  );
}
