/** «¿Dónde está cada uno?»: los personajes agrupados por su lugar en un instante. */
import { positionAt, type Track } from './timeline.ts';

export interface WhereGroup {
  /** Lugar donde están o al que se dirigen; null si no consta. */
  placeId: string | null;
  kind: 'stay' | 'move' | 'none';
  characterIds: string[];
}

/**
 * Agrupa respetando el orden de `order` (el de la Compañía). Primero los grupos más
 * numerosos; los que van de camino al mismo sitio forman su propio grupo; al final,
 * quienes no tienen posición en esa fecha.
 */
export function whereabouts(tracks: Track[], t: number, order: string[]): WhereGroup[] {
  const byId = new Map(tracks.map((tr) => [tr.characterId, tr]));
  const groups = new Map<string, WhereGroup>();
  for (const id of order) {
    const tr = byId.get(id);
    const pos = tr ? positionAt(tr, t) : null;
    const kind: WhereGroup['kind'] = !pos ? 'none' : pos.placeId ? 'stay' : 'move';
    const placeId = pos ? (pos.placeId ?? pos.move!.leg.to) : null;
    const key = `${kind}:${placeId}`;
    const g = groups.get(key) ?? { placeId, kind, characterIds: [] };
    g.characterIds.push(id);
    groups.set(key, g);
  }
  const weight = (g: WhereGroup) => (g.kind === 'none' ? -1 : g.characterIds.length);
  return [...groups.values()].sort((a, b) => weight(b) - weight(a));
}
