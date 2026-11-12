// Formato del QR de los carteles: "COLON:<lugarId>", ej. "COLON:lug-004".
// Es la misma regla que valida la API (api-mi-ciudad/.../places/rules/qr.ts):
// leerlo acá permite reconocer el cartel sin señal, con el catálogo guardado.
const PREFIJO = 'COLON:';
const ID_DE_LUGAR = /^lug-[A-Za-z0-9_-]{1,36}$/;

/**
 * El id del lugar si el texto es un QR de Mi Ciudad; si no (QR de otro
 * sistema, una URL, texto roto), `null`. Tolera espacios y saltos de línea
 * alrededor, que agregan algunos lectores.
 */
export function leerCodigoQr(texto: unknown): string | null {
  if (typeof texto !== 'string') return null;
  const limpio = texto.trim();
  if (!limpio.startsWith(PREFIJO)) return null;
  const id = limpio.slice(PREFIJO.length);
  return ID_DE_LUGAR.test(id) ? id : null;
}
