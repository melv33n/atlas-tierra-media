/**
 * Lapso de la acción principal de cada uno de los seis libros, para filtrar el mapa
 * por libro. Fechas del Apéndice B: desde que arranca el hilo del libro hasta que se
 * cierra (los libros III–IV y V–VI se solapan, porque narran hilos paralelos).
 */
import { toDayIndex, type ShireDate } from '../lib/calendar.ts';

export type BookNumber = 1 | 2 | 3 | 4 | 5 | 6;

const d = (year: number, month: number, day: number): ShireDate => ({ year, month, day });

export const BOOKS: { book: BookNumber; label: string; start: ShireDate; end: ShireDate }[] = [
  { book: 1, label: 'I', start: d(3018, 9, 22), end: d(3018, 10, 20) },
  { book: 2, label: 'II', start: d(3018, 10, 20), end: d(3019, 2, 26) },
  { book: 3, label: 'III', start: d(3019, 2, 26), end: d(3019, 3, 5) },
  { book: 4, label: 'IV', start: d(3019, 2, 26), end: d(3019, 3, 13) },
  { book: 5, label: 'V', start: d(3019, 3, 5), end: d(3019, 3, 25) },
  { book: 6, label: 'VI', start: d(3019, 3, 14), end: d(3021, 10, 6) },
];

/** Rango (índices de día) que cubre los libros elegidos, o null si no hay ninguno. */
export function booksRange(books: Iterable<number>): [number, number] | null {
  const chosen = BOOKS.filter((b) => [...books].includes(b.book));
  if (!chosen.length) return null;
  return [
    Math.min(...chosen.map((b) => toDayIndex(b.start))),
    Math.max(...chosen.map((b) => toDayIndex(b.end))) + 1,
  ];
}
