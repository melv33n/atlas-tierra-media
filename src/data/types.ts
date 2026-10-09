import type { ShireDate } from '../lib/calendar.ts';

/** [x, y] en millas: x hacia el este, y hacia el norte, origen en la esquina SO del mapa. */
export type XY = [number, number];

export type PlaceType =
  | 'ciudad'
  | 'aldea'
  | 'fortaleza'
  | 'torre'
  | 'morada'
  | 'puerto'
  | 'puente'
  | 'vado'
  | 'paso'
  | 'puerta'
  | 'colina'
  | 'monte'
  | 'bosque'
  | 'valle'
  | 'campo'
  | 'lago'
  | 'cascada'
  | 'ruina'
  | 'lugar';

export interface Place {
  id: string;
  name: string;
  altNames?: string[];
  type: PlaceType;
  region?: string;
  coords: XY;
  /** Zoom mínimo al que se muestra la etiqueta (el marcador puede verse antes). */
  zoomMin: number;
  /** Isla o ciudad lacustre: exento de la comprobación de tierra firme. */
  onWater?: boolean;
  note?: string;
}

export type Role = 'main' | 'secondary';

export interface Character {
  id: string;
  name: string;
  /** Nombre corto para leyendas y tablas (Sam, Merry…). */
  shortName?: string;
  altNames?: string[];
  race: string;
  color: string;
  /** Iniciales para el marcador (sin retratos). */
  initials: string;
  group?: string;
  role: Role;
}

/** Libros internos 1–6 (I–II Comunidad, III–IV Dos Torres, V–VI Retorno) o un apéndice. */
export interface SourceRef {
  book?: 1 | 2 | 3 | 4 | 5 | 6;
  chapter?: number;
  appendix?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export interface StoryEvent {
  id: string;
  date: ShireDate;
  endDate?: ShireDate;
  placeId: string;
  title: string;
  /** 1–2 frases con palabras propias. Nunca citas del libro. */
  summary: string;
  characterIds: string[];
  ref: SourceRef;
  tags?: string[];
}

export type Confidence = 'canon' | 'inferred';

export interface Route {
  id: string;
  from: string;
  to: string;
  /** Puntos intermedios (sin incluir los extremos, que salen de `places`). */
  via: XY[];
  roadId?: string;
}

export interface Leg {
  from: string;
  to: string;
  start: ShireDate;
  end: ShireDate;
  /** Geometría compartida; alternativa a `via`. */
  routeId?: string;
  via?: XY[];
  confidence: Confidence;
  note?: string;
}

export interface Journey {
  characterId: string;
  legs: Leg[];
}

export interface DataBundle {
  places: Place[];
  characters: Character[];
  events: StoryEvent[];
  journeys: Journey[];
  routes: Route[];
  /** Ids de features geográficas (p.ej. caminos) para la integridad de `roadId`. */
  geoIds?: string[];
}

export const VOLUMES = {
  1: 'La Comunidad del Anillo',
  2: 'Las Dos Torres',
  3: 'El Retorno del Rey',
} as const;

export const shortNameOf = (c: Character): string => c.shortName ?? c.name;

export function volumeOfBook(book: number): 1 | 2 | 3 {
  return book <= 2 ? 1 : book <= 4 ? 2 : 3;
}
