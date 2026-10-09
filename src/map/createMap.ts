import L from 'leaflet';
import { MAP_EXTENT } from '../lib/coords.ts';

/** Mapa no geográfico: 1 unidad = 1 milla; [lat, lng] = [y, x]. */
export function createMap(el: HTMLElement): L.Map {
  const bounds = L.latLngBounds([0, 0], [MAP_EXTENT.height, MAP_EXTENT.width]);
  const map = L.map(el, {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 4,
    zoomSnap: 0.25,
    maxBounds: bounds.pad(0.15),
    attributionControl: false,
  });
  map.fitBounds(bounds);
  return map;
}
