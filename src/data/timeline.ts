/**
 * Modelo temporal continuo de las rutas.
 *
 * El tiempo `t` es el índice de día del calendario con decimales: el día d va de
 * d a d+1. Dentro de un día se reparten los movimientos así:
 *   - un viaje de varios días sale a d+DEPART y llega a e+ARRIVE;
 *   - los viajes que empiezan y acaban el mismo día se encadenan entre ARRIVE y
 *     DEPART de ese día (llegar a la Balsadera y luego a Cricava, en orden).
 * Entre movimientos el personaje está parado en el lugar de llegada.
 */
import { toDayIndex, type ShireDate } from '../lib/calendar.ts';
import { chaikin, polylineLength } from '../lib/geometry.ts';
import { legShapes, type LegShape } from './legs.ts';
import type { DataBundle, Leg, XY } from './types.ts';
import { zoneOf, type Zone } from './zones.ts';

export const ARRIVE = 0.3;
export const DEPART = 0.7;

export interface Move {
  t0: number;
  t1: number;
  /** Puntos en el sentido del viaje. */
  path: XY[];
  length: number;
  leg: Leg;
  legIndex: number;
}

export interface Stop {
  t0: number;
  t1: number;
  placeId: string;
  xy: XY;
}

export interface Track {
  characterId: string;
  /** Primer y último instante cubiertos por la ruta. */
  start: number;
  end: number;
  moves: Move[];
  stops: Stop[];
}

export function buildTracks(data: DataBundle): Track[] {
  const coords = new Map(data.places.map((p) => [p.id, p.coords]));
  const shapes = new Map<string, LegShape>();
  for (const s of legShapes(data)) shapes.set(`${s.characterId}#${s.index}`, s);

  return data.journeys.map((j) => {
    const moves: Move[] = [];
    // Primero, los viajes de un mismo día se agrupan para repartirlos.
    const sameDay = new Map<number, number[]>();
    j.legs.forEach((leg, i) => {
      const s = toDayIndex(leg.start);
      if (leg.from !== leg.to && s === toDayIndex(leg.end))
        sameDay.set(s, [...(sameDay.get(s) ?? []), i]);
    });
    j.legs.forEach((leg, i) => {
      if (leg.from === leg.to) return;
      const s = toDayIndex(leg.start);
      const e = toDayIndex(leg.end);
      let t0: number;
      let t1: number;
      if (s === e) {
        const group = sameDay.get(s)!;
        const k = group.indexOf(i);
        const w = (DEPART - ARRIVE) / group.length;
        t0 = s + ARRIVE + k * w;
        t1 = t0 + w;
      } else {
        t0 = s + DEPART;
        t1 = e + ARRIVE;
      }
      const shape = shapes.get(`${j.characterId}#${i}`);
      const raw = shape ? chaikin(shape.points, 2) : [coords.get(leg.from)!, coords.get(leg.to)!];
      const path = shape?.reversed ? raw.slice().reverse() : raw;
      moves.push({ t0, t1, path, length: polylineLength(path), leg, legIndex: i });
    });

    const first = j.legs[0]!;
    const last = j.legs[j.legs.length - 1]!;
    const start = toDayIndex(first.start);
    const end = toDayIndex(last.end) + 1;

    // Paradas: los huecos entre movimientos. Un tramo `afterGap` corta la parada
    // en curso (paradero desconocido) y la reanuda en su origen.
    const stops: Stop[] = [];
    let cursor = start;
    let here = first.from;
    let mi = 0;
    j.legs.forEach((leg, i) => {
      if (i > 0 && leg.afterGap) {
        const gapStart = toDayIndex(j.legs[i - 1]!.end) + 1;
        if (gapStart > cursor)
          stops.push({ t0: cursor, t1: gapStart, placeId: here, xy: coords.get(here)! });
        cursor = toDayIndex(leg.start);
        here = leg.from;
      }
      const m = moves[mi];
      if (m && m.legIndex === i) {
        if (m.t0 > cursor)
          stops.push({ t0: cursor, t1: m.t0, placeId: here, xy: coords.get(here)! });
        cursor = m.t1;
        here = m.leg.to;
        mi++;
      }
    });
    if (end > cursor) stops.push({ t0: cursor, t1: end, placeId: here, xy: coords.get(here)! });

    return { characterId: j.characterId, start, end, moves, stops };
  });
}

export interface Position {
  xy: XY;
  /** Lugar si está parado; null si va de camino. */
  placeId: string | null;
  move: Move | null;
}

export function positionAt(track: Track, t: number): Position | null {
  if (t < track.start || t > track.end) return null;
  for (const m of track.moves) {
    if (t >= m.t0 && t <= m.t1)
      return { xy: along(m, (t - m.t0) / (m.t1 - m.t0)), placeId: null, move: m };
  }
  for (const s of track.stops) {
    if (t >= s.t0 && t <= s.t1) return { xy: s.xy, placeId: s.placeId, move: null };
  }
  return null;
}

/** Punto a una fracción f (0–1) de la longitud del camino. */
function along(m: Move, f: number): XY {
  let target = Math.max(0, Math.min(1, f)) * m.length;
  for (let i = 1; i < m.path.length; i++) {
    const a = m.path[i - 1]!;
    const b = m.path[i]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (target <= len) {
      const k = len ? target / len : 0;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    target -= len;
  }
  return m.path[m.path.length - 1]!;
}

export interface Segment {
  characterId: string;
  t0: number;
  t1: number;
  kind: 'stay' | 'move';
  placeId: string;
  zone: Zone | undefined;
  inferred: boolean;
}

/** Segmentos para las calles de la línea temporal (paradas y viajes, sin solaparse). */
export function trackSegments(track: Track, data: DataBundle): Segment[] {
  const places = new Map(data.places.map((p) => [p.id, p]));
  const j = data.journeys.find((x) => x.characterId === track.characterId)!;
  const segs: Segment[] = [];
  for (const s of track.stops) {
    // La confianza de una parada es la del tramo de estancia que la contiene, si lo hay.
    const mid = (s.t0 + s.t1) / 2;
    const stay = j.legs.find(
      (l) =>
        l.from === l.to &&
        l.from === s.placeId &&
        toDayIndex(l.start) <= mid &&
        toDayIndex(l.end) + 1 >= mid,
    );
    segs.push({
      characterId: track.characterId,
      t0: s.t0,
      t1: s.t1,
      kind: 'stay',
      placeId: s.placeId,
      zone: zoneOf(places.get(s.placeId)),
      inferred: stay?.confidence === 'inferred',
    });
  }
  for (const m of track.moves) {
    segs.push({
      characterId: track.characterId,
      t0: m.t0,
      t1: m.t1,
      kind: 'move',
      placeId: m.leg.to,
      zone: zoneOf(places.get(m.leg.to)),
      inferred: m.leg.confidence === 'inferred',
    });
  }
  return segs.sort((a, b) => a.t0 - b.t0);
}

/** Margen tras una llegada para considerar que dos personajes se han reunido. */
const AFTER = 0.05;

function together(a: Track, b: Track, t: number): boolean {
  const pa = positionAt(a, t);
  const pb = positionAt(b, t);
  return !!pa && !!pb && Math.hypot(pa.xy[0] - pb.xy[0], pa.xy[1] - pb.xy[1]) < 1;
}

export interface Convergence {
  /** Instante de la llegada que produce el encuentro. */
  t: number;
  placeId: string;
  /** Todos los presentes en ese momento (principales). */
  characterIds: string[];
  /** Quiénes llegan. */
  arriving: string[];
}

/**
 * Un encuentro se produce cuando alguien llega a un lugar donde ya hay (o llega a
 * la vez) otro personaje principal del que estaba separado el día anterior.
 */
export function convergences(tracks: Track[]): Convergence[] {
  const out = new Map<string, Convergence>();
  for (const track of tracks) {
    for (const m of track.moves) {
      const p = m.leg.to;
      const t = m.t1;
      const met: string[] = [];
      const here: string[] = [track.characterId];
      for (const other of tracks) {
        if (other === track) continue;
        // Juntos justo después de la llegada (en el lugar o saliendo a la vez).
        if (!together(track, other, t + AFTER)) continue;
        here.push(other.characterId);
        // Encuentro de verdad: separados al salir y también el día anterior (así no
        // cuenta volver a reunirse tras una escapada de unas horas).
        if (!together(track, other, m.t0 - 1e-6) && !together(track, other, t - 1))
          met.push(other.characterId);
      }
      if (!met.length) continue;
      const day = Math.floor(t);
      const key = `${p}@${day}`;
      const prev = out.get(key);
      const present = new Set([...(prev?.characterIds ?? []), ...here]);
      const arriving = new Set([...(prev?.arriving ?? []), track.characterId]);
      out.set(key, {
        t: Math.min(prev?.t ?? t, t),
        placeId: p,
        characterIds: [...present],
        arriving: [...arriving],
      });
    }
  }
  return [...out.values()].sort((a, b) => a.t - b.t);
}

/**
 * Instante del día de un evento en que más de sus personajes (con ruta) están en
 * el lugar; a igualdad, el más cercano al mediodía. Así el mapa muestra a Frodo
 * en el Sammath Naur y no ya volando hacia Cormallen.
 */
export function eventInstant(
  e: { date: ShireDate; placeId: string; characterIds: string[] },
  tracks: Track[],
  coordsOf: Map<string, XY>,
): number {
  const d = toDayIndex(e.date);
  const noon = d + 0.5;
  const at = coordsOf.get(e.placeId);
  if ((e.date.precision ?? 'day') !== 'day' || !at) return noon;
  const mine = tracks.filter((t) => e.characterIds.includes(t.characterId));
  if (!mine.length) return noon;
  let best = noon;
  let bestScore = -1;
  for (let k = 1; k < 20; k++) {
    const t = d + k / 20;
    const score = mine.filter((tr) => {
      const p = positionAt(tr, t);
      return !!p && Math.hypot(p.xy[0] - at[0], p.xy[1] - at[1]) < 1.5;
    }).length;
    if (score > bestScore || (score === bestScore && Math.abs(t - noon) < Math.abs(best - noon))) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}
