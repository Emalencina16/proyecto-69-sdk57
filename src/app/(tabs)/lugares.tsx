import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
// Componentes nativos para indicar carga, recorrer la lista y mostrar texto y contenedores.
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
// Campo de texto compartido con el resto de la aplicación.
import { Campo } from '@/components/Campo';
// Fila reutilizable de filtros por categoría.
import { FiltroCategorias } from '@/components/FiltroCategorias';
// Contenedor visual reutilizable para cada elemento de la lista.
import { Tarjeta } from '@/components/Tarjeta';
// Función que obtiene las categorías desde la API simulada.
import { obtenerCategorias } from '@/servicios/categorias';
// Función que obtiene los lugares desde la API simulada.
import { obtenerLugares } from '@/servicios/lugares';
// Tipos usados para que TypeScript compruebe la forma de los datos.
import type { Categoria } from '@/tipos/categoria';
import type { Lugar } from '@/tipos/lugar';

// Componente principal de la pantalla Lugares.
export default function Lugares() {
  // Guarda todos los lugares descargados; comienza como una lista vacía.
  const [lugares, setLugares] = useState<Lugar[]>([]);
  // Guarda las categorías para construir filtros y etiquetar cada lugar.
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  // Guarda lo que la persona escribe en el campo de búsqueda.
  const [busqueda, setBusqueda] = useState('');
  // Guarda la categoría seleccionada; null significa que no hay filtro de categoría.
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  // Indica si todavía se están descargando lugares y categorías.
  const [cargando, setCargando] = useState(true);
  // Guarda el mensaje si falla la petición a la API.
  const [error, setError] = useState<string | null>(null);

  // Ejecuta la carga inicial cuando se monta esta pantalla.
  useEffect(() => {
    // Pide lugares y categorías al mismo tiempo y espera a que ambas respuestas lleguen.
    Promise.all([obtenerLugares(), obtenerCategorias()])
      // Si ambas peticiones funcionan, guarda cada respuesta en su estado.
      .then(([lugaresObtenidos, categoriasObtenidas]) => {
        setLugares(lugaresObtenidos);
        setCategorias(categoriasObtenidas);
      })
      // Si alguna petición falla, guarda un mensaje que la pantalla pueda mostrar.
      .catch((e) => setError(e instanceof Error ? e.message : 'Error desconocido'))
      // Se ejecuta tanto si la carga funciona como si falla y oculta el indicador.
      .finally(() => setCargando(false));
    // La lista vacía hace que esta carga se ejecute solo al montar el componente.
  }, []);

  // Quita espacios externos y pasa la búsqueda a minúsculas para comparar sin distinguir mayúsculas.
  const termino = busqueda.trim().toLocaleLowerCase();
  // Genera una lista visible aplicando simultáneamente categoría y texto de búsqueda.
  const lugaresVisibles = lugares.filter((lugar) => {
    // Acepta cualquier categoría si no hay una seleccionada; de lo contrario exige coincidencia.
    const coincideCategoria = categoriaId === null || lugar.categoriaId === categoriaId;
    // Busca el texto en el nombre, la descripción breve o la dirección del lugar.
    const coincideBusqueda =
      !termino ||
      `${lugar.nombre} ${lugar.descripcionCorta} ${lugar.direccion}`.toLocaleLowerCase().includes(termino);
    // Conserva solo los lugares que cumplen los dos filtros.
    return coincideCategoria && coincideBusqueda;
  });

  // Devuelve la interfaz completa de esta pantalla.
  return (
    // Contenedor principal que ocupa el espacio disponible y usa el color de fondo del tema.
    <View className="flex-1 bg-fondo">
      {/* Franja superior fija que contiene el campo de búsqueda. */}
      <View className="shrink-0 gap-3 border-b border-borde bg-superficie px-5 pb-3 pt-4">
        {/* Campo controlado: muestra busqueda y actualiza el estado en cada cambio. */}
        <Campo
          // Etiqueta accesible y visible del campo.
          etiqueta="Buscar lugares"
          // Valor actual escrito por la persona.
          value={busqueda}
          // Actualiza busqueda cuando cambia el texto.
          onChangeText={setBusqueda}
          // Texto de ejemplo que aparece cuando el campo está vacío.
          placeholder="Nombre, tipo o dirección"
          // Muestra una acción de búsqueda en el teclado del dispositivo.
          returnKeyType="search"
          // Describe el propósito del campo para tecnologías de asistencia.
          accessibilityLabel="Buscar lugares por nombre, descripción o dirección"
        />
      </View>

      {/* Muestra un botón por categoría y actualiza categoriaId al seleccionar uno. */}
      <FiltroCategorias categorias={categorias} seleccionada={categoriaId} onSeleccionar={setCategoriaId} />

      {/* Mientras se descargan datos, muestra un indicador de actividad. */}
      {cargando ? (
        <ActivityIndicator size="large" className="mt-8" />
      // Cuando termina la carga con error, presenta el mensaje recibido.
      ) : error ? (
        <Text className="px-5 pt-6 text-base text-error">{error}</Text>
      // Si la carga terminó bien, presenta los lugares filtrados.
      ) : (
        // FlatList renderiza eficientemente listas largas y solo las filas necesarias.
        <FlatList
          // Datos que se van a mostrar después de aplicar los filtros.
          data={lugaresVisibles}
          // Usa el identificador estable del lugar como clave de cada fila.
          keyExtractor={(lugar) => lugar.id}
          // Hace que la lista ocupe el espacio vertical restante.
          className="flex-1"
          // Espaciado interno para que las tarjetas no queden pegadas a los bordes.
          contentContainerClassName="gap-3 px-5 py-5"
          // Permite tocar resultados aunque el teclado siga abierto.
          keyboardShouldPersistTaps="handled"
          // Encabezado de la lista con el total de resultados encontrados.
          ListHeaderComponent={
            <Text className="pb-1 text-sm text-texto-suave">
              {/* Adapta la palabra al singular o plural según la cantidad. */}
              {lugaresVisibles.length} {lugaresVisibles.length === 1 ? 'lugar' : 'lugares'}
            </Text>
          }
          // Mensaje alternativo cuando no hay lugares que coincidan.
          ListEmptyComponent={
            <Text className="py-4 text-base text-texto-suave">
              {/* Distingue entre lista vacía de origen y búsqueda/filtros sin coincidencias. */}
              {busqueda || categoriaId ? 'No encontramos lugares con esos filtros.' : 'Todavía no hay lugares para mostrar.'}
            </Text>
          }
          // Define la apariencia de cada fila; item es el lugar actual de la lista.
          renderItem={({ item }) => {
            // Busca la categoría del lugar para poder mostrar su nombre y color.
            const categoria = categorias.find((opcion) => opcion.id === item.categoriaId);

            // Devuelve la tarjeta de información del lugar actual.
            return (
              // Tarjeta común del proyecto con fondo, borde y espaciado.
              <Tarjeta>
                {/* Nombre principal del punto turístico o servicio. */}
                <Text className="text-lg font-semibold text-texto">{item.nombre}</Text>
                {/* La categoría se muestra solo si se encontró en los datos cargados. */}
                {categoria && (
                  // Usa el color configurado para esa categoría.
                  <Text className="text-sm font-semibold" style={{ color: categoria.color }}>
                    {categoria.nombre}
                  </Text>
                )}
                {/* Descripción breve para identificar rápidamente el lugar. */}
                <Text className="text-sm text-texto-suave">{item.descripcionCorta}</Text>
                {/* Fila con ícono de ubicación y dirección. */}
                <View className="mt-1 flex-row items-center gap-2">
                  {/* Ícono que señala que el texto siguiente es una dirección. */}
                  <Ionicons name="location-outline" size={18} color="#64748b" />
                  {/* La dirección puede ocupar varias líneas si es larga. */}
                  <Text className="flex-1 text-sm text-texto-suave">{item.direccion}</Text>
                </View>
                {/* Informa accesibilidad solo si el dato del lugar es verdadero. */}
                {item.accesible && (
                  <View className="flex-row items-center gap-2">
                    {/* Ícono asociado a accesibilidad. */}
                    <Ionicons name="accessibility-outline" size={18} color="#64748b" />
                    {/* Etiqueta textual para que la información no dependa solo del ícono. */}
                    <Text className="text-sm text-texto-suave">Accesible</Text>
                  </View>
                )}
              </Tarjeta>
            );
          }}
        />
      )}
    </View>
  );
}