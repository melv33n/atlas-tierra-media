/** Preparación de geometrías para el render: rugosidad + suavizado deterministas. */
import type { LatLngExpression } from 'leaflet';
import type { GeoFeature, GeoKind } from '../data/geo.ts';
import type { XY } from '../data/types.ts';
import { chaikin, roughen } from '../lib/geometry.ts';
import { hashString } from '../lib/random.ts';
import { toLatLng } from '../lib/coords.ts';

/** Cuánto «temblor de mano» lleva cada tipo de trazo. */
const ROUGHNESS: Partial<Record<GeoKind, { amplitude: number; levels: number; smooth: number }>> = {
  land: { amplitude: 0.13, levels: 4, smooth: 2 },
  island: { amplitude: 0.15, levels: 3, smooth: 2 },
  lake: { amplitude: 0.1, levels: 3, smooth: 2 },
  forest: { amplitude: 0.16, levels: 3, smooth: 2 },
  marsh: { amplitude: 0.16, levels: 3, smooth: 2 },
  river: { amplitude: 0.11, levels: 3, smooth: 2 },
  border: { amplitude: 0, levels: 0, smooth: 1 },
  road: { amplitude: 0, levels: 0, smooth: 1 },
  range: { amplitude: 0, levels: 0, smooth: 2 },
  hills: { amplitude: 0, levels: 0, smooth: 2 },
};

const cache = new Map<string, XY[]>();

/** Puntos procesados (millas) de una línea o del anillo exterior de un polígono. */
export function shapeOf(feature: GeoFeature): XY[] {
  const key = feature.properties.id;
  const hit = cache.get(key);
  if (hit) return hit;
  const g = feature.geometry;
  const raw: XY[] =
    g.type === 'Polygon'
      ? g.coordinates[0]!
      : g.type === 'LineString'
        ? g.coordinates
        : [g.coordinates];
  const r = ROUGHNESS[feature.properties.kind];
  let pts = raw;
  if (r && feature.properties.smooth !== false) {
    if (r.levels) pts = roughen(pts, hashString(key), r.amplitude, r.levels);
    if (r.smooth) pts = chaikin(pts, r.smooth);
  }
  cache.set(key, pts);
  return pts;
}

export const toLatLngs = (pts: XY[]): LatLngExpression[] => pts.map(toLatLng);
