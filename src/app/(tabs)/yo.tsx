import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { FlatList, Pressable, Switch, Text, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Cargando } from '@/components/Cargando';
import { EstadoVacio } from '@/components/EstadoVacio';
import { EtiquetaSeccion } from '@/components/EtiquetaSeccion';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { useSesion } from '@/estado/sesion';
import { obtenerLugaresFavoritos } from '@/servicios/favoritos';
import { huellaDisponible } from '@/servicios/huella';
import { useColores } from '@/tema/useColores';
import type { Lugar } from '@/tipos/lugar';

export default function Yo() {
  const colores = useColores();
  const sesion = useSesion();
  const [favoritos, setFavoritos] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Las tabs de expo-router no se desmontan al cambiar de pestaña, así que un
  // useEffect normal (con [] o [sesion.usuario]) solo corre la primera vez
  // que se visita esta pantalla. Con useFocusEffect se vuelve a pedir la
  // lista cada vez que "Yo" entra en foco, para reflejar lo que se tocó en Mapa.
  useFocusEffect(
    useCallback(() => {
      if (!sesion.usuario) return;
      setCargando(true);
      setError(null);
      obtenerLugaresFavoritos()
        .then(setFavoritos)
        .catch((e) => setError(e instanceof Error ? e.message : 'Error desconocido'))
        .finally(() => setCargando(false));
    }, [sesion.usuario]),
  );

  // La opción de huella solo se ofrece si el teléfono tiene una registrada.
  const [hayHuella, setHayHuella] = useState(false);
  useEffect(() => {
    huellaDisponible().then(setHayHuella);
  }, []);

  // Al cerrar sesión se queda en Yo, que pasa a mostrar el botón de ingresar.
  function cerrarSesion() {
    sesion.cerrar();
  }

  const verDetalle = (id: string) => router.push({ pathname: '/lugar/[id]', params: { id } });

  if (!sesion.usuario) {
    return (
      <Pantalla>
        <EstadoVacio
          icono="person-circle-outline"
          titulo="Tu cuenta"
          mensaje="No hace falta una cuenta para mirar. Ingresá para guardar tus lugares favoritos y tu recorrido."
        />
        {/* Canceló la huella al abrir: la sesión sigue guardada y puede reintentar. */}
        {sesion.bloqueada && (
          <Boton titulo="Entrar con huella" icono="finger-print-outline" onPress={sesion.desbloquear} />
        )}
        <Boton
          titulo={sesion.bloqueada ? 'Ingresar con email' : 'Ingresar'}
          icono="log-in-outline"
          variante={sesion.bloqueada ? 'secundario' : 'primario'}
          onPress={() => router.push('/login')}
        />
      </Pantalla>
    );
  }

  const { nombre, email } = sesion.usuario;

  // Una sola lista que scrollea todo: cabecera y ajustes arriba, cerrar sesión al final.
  return (
    <View className="flex-1 bg-fondo">
      <FlatList
        data={cargando || error ? [] : favoritos}
        keyExtractor={(lugar) => lugar.id}
        contentContainerClassName="gap-3 px-5 py-5"
        ListHeaderComponent={
          <View className="gap-4 pb-1">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-primario">
                <Text className="text-2xl font-bold text-sobre-primario">{iniciales(nombre)}</Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text accessibilityRole="header" className="text-2xl font-bold text-texto" numberOfLines={1}>
                  {nombre}
                </Text>
                <Text className="text-base text-texto-suave" numberOfLines={1}>
                  {email}
                </Text>
              </View>
            </View>

            {hayHuella && (
              <Tarjeta className="flex-row items-center gap-3">
                <Ionicons name="finger-print-outline" size={24} color={colores.primario} />
                <Text className="flex-1 text-base text-texto">Pedir huella al abrir la app</Text>
                <Switch
                  value={sesion.pideHuella}
                  onValueChange={(pide) => {
                    sesion.cambiarPideHuella(pide);
                  }}
                  trackColor={{ true: colores.primario, false: colores.borde }}
                  thumbColor={colores.superficie}
                  accessibilityLabel="Pedir huella al abrir la app"
                />
              </Tarjeta>
            )}

            <EtiquetaSeccion className="mt-2">
              {cargando || error || favoritos.length === 0 ? 'Favoritos' : `Favoritos · ${favoritos.length}`}
            </EtiquetaSeccion>
            {cargando ? <Cargando /> : null}
            {error ? (
              <EstadoVacio tono="error" icono="alert-circle-outline" titulo="No pudimos cargar tus favoritos" mensaje={error} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          cargando || error ? null : (
            <EstadoVacio
              icono="heart-outline"
              titulo="Todavía no tenés favoritos"
              mensaje="Tocá el corazón de un lugar en el mapa para guardarlo acá."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => verDetalle(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Ver detalle de ${item.nombre}`}
            className="active:opacity-70"
          >
            <Tarjeta className="flex-row items-center gap-3">
              <Ionicons name="heart" size={22} color={colores.acento} />
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-texto">{item.nombre}</Text>
                <Text className="text-sm text-texto-suave" numberOfLines={2}>
                  {item.descripcionCorta}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colores['texto-suave']} />
            </Tarjeta>
          </Pressable>
        )}
        ListFooterComponent={
          <Boton
            titulo="Cerrar sesión"
            variante="secundario"
            icono="log-out-outline"
            onPress={cerrarSesion}
            className="mt-4"
          />
        }
      />
    </View>
  );
}

// "Walter Frías" → "WF"; con un solo nombre, su primera letra.
function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : (partes[0]?.[0] ?? '?');
  return letras.toUpperCase();
}
