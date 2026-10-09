/** Tipos de las capas geográficas propias (`data/geo/*.geojson`, coordenadas en millas). */
import type { XY } from './types.ts';

export type GeoKind =
  | 'land'
  | 'island'
  | 'lake'
  | 'range'
  | 'hills'
  | 'peak'
  | 'river'
  | 'forest'
  | 'marsh'
  | 'road'
  | 'region'
  | 'border';

export interface GeoProps {
  id: string;
  kind: GeoKind;
  name?: string;
  altNames?: string[];
  rank?: number;
  labelZoom?: number;
  labelAt?: number;
  width?: number;
  smooth?: boolean;
  note?: string;
}

export type GeoGeometry =
  | { type: 'Point'; coordinates: XY }
  | { type: 'LineString'; coordinates: XY[] }
  | { type: 'Polygon'; coordinates: XY[][] };

export interface GeoFeature<G extends GeoGeometry = GeoGeometry> {
  type: 'Feature';
  properties: GeoProps;
  geometry: G;
}

export interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export const GEO_LAYERS = [
  'coastline',
  'mountains',
  'rivers',
  'forests',
  'roads',
  'regions',
] as const;
export type GeoLayerName = (typeof GEO_LAYERS)[number];
export type GeoData = Record<GeoLayerName, GeoCollection>;

export const isPolygon = (
  f: GeoFeature,
): f is GeoFeature<{ type: 'Polygon'; coordinates: XY[][] }> => f.geometry.type === 'Polygon';
export const isLine = (f: GeoFeature): f is GeoFeature<{ type: 'LineString'; coordinates: XY[] }> =>
  f.geometry.type === 'LineString';
export const isPoint = (f: GeoFeature): f is GeoFeature<{ type: 'Point'; coordinates: XY }> =>
  f.geometry.type === 'Point';
