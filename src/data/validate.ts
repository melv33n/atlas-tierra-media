/**
 * Comprobaciones semánticas de los datos (las de forma las hace JSON Schema).
 * Función pura: la usan `scripts/validate.ts` y los tests.
 */
import { formatDate, toDayIndex, type ShireDate } from '../lib/calendar.ts';
import type { DataBundle, Journey, Leg } from './types.ts';

export interface Issue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface CoverageRow {
  characterId: string;
  legs: number;
  inferredLegs: number;
  events: number;
  firstDay?: number;
  lastDay?: number;
}

export interface ValidationResult {
  issues: Issue[];
  coverage: {
    byCharacter: CoverageRow[];
    eventsByBook: Record<string, number>;
  };
}

/** Dónde puede estar un personaje un día: lugares concretos o «de camino». */
export interface DayPosition {
  places: Set<string>;
  inTransit: Leg[];
}

function safeIndex(date: ShireDate): number | undefined {
  try {
    return toDayIndex(date);
  } catch {
    return undefined;
  }
}

/**
 * Semántica de un tramo [start, end] (inclusive): el día `start` está en `from`,
 * el día `end` en `to`, y entre medias de camino (o en `from` si es una estancia).
 */
export function positionOn(journey: Journey, day: number): DayPosition {
  const pos: DayPosition = { places: new Set(), inTransit: [] };
  for (const leg of journey.legs) {
    const s = safeIndex(leg.start);
    const e = safeIndex(leg.end);
    if (s === undefined || e === undefined || day < s || day > e) continue;
    if (leg.from === leg.to) {
      pos.places.add(leg.from);
      continue;
    }
    if (day === s) pos.places.add(leg.from);
    if (day === e) pos.places.add(leg.to);
    if (day > s && day < e) pos.inTransit.push(leg);
  }
  return pos;
}

export function validateBundle(data: DataBundle): ValidationResult {
  const issues: Issue[] = [];
  const err = (code: string, message: string) => issues.push({ level: 'error', code, message });
  const warn = (code: string, message: string) => issues.push({ level: 'warning', code, message });

  // --- Unicidad de ids -----------------------------------------------------
  const uniq = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err('duplicate-id', `${kind}: id duplicado «${id}»`);
      seen.add(id);
    }
    return seen;
  };
  const placeIds = uniq(
    'places',
    data.places.map((p) => p.id),
  );
  const charIds = uniq(
    'characters',
    data.characters.map((c) => c.id),
  );
  const routeIds = uniq(
    'routes',
    data.routes.map((r) => r.id),
  );
  uniq(
    'events',
    data.events.map((e) => e.id),
  );
  uniq(
    'journeys',
    data.journeys.map((j) => j.characterId),
  );
  const geoIds = new Set(data.geoIds ?? []);

  // --- Integridad referencial ---------------------------------------------
  const needPlace = (id: string, where: string) => {
    if (!placeIds.has(id)) err('missing-place', `${where}: lugar inexistente «${id}»`);
  };
  const needChar = (id: string, where: string) => {
    if (!charIds.has(id)) err('missing-character', `${where}: personaje inexistente «${id}»`);
  };

  for (const r of data.routes) {
    needPlace(r.from, `route ${r.id}`);
    needPlace(r.to, `route ${r.id}`);
    if (r.roadId && data.geoIds && !geoIds.has(r.roadId))
      err('missing-road', `route ${r.id}: camino inexistente «${r.roadId}»`);
  }
  for (const e of data.events) {
    needPlace(e.placeId, `event ${e.id}`);
    for (const c of e.characterIds) needChar(c, `event ${e.id}`);
    for (const d of [e.date, e.endDate]) {
      if (d && safeIndex(d) === undefined)
        err('bad-date', `event ${e.id}: fecha imposible ${JSON.stringify(d)}`);
    }
  }

  const routesById = new Map(data.routes.map((r) => [r.id, r]));
  for (const j of data.journeys) {
    needChar(j.characterId, `journey ${j.characterId}`);
    j.legs.forEach((leg, i) => {
      const where = `journey ${j.characterId} tramo ${i}`;
      needPlace(leg.from, where);
      needPlace(leg.to, where);
      if (leg.routeId) {
        const r = routesById.get(leg.routeId);
        if (!routeIds.has(leg.routeId) || !r)
          err('missing-route', `${where}: ruta «${leg.routeId}»`);
        else if (!(
          (r.from === leg.from && r.to === leg.to) ||
          (r.from === leg.to && r.to === leg.from)
        ))
          err('route-mismatch', `${where}: la ruta ${r.id} no une ${leg.from}→${leg.to}`);
      }
      if (leg.routeId && leg.via)
        warn('route-and-via', `${where}: tiene routeId y via; se usa routeId`);
    });
  }

  // --- Cronología por personaje -------------------------------------------
  for (const j of data.journeys) {
    let prev: { leg: Leg; end: number } | undefined;
    j.legs.forEach((leg, i) => {
      const where = `journey ${j.characterId} tramo ${i} (${leg.from}→${leg.to})`;
      const s = safeIndex(leg.start);
      const e = safeIndex(leg.end);
      if (s === undefined || e === undefined) {
        err('bad-date', `${where}: fecha imposible`);
        return;
      }
      if (e < s) err('leg-reversed', `${where}: termina antes de empezar`);
      if (prev) {
        if (s < prev.end)
          err(
            'leg-overlap',
            `${where}: empieza (${formatDate(leg.start)}) antes de que acabe el anterior (${formatDate(prev.leg.end)})`,
          );
        else if (s > prev.end)
          err(
            'leg-gap',
            `${where}: hueco desde ${formatDate(prev.leg.end)} hasta ${formatDate(leg.start)}`,
          );
        if (leg.from !== prev.leg.to)
          err(
            'leg-teleport',
            `${where}: sale de «${leg.from}» pero el tramo anterior acaba en «${prev.leg.to}»`,
          );
      }
      prev = { leg, end: e };
    });
  }

  // --- Eventos ↔ rutas ------------------------------------------------------
  const journeyByChar = new Map(data.journeys.map((j) => [j.characterId, j]));
  const secondaryPlacesByDay = new Map<string, Map<number, Set<string>>>();

  for (const ev of data.events) {
    const day = safeIndex(ev.date);
    if (day === undefined) continue;
    const exact = (ev.date.precision ?? 'day') === 'day';
    for (const cid of ev.characterIds) {
      const j = journeyByChar.get(cid);
      if (!j) {
        if (!exact) continue;
        const byDay = secondaryPlacesByDay.get(cid) ?? new Map<number, Set<string>>();
        secondaryPlacesByDay.set(cid, byDay);
        const set = byDay.get(day) ?? new Set<string>();
        set.add(ev.placeId);
        byDay.set(day, set);
        continue;
      }
      if (!exact) continue;
      const pos = positionOn(j, day);
      if (pos.places.size === 0 && pos.inTransit.length === 0) {
        warn(
          'event-outside-journey',
          `event ${ev.id}: ${cid} no tiene ruta el ${formatDate(ev.date)}`,
        );
      } else if (!pos.places.has(ev.placeId)) {
        const where = pos.places.size
          ? `está en ${[...pos.places].join('/')}`
          : `está de camino (${pos.inTransit.map((l) => `${l.from}→${l.to}`).join(', ')})`;
        err(
          'event-place-mismatch',
          `event ${ev.id} (${ev.placeId}, ${formatDate(ev.date)}): ${cid} ${where}`,
        );
      }
    }
  }

  // Personajes sin ruta: no pueden estar en dos lugares distintos el mismo día.
  for (const [cid, byDay] of secondaryPlacesByDay) {
    for (const [, places] of byDay) {
      if (places.size > 1)
        err('ubiquity', `${cid} aparece el mismo día en ${[...places].join(' y ')}`);
    }
  }

  // --- Cobertura ------------------------------------------------------------
  const eventsPerChar = new Map<string, number>();
  const eventsByBook: Record<string, number> = {};
  for (const ev of data.events) {
    for (const c of ev.characterIds) eventsPerChar.set(c, (eventsPerChar.get(c) ?? 0) + 1);
    const key = ev.ref.book
      ? `Libro ${ev.ref.book}`
      : ev.ref.appendix
        ? `Apéndice ${ev.ref.appendix}`
        : 'sin referencia';
    eventsByBook[key] = (eventsByBook[key] ?? 0) + 1;
  }
  const byCharacter: CoverageRow[] = data.characters.map((c) => {
    const j = journeyByChar.get(c.id);
    const legs = j?.legs ?? [];
    const first = legs[0];
    const last = legs[legs.length - 1];
    return {
      characterId: c.id,
      legs: legs.length,
      inferredLegs: legs.filter((l) => l.confidence === 'inferred').length,
      events: eventsPerChar.get(c.id) ?? 0,
      firstDay: first ? safeIndex(first.start) : undefined,
      lastDay: last ? safeIndex(last.end) : undefined,
    };
  });
  for (const c of data.characters) {
    if (c.role === 'main' && !journeyByChar.has(c.id) && data.journeys.length > 0)
      warn('main-without-journey', `${c.id} es principal y no tiene ruta`);
  }

  return { issues, coverage: { byCharacter, eventsByBook } };
}
