import { describe, expect, it } from 'vitest';
import { checkGeo } from '../src/data/geo-checks.ts';
import type { GeoCollection, GeoFeature } from '../src/data/geo.ts';
import type { DataBundle, Place } from '../src/data/types.ts';
import { loadRepo } from '../scripts/lib/repo.ts';
import { distanceToPolyline } from '../src/lib/geometry.ts';
import { ridgeGlyphs } from '../src/map/glyphs.ts';

const { bundle, geo, schemaIssues } = loadRepo();

describe('datos geográficos del repo', () => {
  it('pasan schema y comprobaciones', () => {
    expect(schemaIssues).toEqual([]);
    expect(checkGeo(bundle, geo).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('cubren el alcance de H1', () => {
    const n = (layer: string) => (geo[layer] as GeoCollection).features.length;
    expect(bundle.places.length).toBeGreaterThanOrEqual(100);
    expect(n('rivers')).toBeGreaterThanOrEqual(25);
    expect(n('mountains')).toBeGreaterThanOrEqual(20);
  });

  it('zoomMin coherente: los grandes hitos se ven desde lejos', () => {
    const byId = new Map(bundle.places.map((p) => [p.id, p]));
    for (const id of ['minas-tirith', 'rivendel', 'hobbiton', 'monte-del-destino'])
      expect(byId.get(id)!.zoomMin).toBe(-3);
    for (const p of bundle.places) expect(p.zoomMin).toBeLessThanOrEqual(3);
  });

  it('nombres de lugar únicos', () => {
    const names = bundle.places.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('ids únicos en todas las capas', () => {
    const ids = Object.values(geo).flatMap((c) =>
      (c as GeoCollection).features.map((f) => f.properties.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('checkGeo detecta errores', () => {
  const coastline: GeoCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: 'tierra', kind: 'land' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [100, 0],
              [100, 100],
              [0, 100],
              [0, 0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { id: 'lago', kind: 'lake', name: 'Lago', labelZoom: 1 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [40, 40],
              [60, 40],
              [60, 60],
              [40, 60],
              [40, 40],
            ],
          ],
        },
      },
    ],
  };
  const place = (id: string, coords: [number, number], extra: Partial<Place> = {}): Place => ({
    id,
    name: id,
    type: 'aldea',
    coords,
    zoomMin: 0,
    ...extra,
  });
  const bundleWith = (places: Place[]): DataBundle => ({
    places,
    characters: [],
    events: [],
    journeys: [],
    routes: [],
  });
  const river = (id: string, coords: [number, number][]): GeoFeature => ({
    type: 'Feature',
    properties: { id, kind: 'river', name: id, labelZoom: 1 },
    geometry: { type: 'LineString', coordinates: coords },
  });
  const codes = (b: DataBundle, rivers: GeoFeature[] = []) =>
    checkGeo(b, { coastline, rivers: { type: 'FeatureCollection', features: rivers } }).map(
      (i) => i.code,
    );

  it('lugar en el mar o en un lago', () => {
    expect(codes(bundleWith([place('a', [150, 50])]))).toContain('place-in-sea');
    expect(codes(bundleWith([place('b', [50, 50])]))).toContain('place-in-water');
    expect(codes(bundleWith([place('c', [50, 50], { onWater: true })]))).toEqual([]);
    expect(codes(bundleWith([place('p', [104, 50], { type: 'puerto' })]))).toEqual([]);
  });

  it('río que no desemboca en ningún sitio', () => {
    expect(
      codes(bundleWith([]), [
        river('r', [
          [10, 10],
          [20, 20],
        ]),
      ]),
    ).toContain('river-mouth');
    expect(
      codes(bundleWith([]), [
        river('r', [
          [10, 10],
          [40, 45],
        ]),
      ]),
    ).toEqual([]); // al lago
    expect(
      codes(bundleWith([]), [
        river('r', [
          [10, 90],
          [10, 99],
        ]),
      ]),
    ).toEqual([]); // al mar
  });
});

describe('glifos de relieve', () => {
  const misty = (geo.mountains as GeoCollection).features.find(
    (f) => f.properties.id === 'montanas-nubladas',
  )!;
  it('son deterministas', () => {
    expect(ridgeGlyphs(misty, 0)).toEqual(ridgeGlyphs(misty, 0));
  });
  it('se quedan dentro de la banda de la cordillera', () => {
    const ridge = misty.geometry.coordinates as [number, number][];
    const width = misty.properties.width!;
    for (const g of ridgeGlyphs(misty, 1)) {
      const base = g.outline[0]!;
      expect(distanceToPolyline(base, ridge)).toBeLessThan(width);
    }
  });
  it('hay más glifos al acercarse', () => {
    expect(ridgeGlyphs(misty, 2).length).toBeGreaterThan(ridgeGlyphs(misty, -1).length);
  });
});
