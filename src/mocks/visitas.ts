import type { Visita } from "@/tipos/visita";

export const visitasMock: Visita[] = [
  {
    id: "vis-001",
    usuarioId: "usr-201",
    lugarId: "lug-004",
    fechaHora: "2026-11-13T16:42:00-03:00",
    origen: "qr",
    fotoUri: null,
    nota: "Hacía 38 grados pero valió la pena",
    sincronizada: true,
  },
  {
    id: "vis-002",
    usuarioId: "usr-201",
    lugarId: "lug-009",
    fechaHora: "2026-11-13T19:10:00-03:00",
    origen: "gps",
    fotoUri: null,
    nota: null,
    sincronizada: false,
  },
  {
    id: "vis-003",
    usuarioId: "usr-201",
    lugarId: "lug-002",
    fechaHora: "2026-11-14T10:05:00-03:00",
    origen: "manual",
    fotoUri: null,
    nota: "Una nota muy larga para probar que el diseño no se rompe cuando el texto ocupa muchas líneas. ".repeat(
      4,
    ),
    sincronizada: false,
  },
];
