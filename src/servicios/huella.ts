import * as LocalAuthentication from 'expo-local-authentication';

// Reingreso con huella o rostro (PRD §5). El sistema operativo muestra el
// diálogo y compara la huella; la app solo recibe sí o no, nunca la huella.

// true si el teléfono tiene sensor y la persona registró al menos una huella
// o su rostro. Si no, la opción ni se ofrece y se sigue con email y contraseña.
export async function huellaDisponible(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

// true solo si la persona confirmó que es ella. Cancelar, fallar o no tener
// sensor dan false: quien llama decide cómo seguir (nunca se rompe la app).
// Si la huella falla varias veces, el sistema ofrece el PIN del teléfono.
export async function pedirHuella(mensaje: string): Promise<boolean> {
  try {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: mensaje,
      cancelLabel: 'Ahora no',
    });
    return resultado.success;
  } catch {
    return false;
  }
}
