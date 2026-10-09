/**
 * Cómputo de la Comarca (Shire Reckoning) tal como lo usa el Apéndice B.
 *
 * El Apéndice B nombra los meses de la Comarca con sus equivalentes modernos
 * («enero» = Afteryule, «marzo» = Rethe…), pero cada mes tiene 30 días: por eso
 * existe el «30 de febrero». Además hay días que no pertenecen a ningún mes:
 *
 *   2 Yule · enero…junio · 1 Lithe · Medio Año · (Sobrelithe) · 2 Lithe · julio…diciembre · 1 Yule
 *
 * Año común: 365 días. Año bisiesto: 366 (se añade Sobrelithe tras el Medio Año).
 * Años: Tercera Edad (T.E.). C.C. = T.E. − 1600; bisiesto si C.C. es múltiplo de 4
 * y no de 100 (Apéndice D).
 */

export type SpecialDay = 'yule2' | 'lithe1' | 'midyear' | 'overlithe' | 'lithe2' | 'yule1';
export type Precision = 'day' | 'month' | 'season' | 'year' | 'approx';

export interface ShireDate {
  /** Año de la Tercera Edad. */
  year: number;
  /** 1–12 (equivalente moderno del mes de la Comarca). Ausente si `special`. */
  month?: number;
  /** 1–30. */
  day?: number;
  special?: SpecialDay;
  /** Por defecto `day`. */
  precision?: Precision;
}

/** Primer día del índice continuo: 2 Yule de T.E. 3001 (año de la fiesta de Bilbo). */
export const EPOCH_YEAR = 3001;
const SHIRE_OFFSET = 1600;

export function isLeapYear(taYear: number): boolean {
  const sr = taYear - SHIRE_OFFSET;
  return sr % 4 === 0 && sr % 100 !== 0;
}

export function yearLength(taYear: number): number {
  return isLeapYear(taYear) ? 366 : 365;
}

/** Número de bisiestos en [1, sr] según la regla del Cómputo. */
function leapsUpTo(sr: number): number {
  return Math.floor(sr / 4) - Math.floor(sr / 100);
}

/** Días desde el epoch hasta el 2 Yule del año dado (negativo si es anterior a 3001). */
export function yearStartIndex(taYear: number): number {
  const a = EPOCH_YEAR - SHIRE_OFFSET - 1;
  const b = taYear - SHIRE_OFFSET - 1;
  return (taYear - EPOCH_YEAR) * 365 + (leapsUpTo(b) - leapsUpTo(a));
}

/** Día del año, 1-based (2 Yule = 1). */
export function dayOfYear(date: ShireDate): number {
  const leap = isLeapYear(date.year) ? 1 : 0;
  if (date.special) {
    switch (date.special) {
      case 'yule2':
        return 1;
      case 'lithe1':
        return 182;
      case 'midyear':
        return 183;
      case 'overlithe':
        if (!leap) throw new RangeError(`T.E. ${date.year} no es bisiesto: no hay Sobrelithe`);
        return 184;
      case 'lithe2':
        return 184 + leap;
      case 'yule1':
        return 365 + leap;
    }
  }
  const month = date.month ?? 1;
  const day = date.day ?? 1;
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new RangeError(`Mes fuera de rango: ${month}`);
  if (!Number.isInteger(day) || day < 1 || day > 30)
    throw new RangeError(`Día fuera de rango: ${day}`);
  if (month <= 6) return 1 + (month - 1) * 30 + day;
  return 184 + leap + (month - 7) * 30 + day;
}

/**
 * Índice de día continuo (0 = 2 Yule T.E. 3001). Para fechas imprecisas se toma
 * el primer día del periodo (mes → día 1; año → 2 Yule).
 */
export function toDayIndex(date: ShireDate): number {
  return yearStartIndex(date.year) + dayOfYear(date) - 1;
}

export function fromDayIndex(index: number): ShireDate {
  // Estimación y ajuste: el rango útil es pequeño, el bucle da como mucho un par de vueltas.
  let year = EPOCH_YEAR + Math.floor(index / 365.24);
  while (yearStartIndex(year) > index) year--;
  while (yearStartIndex(year + 1) <= index) year++;
  const doy = index - yearStartIndex(year) + 1;
  const leap = isLeapYear(year) ? 1 : 0;

  if (doy === 1) return { year, special: 'yule2' };
  if (doy <= 181) {
    const m0 = Math.floor((doy - 2) / 30);
    return { year, month: m0 + 1, day: doy - 1 - m0 * 30 };
  }
  if (doy === 182) return { year, special: 'lithe1' };
  if (doy === 183) return { year, special: 'midyear' };
  if (leap && doy === 184) return { year, special: 'overlithe' };
  if (doy === 184 + leap) return { year, special: 'lithe2' };
  if (doy === 365 + leap) return { year, special: 'yule1' };
  const rest = doy - (184 + leap) - 1;
  const m0 = Math.floor(rest / 30);
  return { year, month: m0 + 7, day: rest - m0 * 30 + 1 };
}

export const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const SPECIAL_ES: Record<SpecialDay, string> = {
  yule2: '2 Yule',
  lithe1: '1 Lithe',
  midyear: 'Día del Medio Año',
  overlithe: 'Sobrelithe',
  lithe2: '2 Lithe',
  yule1: '1 Yule',
};

/** «25 de marzo de 3019», «septiembre de 3018», «Día del Medio Año de 3019». */
export function formatDate(date: ShireDate): string {
  const precision = date.precision ?? 'day';
  const approx = precision === 'approx' ? 'h. ' : '';
  if (date.special) return `${approx}${SPECIAL_ES[date.special]} de ${date.year}`;
  if (precision === 'year' || date.month === undefined) return `${approx}${date.year}`;
  const month = MONTHS_ES[date.month - 1];
  if (precision === 'month' || precision === 'season' || date.day === undefined)
    return `${approx}${month} de ${date.year}`;
  return `${approx}${date.day} de ${month} de ${date.year}`;
}

export function compareDates(a: ShireDate, b: ShireDate): number {
  return toDayIndex(a) - toDayIndex(b);
}
