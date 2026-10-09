/** Marcas del eje temporal en Cómputo de la Comarca, según la escala visible. */
import { fromDayIndex, toDayIndex, yearStartIndex } from '../lib/calendar.ts';

export interface Tick {
  t: number;
  label: string;
  /** Marca principal (año o mes): se dibuja más marcada. */
  major: boolean;
}

export const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * @param t0 primer instante visible
 * @param t1 último instante visible
 * @param pxPerDay píxeles por día en pantalla
 */
export function timeTicks(t0: number, t1: number, pxPerDay: number): Tick[] {
  const ticks: Tick[] = [];
  const y0 = fromDayIndex(Math.floor(t0)).year;
  const y1 = fromDayIndex(Math.ceil(t1)).year + 1;

  // Años: cuando un mes no cabe ni en 28 px.
  if (pxPerDay * 30 < 28) {
    const pxPerYear = pxPerDay * 365;
    const step = [1, 2, 5, 10, 20].find((s) => s * pxPerYear >= 48) ?? 50;
    for (let y = y0; y <= y1; y++) {
      if (y % step) continue;
      const t = yearStartIndex(y);
      if (t >= t0 && t <= t1) ticks.push({ t, label: `${y}`, major: true });
    }
    return ticks;
  }

  // Meses: día 1 de cada mes; el año se escribe en enero o en la primera marca.
  if (pxPerDay * 5 < 26) {
    const step = pxPerDay * 30 >= 34 ? 1 : pxPerDay * 60 >= 34 ? 2 : 3;
    let first = true;
    for (let y = y0; y <= y1; y++) {
      for (let m = 1; m <= 12; m++) {
        if ((m - 1) % step) continue;
        const t = toDayIndex({ year: y, month: m, day: 1 });
        if (t < t0 || t > t1) continue;
        const withYear = m === 1 || first;
        ticks.push({
          t,
          label: withYear ? `${MONTHS_SHORT[m - 1]} ${y}` : MONTHS_SHORT[m - 1]!,
          major: m === 1,
        });
        first = false;
      }
    }
    return ticks;
  }

  // Días: cada 1, 2 o 5 días; el mes se escribe el día 1.
  const step = pxPerDay >= 30 ? 1 : pxPerDay >= 14 ? 2 : 5;
  for (let t = Math.ceil(t0); t <= t1; t++) {
    const d = fromDayIndex(t);
    if (d.special) {
      if (pxPerDay >= 30) ticks.push({ t, label: '·', major: false });
      continue;
    }
    if (d.day === 1) {
      const withYear = d.month === 1 || ticks.every((k) => !k.major);
      ticks.push({
        t,
        label: withYear
          ? `1 ${MONTHS_SHORT[d.month! - 1]} ${d.year}`
          : `1 ${MONTHS_SHORT[d.month! - 1]}`,
        major: true,
      });
    } else if ((d.day! - 1) % step === 0 && d.day! <= 30 - step + 1) {
      ticks.push({ t, label: `${d.day}`, major: false });
    }
  }
  return ticks;
}
