/** Capas vectoriales estáticas: tierra, bosques, ríos, lagos, caminos y fronteras. */
import L from 'leaflet';
import type { GeoData, GeoFeature } from '../data/geo.ts';
import { isLine, isPolygon } from '../data/geo.ts';
import { polylineLength } from '../lib/geometry.ts';
import { shapeOf, toLatLngs } from './shapes.ts';

/** Paneles (z-index) en orden de pintado. Cada uno con su propio SVG. */
export const PANES = {
  land: 210,
  forest: 220,
  rivers: 230,
  lakes: 235,
  roads: 240,
  relief: 250,
  borders: 255,
  grid: 260,
  places: 450,
  labels: 650,
} as const;
export type PaneName = keyof typeof PANES;

export function createPanes(map: L.Map): Record<PaneName, L.Renderer> {
  const renderers = {} as Record<PaneName, L.Renderer>;
  for (const [name, z] of Object.entries(PANES) as [PaneName, number][]) {
    const pane = map.createPane(name);
    pane.style.zIndex = String(z);
    if (name === 'labels' || name === 'grid') pane.style.pointerEvents = 'none';
    renderers[name] = L.svg({ pane: name, padding: 0.5 });
  }
  return renderers;
}

const quiet = { interactive: false, smoothFactor: 0.6 } as const;

export function addBaseLayers(map: L.Map, geo: GeoData, r: Record<PaneName, L.Renderer>): void {
  // Tierra: tres halos de costa (oleaje) por debajo y el relleno de papel encima.
  const landFeatures = geo.coastline.features.filter(
    (f) => f.properties.kind === 'land' || f.properties.kind === 'island',
  );
  for (const halo of ['coast-halo-3', 'coast-halo-2', 'coast-halo-1', 'land']) {
    for (const f of landFeatures) {
      L.polygon(toLatLngs(shapeOf(f)), { ...quiet, renderer: r.land, className: halo }).addTo(map);
    }
  }

  for (const f of geo.forests.features.filter(isPolygon)) {
    L.polygon(toLatLngs(shapeOf(f)), {
      ...quiet,
      renderer: r.forest,
      className: f.properties.kind === 'marsh' ? 'marsh' : 'forest',
    }).addTo(map);
  }

  for (const f of geo.rivers.features.filter(isLine)) addRiver(map, f, r.rivers);

  for (const f of geo.coastline.features.filter((f) => f.properties.kind === 'lake')) {
    L.polygon(toLatLngs(shapeOf(f)), { ...quiet, renderer: r.lakes, className: 'lake' }).addTo(map);
  }

  for (const f of geo.roads.features.filter(isLine)) {
    L.polyline(toLatLngs(shapeOf(f)), { ...quiet, renderer: r.roads, className: 'road' }).addTo(
      map,
    );
  }

  for (const f of geo.regions.features.filter((f) => f.properties.kind === 'border')) {
    const opts = { ...quiet, renderer: r.borders, className: 'border' };
    const pts = toLatLngs(shapeOf(f));
    (isPolygon(f) ? L.polygon(pts, opts) : L.polyline(pts, opts)).addTo(map);
  }
}

/** Los ríos engordan aguas abajo: se dibujan en tramos de grosor creciente. */
function addRiver(map: L.Map, f: GeoFeature, renderer: L.Renderer): void {
  const pts = shapeOf(f);
  const rank = f.properties.rank ?? 2;
  const chunks = rank >= 3 ? 3 : 2;
  const total = polylineLength(pts);
  let start = 0;
  let acc = 0;
  for (let c = 0; c < chunks; c++) {
    const limit = (total * (c + 1)) / chunks;
    const part = [pts[start]!];
    let i = start + 1;
    for (; i < pts.length; i++) {
      acc += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
      part.push(pts[i]!);
      if (acc >= limit && c < chunks - 1) break;
    }
    start = Math.min(i, pts.length - 1);
    if (part.length > 1)
      L.polyline(toLatLngs(part), {
        ...quiet,
        renderer,
        className: `river river-r${rank} river-c${c + 3 - chunks}`,
      }).addTo(map);
  }
}
