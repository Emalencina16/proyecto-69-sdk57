import Storage from 'expo-sqlite/kv-store';

// Última respuesta buena de la API, guardada en el teléfono para mostrarla
// sin señal (PRD: "si la persona ya abrió la app en el hotel, después tiene
// que poder seguir viendo los lugares y su recorrido"). kv-store es texto
// plano: acá va solo lo que no es secreto (catálogo, visitas); el token
// sigue en SecureStore.

export async function guardarCopia(clave: string, valor: unknown): Promise<void> {
  try {
    await Storage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin copia la app anda igual; la próxima respuesta buena la vuelve a guardar
  }
}

export async function leerCopia<T>(clave: string): Promise<T | null> {
  try {
    const texto = await Storage.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}
