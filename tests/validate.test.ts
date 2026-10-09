import { describe, expect, it } from 'vitest';
import { validateBundle, positionOn } from '../src/data/validate.ts';
import type { DataBundle, Journey, Leg, StoryEvent } from '../src/data/types.ts';
import type { ShireDate } from '../src/lib/calendar.ts';
import { toDayIndex } from '../src/lib/calendar.ts';
import { checkSchema, createAjv } from '../scripts/lib/repo.ts';

const d = (month: number, day: number, year = 3018): ShireDate => ({ year, month, day });

function base(): DataBundle {
  return {
    places: [
      { id: 'hobbiton', name: 'Hobbiton', type: 'aldea', coords: [100, 100], zoomMin: 1 },
      { id: 'bree', name: 'Bree', type: 'aldea', coords: [200, 100], zoomMin: 1 },
      { id: 'rivendel', name: 'Rivendel', type: 'morada', coords: [400, 120], zoomMin: 1 },
    ],
    characters: [
      { id: 'frodo', name: 'Frodo', race: 'hobbit', color: '#aa3322', initials: 'F', role: 'main' },
      {
        id: 'elrond',
        name: 'Elrond',
        race: 'elfo',
        color: '#3344aa',
        initials: 'E',
        role: 'secondary',
      },
    ],
    routes: [{ id: 'camino-este-1', from: 'hobbiton', to: 'bree', via: [[150, 105]] }],
    journeys: [
      {
        characterId: 'frodo',
        legs: [
          {
            from: 'hobbiton',
            to: 'bree',
            start: d(9, 23),
            end: d(9, 29),
            routeId: 'camino-este-1',
            confidence: 'canon',
          },
          { from: 'bree', to: 'bree', start: d(9, 29), end: d(9, 30), confidence: 'canon' },
          { from: 'bree', to: 'rivendel', start: d(9, 30), end: d(10, 20), confidence: 'inferred' },
        ],
      },
    ],
    events: [
      {
        id: 'llegada-bree',
        date: d(9, 29),
        placeId: 'bree',
        title: 'Llegada a Bree',
        summary: 'Los hobbits llegan a la posada.',
        characterIds: ['frodo'],
        ref: { book: 1, chapter: 9 },
      },
    ],
  };
}

const codes = (data: DataBundle) => validateBundle(data).issues.map((i) => i.code);
const frodo = (data: DataBundle) => data.journeys[0]!;
const leg = (data: DataBundle, i: number) => frodo(data).legs[i]!;

describe('validateBundle', () => {
  it('acepta un conjunto coherente', () => {
    expect(validateBundle(base()).issues).toEqual([]);
  });

  it('integridad referencial', () => {
    const data = base();
    data.events[0]!.characterIds.push('sauron');
    data.events[0]!.placeId = 'mordor';
    leg(data, 0).routeId = 'no-existe';
    expect(codes(data)).toEqual(
      expect.arrayContaining(['missing-character', 'missing-place', 'missing-route']),
    );
  });

  it('detecta huecos entre tramos', () => {
    const data = base();
    leg(data, 1).start = d(9, 30);
    leg(data, 1).end = d(9, 30);
    leg(data, 2).start = d(10, 2);
    expect(codes(data)).toContain('leg-gap');
  });

  it('detecta solapes', () => {
    const data = base();
    leg(data, 1).start = d(9, 27);
    expect(codes(data)).toContain('leg-overlap');
  });

  it('detecta teletransporte (tramo que no sale de donde acabó el anterior)', () => {
    const data = base();
    leg(data, 2).from = 'hobbiton';
    expect(codes(data)).toContain('leg-teleport');
  });

  it('detecta ruta que no une los extremos del tramo', () => {
    const data = base();
    leg(data, 2).routeId = 'camino-este-1';
    expect(codes(data)).toContain('route-mismatch');
  });

  it('evento en un lugar donde el personaje no está', () => {
    const data = base();
    data.events[0]!.placeId = 'rivendel';
    expect(codes(data)).toContain('event-place-mismatch');
  });

  it('evento en mitad de un tramo de viaje', () => {
    const data = base();
    data.events[0]!.date = d(10, 5);
    expect(codes(data)).toContain('event-place-mismatch');
  });

  it('nadie en dos sitios el mismo día (personajes sin ruta)', () => {
    const data = base();
    const ev = (id: string, placeId: string): StoryEvent => ({
      id,
      date: d(10, 25),
      placeId,
      title: id,
      summary: '…',
      characterIds: ['elrond'],
      ref: { book: 2, chapter: 1 },
    });
    data.events.push(ev('a', 'rivendel'), ev('b', 'bree'));
    expect(codes(data)).toContain('ubiquity');
  });

  it('fechas imposibles y tramos invertidos', () => {
    const data = base();
    leg(data, 0).end = d(9, 20);
    expect(codes(data)).toContain('leg-reversed');
    data.events[0]!.date = { year: 3019, special: 'overlithe' };
    expect(codes(data)).toContain('bad-date');
  });

  it('cobertura por personaje y libro', () => {
    const { coverage } = validateBundle(base());
    const f = coverage.byCharacter.find((r) => r.characterId === 'frodo')!;
    expect(f).toMatchObject({ legs: 3, inferredLegs: 1, events: 1 });
    expect(f.firstDay).toBe(toDayIndex(d(9, 23)));
    expect(coverage.eventsByBook).toEqual({ 'Libro 1': 1 });
  });
});

describe('positionOn', () => {
  const j: Journey = base().journeys[0]!;
  it('en los extremos está en el lugar; entre medias, de camino', () => {
    expect([...positionOn(j, toDayIndex(d(9, 23))).places]).toEqual(['hobbiton']);
    const mid = positionOn(j, toDayIndex(d(9, 25)));
    expect(mid.places.size).toBe(0);
    expect(mid.inTransit.map((l: Leg) => l.to)).toEqual(['bree']);
    expect([...positionOn(j, toDayIndex(d(9, 29))).places]).toEqual(['bree']);
  });
});

describe('JSON Schema', () => {
  const ajv = createAjv();
  it('fecha: special y month son excluyentes', () => {
    const ok = [
      {
        id: 'x',
        date: { year: 3019, special: 'midyear' },
        placeId: 'p',
        title: 't',
        summary: 's',
        characterIds: [],
        ref: { appendix: 'B' },
      },
    ];
    expect(checkSchema(ajv, 'events', 'e', ok)).toEqual([]);
    const bad = structuredClone(ok);
    (bad[0]!.date as ShireDate).month = 6;
    expect(checkSchema(ajv, 'events', 'e', bad).length).toBeGreaterThan(0);
  });
  it('lugares: ids en kebab-case y tipos conocidos', () => {
    const bad = [
      { id: 'Minas Tirith', name: 'Minas Tirith', type: 'metrópoli', coords: [1, 2], zoomMin: 1 },
    ];
    expect(checkSchema(ajv, 'places', 'p', bad).length).toBeGreaterThanOrEqual(2);
  });
  it('resumen de evento limitado (sin citas largas)', () => {
    const long = [
      {
        id: 'x',
        date: { year: 3019 },
        placeId: 'p',
        title: 't',
        summary: 'a'.repeat(400),
        characterIds: [],
        ref: { book: 1 },
      },
    ];
    expect(checkSchema(ajv, 'events', 'e', long).length).toBeGreaterThan(0);
  });
});
