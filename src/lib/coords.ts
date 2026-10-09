import type { XY } from '../data/types.ts';

/**
 * Extensión del mapa en millas. Coordenadas propias: no corresponden a ningún
 * mapa publicado, solo respetan relaciones y distancias descritas en el texto.
 */
export const MAP_EXTENT = { width: 2000, height: 1500 } as const;

/** Leaflet `CRS.Simple` usa [lat, lng] = [y, x]. */
export function toLatLng([x, y]: XY): [number, number] {
  return [y, x];
}

export function fromLatLng(lat: number, lng: number): XY {
  return [lng, lat];
}

export function distance(a: XY, b: XY): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function pathLength(points: XY[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1]!, points[i]!);
  return total;
}
