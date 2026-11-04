export type OrigenVisita = 'qr' | 'gps' | 'manual';

export interface Visita {
  id: string;
  usuarioId: string;
  lugarId: string;
  fechaHora: string;
  origen: OrigenVisita;
  fotoUri: string | null; // ruta local hasta que se sube
  nota: string | null;
  sincronizada: boolean;
}
