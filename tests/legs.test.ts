import { describe, expect, it } from 'vitest';
import { assignLanes, legShapes, offsetPolyline } from '../src/data/legs.ts';
import type { DataBundle, Leg, XY } from '../src/data/types.ts';
import { toDayIndex, type ShireDate } from '../src/lib/calendar.ts';
import { loadRepo } from '../scripts/lib/repo.ts';
import { distanceToPolyline } from '../src/lib/geometry.ts';

const d = (month: number, day: number, year = 3018): ShireDate => ({ year, month, day });
const leg = (
  from: string,
  to: string,
  start: ShireDate,
  end: ShireDate,
  routeId?: string,
): Leg => ({
  from,
  to,
  start,
  end,
  confidence: 'canon',
  ...(routeId ? { routeId } : {}),
});

function bundle(): DataBundle {
  return {
    places: [
      { id: 'a', name: 'A', type: 'lugar', coords: [0, 0], zoomMin: 0 },
      { id: 'b', name: 'B', type: 'lugar', coords: [100, 0], zoomMin: 0 },
    ],
    characters: ['x', 'y', 'z'].map((id) => ({
      id,
      name: id,
      race: 'hobbit',
      color: '#000000',
      initials: id,
      role: 'main' as const,
    })),
    routes: [{ id: 'a--b', from: 'a', to: 'b', via: [[50, 10]] }],
    events: [],
    journeys: [
      { characterId: 'x', legs: [leg('a', 'b', d(1, 1), d(1, 5), 'a--b')] },
      { characterId: 'y', legs: [leg('b', 'a', d(1, 3), d(1, 8), 'a--b')] },
      {
        characterId: 'z',
        legs: [leg('a', 'b', d(3, 1), d(3, 4), 'a--b'), leg('b', 'b', d(3, 4), d(3, 9))],
      },
    ],
  };
}

describe('legShapes', () => {
  it('omite estancias y orienta todo en el sentido del trazado', () => {
    const shapes = legShapes(bundle());
    expect(shapes).toHaveLength(3);
    const y = shapes.find((s) => s.characterId === 'y')!;
    expect(y.reversed).toBe(true);
    expect(y.points).toEqual([
      [0, 0],
      [50, 10],
      [100, 0],
    ]);
    expect(y.startDay).toBe(toDayIndex(d(1, 3)));
  });
});

describe('assignLanes', () => {
  it('quien comparte trazado en fechas solapadas va en carriles distintos', () => {
    const shapes = legShapes(bundle());
    const lanes = assignLanes(shapes, ['x', 'y', 'z']);
    const of = (id: string) => lanes.get(shapes.find((s) => s.characterId === id)!)!;
    expect(of('x')).toEqual({ lane: 0, lanes: 2 });
    expect(of('y')).toEqual({ lane: 1, lanes: 2 });
    // z pasa meses después: va solo.
    expect(of('z')).toEqual({ lane: 0, lanes: 1 });
  });
});

describe('offsetPolyline', () => {
  it('desplaza a la izquierda del sentido y conserva el número de puntos', () => {
    const line: XY[] = [
      [0, 0],
      [10, 0],
    ];
    expect(offsetPolyline(line, 2)).toEqual([
      [0, 2],
      [10, 2],
    ]);
    expect(offsetPolyline(line, -2)[0]).toEqual([0, -2]);
  });
  it('mantiene la distancia en las esquinas sin crear picos', () => {
    const corner: XY[] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const out = offsetPolyline(corner, 1);
    for (const p of out) expect(distanceToPolyline(p, corner)).toBeGreaterThan(0.9);
    expect(Math.hypot(out[1]![0] - 10, out[1]![1])).toBeLessThanOrEqual(2);
  });
});

describe('datos de H2 (hasta Amon Hen)', () => {
  const { bundle: data } = loadRepo();
  const main = data.characters.filter((c) => c.role === 'main');
  const amonHen = toDayIndex(d(2, 26, 3019));

  it('los diez personajes principales tienen ruta', () => {
    expect(main).toHaveLength(10);
    for (const c of main) expect(data.journeys.some((j) => j.characterId === c.id)).toBe(true);
  });

  it('todas las rutas llegan hasta la ruptura de la Compañía (Gandalf, hasta Lórien)', () => {
    for (const j of data.journeys) {
      const last = j.legs[j.legs.length - 1]!;
      const end = toDayIndex(last.end);
      if (j.characterId === 'gandalf') expect(end).toBe(toDayIndex(d(2, 17, 3019)));
      else expect(end).toBe(amonHen);
    }
  });

  it('la Compañía sale junta de Rivendel el 25 de diciembre de 3018', () => {
    const fellowship = [
      'frodo',
      'sam',
      'merry',
      'pippin',
      'aragorn',
      'legolas',
      'gimli',
      'gandalf',
      'boromir',
    ];
    const start = toDayIndex(d(12, 25));
    for (const id of fellowship) {
      const j = data.journeys.find((x) => x.characterId === id)!;
      expect(
        j.legs.some(
          (l) => l.from === 'rivendel' && l.to === 'acebeda' && toDayIndex(l.start) === start,
        ),
      ).toBe(true);
    }
  });

  it('a pie o en barca nadie supera 70 millas por jornada', () => {
    const mounted = new Set(['gandalf']);
    for (const s of legShapes(data)) {
      if (mounted.has(s.characterId)) continue;
      const miles = s.points
        .slice(1)
        .reduce((acc, p, i) => acc + Math.hypot(p[0] - s.points[i]![0], p[1] - s.points[i]![1]), 0);
      const days = Math.max(1, s.endDay - s.startDay);
      expect(miles / days, `${s.characterId} ${s.leg.from}→${s.leg.to}`).toBeLessThan(70);
    }
  });

  it('los resúmenes son breves (sin citas largas)', () => {
    for (const e of data.events) {
      expect(e.summary.length).toBeLessThanOrEqual(320);
      expect(e.summary.split(/[.!?]\s/).length).toBeLessThanOrEqual(3);
    }
  });
});
