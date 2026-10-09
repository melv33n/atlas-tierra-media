/** Comprobaciones de coherencia entre la geografía y los lugares. */
import { distanceToPolyline, pointInPolygon } from '../lib/geometry.ts';
import type { GeoCollection, GeoFeature } from './geo.ts';
import { isLine, isPolygon } from './geo.ts';
import type { DataBundle, XY } from './types.ts';
import type { Issue } from './validate.ts';

/** Distancia máxima (millas) para considerar que un río desemboca en algo. */
const MOUTH_TOLERANCE = 6;
/** Un puerto puede quedar algo fuera de la costa dibujada. */
const PORT_TOLERANCE = 8;

export function checkGeo(bundle: DataBundle, geo: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  const coast = geo['coastline'] as GeoCollection | undefined;
  if (!coast) return issues;

  const polys = (kinds: string[]) =>
    coast.features.filter((f) => kinds.includes(f.properties.kind)).filter(isPolygon);
  const landRings = polys(['land', 'island']).map((f) => f.geometry.coordinates[0]!);
  const lakes = polys(['lake']);
  const lakeRings = lakes.map((f) => f.geometry.coordinates[0]!);
  const onLand = (p: XY) => landRings.some((r) => pointInPolygon(p, r));
  const lakeAt = (p: XY) => lakes.find((f) => pointInPolygon(p, f.geometry.coordinates[0]!));
  const nearCoast = (p: XY, tol: number) =>
    [...landRings, ...lakeRings].some((r) => distanceToPolyline(p, r) <= tol);

  for (const place of bundle.places) {
    if (place.onWater) continue;
    const lake = lakeAt(place.coords);
    if (lake) {
      issues.push({
        level: 'error',
        code: 'place-in-water',
        message: `${place.id} cae dentro de ${lake.properties.id} (márcalo onWater si es a propósito)`,
      });
    } else if (!onLand(place.coords)) {
      const ok = place.type === 'puerto' && nearCoast(place.coords, PORT_TOLERANCE);
      if (!ok)
        issues.push({ level: 'error', code: 'place-in-sea', message: `${place.id} cae en el mar` });
    }
  }

  const rivers = ((geo['rivers'] as GeoCollection | undefined)?.features ?? []).filter(isLine);
  for (const river of rivers) {
    const pts = river.geometry.coordinates;
    const source = pts[0]!;
    const mouth = pts[pts.length - 1]!;
    if (!onLand(source))
      issues.push({
        level: 'error',
        code: 'river-source',
        message: `${river.properties.id}: la fuente no está en tierra`,
      });
    const others = rivers.filter((r) => r !== river).map((r) => r.geometry.coordinates);
    const ends =
      nearCoast(mouth, MOUTH_TOLERANCE) ||
      !!lakeAt(mouth) ||
      others.some((line) => distanceToPolyline(mouth, line) <= MOUTH_TOLERANCE);
    if (!ends)
      issues.push({
        level: 'error',
        code: 'river-mouth',
        message: `${river.properties.id}: no desemboca en el mar, un lago ni otro río`,
      });
  }

  // Etiquetas: todo lo que tiene nombre debe decir a qué zoom aparece, salvo que
  // la etiqueta la ponga un lugar homónimo.
  const placeNames = new Set(bundle.places.map((p) => p.name));
  for (const [layer, value] of Object.entries(geo)) {
    for (const f of (value as GeoCollection).features as GeoFeature[]) {
      const p = f.properties;
      if (
        p.name &&
        p.labelZoom === undefined &&
        !placeNames.has(p.name) &&
        !['land', 'border'].includes(p.kind)
      )
        issues.push({
          level: 'warning',
          code: 'label-zoom',
          message: `${layer}/${p.id}: tiene nombre pero no labelZoom`,
        });
    }
  }
  return issues;
}
