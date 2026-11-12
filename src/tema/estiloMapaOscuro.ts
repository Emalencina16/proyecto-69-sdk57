import type { MapStyleElement } from 'react-native-maps';

// Estilo nocturno de Google Maps con los tonos del tema oscuro (monte de
// noche, río petróleo). Sin puntos de interés de Google: compiten con los
// pines de la app.
export const ESTILO_MAPA_OSCURO: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#17241f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9bafa4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1713' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2c4036' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#15231c' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#1a3027' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#24362e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2924' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2f463b' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a9d93' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#132a31' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#71c2d8' }] },
];
