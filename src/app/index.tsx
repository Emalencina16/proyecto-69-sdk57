import { Redirect } from 'expo-router';

// Hoy siempre manda a /login porque todavía no persistimos sesión.
// Cuando agreguemos expo-secure-store, acá vamos a chequear si hay un
// token guardado y redirigir a /home o /login según corresponda.
export default function Index() {
  return <Redirect href="/login" />;
}
