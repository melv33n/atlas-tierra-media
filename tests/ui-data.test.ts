import { describe, expect, it } from 'vitest';
import { BOOKS, booksRange } from '../src/data/books.ts';
import { normalize, search } from '../src/data/search.ts';
import { whereabouts } from '../src/data/whereabouts.ts';
import { buildTracks } from '../src/data/timeline.ts';
import { decodeUrlState, encodeUrlState } from '../src/state/url.ts';
import { formatDateShort, toDayIndex } from '../src/lib/calendar.ts';
import { loadRepo } from '../scripts/lib/repo.ts';

const { bundle: data } = loadRepo();
const tracks = buildTracks(data);
const T = (month: number, day: number, year = 3019) => toDayIndex({ year, month, day });
const MAIN = data.characters.filter((c) => c.role === 'main').map((c) => c.id);

describe('libros', () => {
  it('cada libro empieza antes de acabar y cubre sus propios sucesos principales', () => {
    for (const b of BOOKS) expect(toDayIndex(b.start)).toBeLessThan(toDayIndex(b.end));
    const r = booksRange([5])!;
    const pelennor = data.events.find((e) => e.id === 'batalla-del-pelennor')!;
    expect(toDayIndex(pelennor.date)).toBeGreaterThanOrEqual(r[0]);
    expect(toDayIndex(pelennor.date)).toBeLessThan(r[1]);
  });
  it('varios libros: del primer inicio al último final; ninguno = sin rango', () => {
    expect(booksRange([1, 3])).toEqual([T(9, 22, 3018), T(3, 5) + 1]);
    expect(booksRange([])).toBeNull();
  });
});

describe('búsqueda', () => {
  it('ignora mayúsculas y acentos', () => {
    expect(normalize('Éowyn ÁRBOL')).toBe('eowyn arbol');
    expect(search(data, 'eowyn').some((h) => h.kind === 'character' && h.id === 'eowyn')).toBe(
      true,
    );
  });
  it('lo que empieza por la búsqueda va primero y se marca la coincidencia', () => {
    const hits = search(data, 'mor');
    expect(hits[0]!.title.toLowerCase().startsWith('mor')).toBe(true);
    const morgul = hits.find((h) => h.id === 'minas-morgul')!;
    expect(morgul.title.slice(morgul.at, morgul.at + morgul.len)).toBe('Mor');
  });
  it('encuentra sucesos por el nombre de su lugar y lugares por su nombre original', () => {
    expect(search(data, 'pelennor').some((h) => h.id === 'batalla-del-pelennor')).toBe(true);
    expect(search(data, 'rivendell').some((h) => h.id === 'rivendel')).toBe(true);
  });
  it('menos de dos letras no busca', () => {
    expect(search(data, 'm')).toEqual([]);
  });
});

describe('¿dónde está cada uno?', () => {
  it('el día del Pelennor la Compañía está repartida y Boromir no tiene posición', () => {
    const groups = whereabouts(tracks, T(3, 15) + 0.5, MAIN);
    expect(groups.flatMap((g) => g.characterIds).sort()).toEqual([...MAIN].sort());
    const frodo = groups.find((g) => g.characterIds.includes('frodo'))!;
    expect(frodo.characterIds).toContain('sam');
    expect(frodo.placeId).toBe('torre-de-cirith-ungol');
    expect(groups.at(-1)).toMatchObject({ kind: 'none', characterIds: ['boromir'] });
  });
  it('en el Concilio de Elrond están todos en Rivendel menos Gollum', () => {
    const groups = whereabouts(tracks, T(10, 25, 3018) + 0.5, MAIN);
    expect(groups[0]).toMatchObject({ placeId: 'rivendel', kind: 'stay' });
    expect(groups[0]!.characterIds).toHaveLength(9);
  });
});

describe('estado en la URL', () => {
  it('ida y vuelta', () => {
    const s = {
      t: 6650.25,
      eventId: 'batalla-del-pelennor',
      hidden: ['gollum', 'boromir'],
      range: [6639, 6660] as [number, number],
      follow: false,
    };
    const back = decodeUrlState(encodeUrlState(s));
    expect(back).toEqual({ ...s, hidden: ['boromir', 'gollum'] });
  });
  it('ignora valores mal formados', () => {
    expect(decodeUrlState('?t=abc&e=<script>&ocultos=frodo,%20x!&rango=9~3')).toEqual({
      hidden: ['frodo'],
    });
  });
  it('sin estado no hay parámetros', () => {
    expect(encodeUrlState({})).toBe('');
  });
});

describe('fecha corta', () => {
  it('«25 mar 3019» y días especiales completos', () => {
    expect(formatDateShort({ year: 3019, month: 3, day: 25 })).toBe('25 mar 3019');
    expect(formatDateShort({ year: 3019, special: 'midyear' })).toMatch(/Medio Año/);
  });
});
