/** Búsqueda de lugares, sucesos y personajes, sin distinguir mayúsculas ni acentos. */
import type { DataBundle } from './types.ts';
import { shortNameOf } from './types.ts';

export type HitKind = 'place' | 'event' | 'character';

export interface Hit {
  kind: HitKind;
  id: string;
  title: string;
  /** Línea secundaria (región, lugar del suceso…). */
  sub: string;
  /** Posición de la coincidencia en `title` (para resaltarla), o -1. */
  at: number;
  /** Longitud de la coincidencia. */
  len: number;
  score: number;
}

export const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Puntuación: el nombre empieza por la búsqueda > alguna palabra empieza > contiene. */
function rank(text: string, q: string): { score: number; at: number } {
  const n = normalize(text);
  const at = n.indexOf(q);
  if (at < 0) return { score: 0, at: -1 };
  if (at === 0) return { score: 3, at };
  if (/[\s(-]/.test(n[at - 1] ?? '')) return { score: 2, at };
  return { score: 1, at };
}

function best(q: string, main: string, others: string[]): { score: number; at: number } {
  const r = rank(main, q);
  if (r.score) return r;
  const alt = Math.max(0, ...others.map((o) => rank(o, q).score));
  return { score: alt ? alt - 0.5 : 0, at: -1 };
}

export function search(data: DataBundle, query: string, limit = 30): Hit[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const placeName = new Map(data.places.map((p) => [p.id, p.name]));
  const hits: Hit[] = [];
  for (const p of data.places) {
    const r = best(q, p.name, p.altNames ?? []);
    if (r.score)
      hits.push({
        kind: 'place',
        id: p.id,
        title: p.name,
        sub: p.region ?? '',
        at: r.at,
        len: q.length,
        score: r.score + 0.3,
      });
  }
  for (const c of data.characters) {
    const r = best(q, c.name, [shortNameOf(c), ...(c.altNames ?? [])]);
    if (r.score)
      hits.push({
        kind: 'character',
        id: c.id,
        title: c.name,
        sub: c.race,
        at: r.at,
        len: q.length,
        score: r.score + 0.2,
      });
  }
  for (const e of data.events) {
    const where = placeName.get(e.placeId) ?? '';
    const r = best(q, e.title, [where]);
    if (r.score)
      hits.push({
        kind: 'event',
        id: e.id,
        title: e.title,
        sub: where,
        at: r.at,
        len: q.length,
        score: r.score,
      });
  }
  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'))
    .slice(0, limit);
}
