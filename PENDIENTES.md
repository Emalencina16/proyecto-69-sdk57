# Pendientes

Lista viva de lo que falta, según el PRD (`01 - Mi Ciudad Guia Turistica.pdf`).
Se tilda a medida que se hace. Lo de arriba de cada sección es lo más próximo.

## Base

- [x] Instalar las dependencias que pide el PRD
- [x] Tipos en `src/tipos/`
- [x] Mock API con todas las colecciones (`db.json`)
- [x] Servicios de lugares y categorías
- [ ] Servicios de eventos, favoritos y visitas
- [ ] Commitear `api.ts`, `.env`, filtro de categorías y hacer push de `walter`
- [ ] Decidir si los servicios devuelven ya el formato `{ datos, meta }` de la API de la cátedra
- [ ] Caché local del catálogo con `expo-sqlite` para usar la app sin señal
- [ ] Detectar si hay conexión con `expo-network`

## 1. Lugares

- [x] Listado de lugares
- [x] Filtrar por categoría
- [ ] Buscar por nombre (el servicio ya lo soporta; falta la UI y el botón de búsqueda del header)
- [ ] Pantalla de detalle: fotos, descripción, horario, teléfono, precio
- [ ] "Abierto ahora - cierra 19:00" a partir de los horarios
- [ ] Ordenar por distancia

## 2. Mapa y "cerca tuyo"

- [x] Mapa con los lugares marcados
- [x] Filtrar el mapa por categoría
- [ ] Resolver el mapa gris en el emulador (ver RESEARCH.md)
- [ ] Ubicación del usuario con `expo-location` (punto "vos estás acá")
- [ ] Que la app siga andando si niega el permiso de ubicación
- [ ] Lista "Cerca tuyo" ordenada por distancia (900 m, 1,1 km)
- [ ] Tocar un pin: nombre + distancia y entrar al detalle
- [ ] Botón "Cómo llegar" que abra la app de mapas
- [ ] Flecha hacia el lugar con el magnetómetro (`expo-sensors`)
- [ ] Header "Colón" con botón de búsqueda (wireframe)

## 3. Agenda de eventos

- [ ] Eventos por día, empezando por hoy
- [ ] Detalle del evento (cuándo, dónde, cuánto dura, si es gratis)
- [ ] Evento con lugar del catálogo o con dirección suelta
- [ ] Guardar un evento y aviso antes de que empiece (`expo-notifications`)
- [ ] Mostrar cancelado / suspendido y avisar a quien lo guardó

## 4. Mi recorrido

- [ ] Registrar visita escaneando el QR (`expo-camera`)
- [ ] Registrar visita por cercanía (GPS)
- [ ] Registrar visita a mano
- [ ] Foto de la visita (cámara o galería con `expo-image-picker`)
- [ ] Nota corta
- [ ] Ver el recorrido en orden, con fotos
- [ ] Cola de visitas sin sincronizar (`sincronizada: false`) que se sube al volver la señal
- [ ] QR ajeno o roto: que la app no se rompa
- [ ] Vibración al registrar una visita (`expo-haptics`)

## 5. Favoritos y cuenta

- [x] Login contra la mock API
- [ ] Marcar favorito con un toque
- [ ] Lista de favoritos
- [ ] Guardar el token de sesión en `expo-secure-store`
- [ ] Reingreso con huella o rostro (`expo-local-authentication`)
- [ ] Mirar mapa y lugares sin cuenta (hoy el login es obligatorio)
- [ ] Cerrar sesión de verdad en `yo.tsx`

## 6. Audioguías

- [ ] Reproducir la audioguía del lugar (`expo-audio`)
- [ ] Pausar, adelantar y ver cuánto falta
- [ ] Seguir escuchando con la pantalla apagada
- [ ] Descargar audios y fotos para usarlos sin señal (`expo-file-system`)
- [ ] Conseguir un audio real para probar (los de `db.json` son URLs inventadas)

## Requisitos generales del PRD

- [ ] Funciona sin señal
- [ ] Funciona aunque se nieguen permisos
- [ ] Máximo un aviso por lugar y por día
- [ ] Letra grande, contraste fuerte, botones grandes
- [ ] Respeta la letra agrandada del teléfono sin romperse
- [ ] Probado en Android y en iPhone

## Entrega

- [ ] API key de Google Maps para el build de Android
- [ ] Build de producción con EAS

## Preguntas para Valeria (el PRD pide avisar, no resolver solos)

- [ ] Las termas tienen horario de verano y de invierno, pero el tipo `Horario` no tiene temporada. ¿Cómo lo guardamos?
- [ ] ¿La cuenta es obligatoria? El PRD dice que no para mirar, pero hoy la app arranca en el login.

## Preguntas para la cátedra

- [ ] En el detalle de un elemento (`/lugares/:id`), ¿`datos` es un objeto o un array? ¿Viene `meta`?
- [ ] Nombres de los filtros de la API (json-server usa `nombre:contains`)
