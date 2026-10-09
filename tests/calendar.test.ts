import { describe, expect, it } from 'vitest';
import {
  dayOfYear,
  formatDate,
  fromDayIndex,
  isLeapYear,
  toDayIndex,
  yearLength,
  yearStartIndex,
  type ShireDate,
} from '../src/lib/calendar.ts';

describe('calendario de la Comarca', () => {
  it('epoch: 2 Yule de 3001 es el día 0', () => {
    expect(toDayIndex({ year: 3001, special: 'yule2' })).toBe(0);
    expect(toDayIndex({ year: 3001, month: 1, day: 1 })).toBe(1);
  });

  it('regla bisiesta: C.C. múltiplo de 4 y no de 100', () => {
    expect(isLeapYear(3020)).toBe(true); // C.C. 1420
    expect(isLeapYear(3019)).toBe(false);
    expect(isLeapYear(3000)).toBe(false); // C.C. 1400, fin de siglo
    expect(yearLength(3020)).toBe(366);
    expect(yearLength(3018)).toBe(365);
  });

  it('existe el 30 de febrero y va justo antes del 1 de marzo', () => {
    const feb30 = toDayIndex({ year: 3019, month: 2, day: 30 });
    expect(toDayIndex({ year: 3019, month: 3, day: 1 })).toBe(feb30 + 1);
    expect(dayOfYear({ year: 3019, month: 2, day: 30 })).toBe(61);
  });

  it('días especiales de verano en orden', () => {
    const y = 3019;
    const seq: ShireDate[] = [
      { year: y, month: 6, day: 30 },
      { year: y, special: 'lithe1' },
      { year: y, special: 'midyear' },
      { year: y, special: 'lithe2' },
      { year: y, month: 7, day: 1 },
    ];
    const idx = seq.map(toDayIndex);
    expect(idx).toEqual(idx.map((_, i) => idx[0]! + i));
  });

  it('Sobrelithe solo en bisiesto', () => {
    expect(() => toDayIndex({ year: 3019, special: 'overlithe' })).toThrow();
    const mid = toDayIndex({ year: 3020, special: 'midyear' });
    expect(toDayIndex({ year: 3020, special: 'overlithe' })).toBe(mid + 1);
    expect(toDayIndex({ year: 3020, special: 'lithe2' })).toBe(mid + 2);
  });

  it('cruce de año: 30 dic → 1 Yule → 2 Yule del siguiente → 1 ene', () => {
    const d30 = toDayIndex({ year: 3018, month: 12, day: 30 });
    expect(toDayIndex({ year: 3018, special: 'yule1' })).toBe(d30 + 1);
    expect(toDayIndex({ year: 3019, special: 'yule2' })).toBe(d30 + 2);
    expect(toDayIndex({ year: 3019, month: 1, day: 1 })).toBe(d30 + 3);
  });

  it('años consecutivos suman su longitud (también antes del epoch)', () => {
    for (let y = 2940; y < 3030; y++) {
      expect(yearStartIndex(y + 1) - yearStartIndex(y)).toBe(yearLength(y));
    }
  });

  it('ida y vuelta índice ↔ fecha en todo el rango', () => {
    const start = yearStartIndex(2990);
    const end = yearStartIndex(3025);
    for (let i = start; i < end; i++) expect(toDayIndex(fromDayIndex(i))).toBe(i);
  });

  it('fechas clave del Apéndice B quedan en el orden correcto', () => {
    const party = toDayIndex({ year: 3001, month: 9, day: 22 });
    const leaveBagEnd = toDayIndex({ year: 3018, month: 9, day: 23 });
    const amonHen = toDayIndex({ year: 3019, month: 2, day: 26 });
    const ringDestroyed = toDayIndex({ year: 3019, month: 3, day: 25 });
    const havens = toDayIndex({ year: 3021, month: 9, day: 29 });
    expect(party).toBeLessThan(leaveBagEnd);
    expect(leaveBagEnd).toBeLessThan(amonHen);
    expect(ringDestroyed - amonHen).toBe(29); // 26-feb → 30-feb → 25-mar
    expect(ringDestroyed).toBeLessThan(havens);
  });

  it('rechaza días y meses imposibles', () => {
    expect(() => toDayIndex({ year: 3019, month: 2, day: 31 })).toThrow();
    expect(() => toDayIndex({ year: 3019, month: 13, day: 1 })).toThrow();
  });

  it('formatea en español', () => {
    expect(formatDate({ year: 3019, month: 3, day: 25 })).toBe('25 de marzo de 3019');
    expect(formatDate({ year: 3018, month: 9, precision: 'month' })).toBe('septiembre de 3018');
    expect(formatDate({ year: 3019, special: 'midyear' })).toBe('Día del Medio Año de 3019');
    expect(formatDate({ year: 3001, precision: 'year' })).toBe('3001');
  });
});
