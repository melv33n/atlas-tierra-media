import { describe, expect, it } from 'vitest';
import {
  buildTracks,
  convergences,
  eventInstant,
  positionAt,
  trackSegments,
  ARRIVE,
  DEPART,
} from '../src/data/timeline.ts';
import { ZONES, zoneOf } from '../src/data/zones.ts';
import { timeTicks } from '../src/timeline/ticks.ts';
import { createStore, initialState } from '../src/state/store.ts';
import { toDayIndex, type ShireDate } from '../src/lib/calendar.ts';
import type { DataBundle, Leg } from '../src/data/types.ts';
import { loadRepo } from '../scripts/lib/repo.ts';

const d = (month: number, day: number, year = 3018): ShireDate => ({ year, month, day });
const T = (month: number, day: number, year = 3018) => toDayIndex(d(month, day, year));
const leg = (from: string, to: string, start: ShireDate, end: ShireDate): Leg => ({
  from,
  to,
  start,
  end,
  confidence: 'canon',
});

function bundle(): DataBundle {
  return {
    places: [
      { id: 'a', name: 'A', type: 'lugar', coords: [0, 0], zoomMin: 0, region: 'La Comarca' },
      { id: 'b', name: 'B', type: 'lugar', coords: [100, 0], zoomMin: 0, region: 'Eriador' },
      { id: 'c', name: 'C', type: 'lugar', coords: [100, 50], zoomMin: 0, region: 'Eriador' },
    ],
    characters: ['x', 'y'].map((id) => ({
      id,
      name: id,
      race: 'hobbit',
      color: '#000000',
      initials: id,
      role: 'main' as const,
    })),
    routes: [],
    events: [],
    journeys: [
      {
        characterId: 'x',
        legs: [
          leg('a', 'a', d(1, 1), d(1, 2)),
          leg('a', 'b', d(1, 2), d(1, 6)),
          leg('b', 'c', d(1, 6), d(1, 6)),
          leg('c', 'c', d(1, 6), d(1, 10)),
        ],
      },
      { characterId: 'y', legs: [leg('c', 'c', d(1, 1), d(1, 10))] },
    ],
  };
}

describe('pistas temporales', () => {
  const tracks = buildTracks(bundle());
  const x = tracks.find((t) => t.characterId === 'x')!;

  it('parado antes de salir y en el lugar de llegada después', () => {
    expect(positionAt(x, T(1, 1) + 0.5)).toMatchObject({ placeId: 'a', xy: [0, 0] });
    expect(positionAt(x, T(1, 8))).toMatchObject({ placeId: 'c', xy: [100, 50] });
  });

  it('interpola a lo largo del camino en los viajes de varios días', () => {
    const t0 = T(1, 2) + DEPART;
    const t1 = T(1, 6) + ARRIVE;
    const mid = positionAt(x, (t0 + t1) / 2)!;
    expect(mid.placeId).toBeNull();
    expect(mid.xy[0]).toBeCloseTo(50, 0);
  });

  it('encadena los viajes de un mismo día tras la llegada', () => {
    const sameDay = x.moves.find((m) => m.leg.from === 'b')!;
    expect(sameDay.t0).toBeCloseTo(T(1, 6) + ARRIVE);
    expect(sameDay.t1).toBeCloseTo(T(1, 6) + DEPART);
  });

  it('fuera de la ruta no hay posición', () => {
    expect(positionAt(x, T(12, 30, 3017))).toBeNull();
    expect(positionAt(x, T(1, 12))).toBeNull();
  });

  it('segmentos sin solapes y con zona', () => {
    const segs = trackSegments(x, bundle());
    for (let i = 1; i < segs.length; i++)
      expect(segs[i]!.t0).toBeGreaterThanOrEqual(segs[i - 1]!.t1 - 1e-9);
    expect(segs[0]!.zone?.id).toBe('comarca');
    expect(segs.at(-1)!.zone?.id).toBe('eriador');
  });

  it('detecta el encuentro al llegar donde espera otro', () => {
    const meets = convergences(tracks);
    expect(meets).toHaveLength(1);
    expect(meets[0]).toMatchObject({ placeId: 'c', arriving: ['x'] });
    expect(new Set(meets[0]!.characterIds)).toEqual(new Set(['x', 'y']));
  });
});

describe('paradero desconocido (afterGap)', () => {
  const data = bundle();
  data.journeys[1]!.legs = [
    leg('c', 'c', d(1, 1), d(1, 3)),
    { ...leg('a', 'a', d(1, 8), d(1, 10)), afterGap: true },
  ];
  const y = buildTracks(data).find((t) => t.characterId === 'y')!;
  it('no hay posición en el hueco y se reanuda en el nuevo lugar', () => {
    expect(positionAt(y, T(1, 2))?.placeId).toBe('c');
    expect(positionAt(y, T(1, 5))).toBeNull();
    expect(positionAt(y, T(1, 9))?.placeId).toBe('a');
  });
});

describe('datos reales', () => {
  const { bundle: data } = loadRepo();
  const tracks = buildTracks(data);

  it('todo lugar con región cae en una zona', () => {
    for (const p of data.places) if (p.region) expect(zoneOf(p), p.id).toBeDefined();
    expect(ZONES.length).toBeLessThanOrEqual(8);
  });

  it('el 14-ene-3019 la Compañía está en la Sala Veintiuno y Gollum en Moria', () => {
    const at = (id: string) =>
      positionAt(
        tracks.find((t) => t.characterId === id)!,
        T(1, 14, 3019) + 0.9,
      );
    for (const id of ['frodo', 'aragorn', 'gandalf', 'boromir'])
      expect(at(id)?.placeId).toBe('sala-veintiuno');
    expect(at('gollum')?.placeId).toBe('moria'); // los sigue de cerca, sin adelantarlos
  });

  it('el instante de cada evento muestra a sus protagonistas en el lugar', () => {
    const coords = new Map(data.places.map((p) => [p.id, p.coords]));
    const doom = data.events.find((e) => e.id === 'monte-del-destino')!;
    const t = eventInstant(doom, tracks, coords);
    for (const id of ['frodo', 'sam', 'gollum'])
      expect(
        positionAt(
          tracks.find((x) => x.characterId === id)!,
          t,
        )?.xy,
      ).toEqual(coords.get('monte-del-destino'));
  });

  it('encuentros clave: Bree con Aragorn y Rivendel con Gandalf', () => {
    const meets = convergences(tracks);
    const bree = meets.find((m) => m.placeId === 'bree');
    expect(bree?.characterIds).toContain('aragorn');
    const riv = meets.filter((m) => m.placeId === 'rivendel');
    expect(
      riv.some((m) => m.characterIds.includes('gandalf') && m.arriving.includes('frodo')),
    ).toBe(true);
    expect(riv.some((m) => m.arriving.includes('boromir'))).toBe(true);
    // No cuenta como encuentro volver a juntarse tras unas horas separados.
    expect(meets.some((m) => m.placeId === 'cricava')).toBe(false);
  });
});

describe('marcas del eje', () => {
  it('años, meses o días según la escala', () => {
    const a = T(1, 1, 3001);
    const b = T(1, 1, 3020);
    expect(timeTicks(a, b, 0.05).every((t) => /^\d{4}$/.test(t.label))).toBe(true);
    const m = timeTicks(T(9, 1), T(3, 1, 3019), 4);
    expect(m.map((t) => t.label)).toContain('ene 3019');
    const days = timeTicks(T(1, 10, 3019), T(1, 20, 3019), 60);
    expect(days.map((t) => t.label)).toContain('15');
  });
});

describe('store', () => {
  it('notifica solo cuando algo cambia', () => {
    const store = createStore(initialState({ t: 1 }));
    let calls = 0;
    store.subscribe(() => calls++);
    store.set({ t: 1 });
    store.set({ t: 2 });
    expect(calls).toBe(1);
    expect(store.get().t).toBe(2);
  });
});
