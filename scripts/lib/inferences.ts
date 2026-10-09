/** Tabla de inferencias de `docs/DATA_SOURCES.md`, generada a partir de las notas de los tramos. */
import { formatDate } from '../../src/lib/calendar.ts';
import { shortNameOf, type DataBundle } from '../../src/data/types.ts';

export const START = '<!-- inferencias:inicio (generado por npm run docs:inferences) -->';
export const END = '<!-- inferencias:fin -->';

export function renderInferences(data: DataBundle): string {
  const placeName = new Map(data.places.map((p) => [p.id, p.name]));
  const charName = new Map(data.characters.map((c) => [c.id, shortNameOf(c)]));
  // Un mismo tramo compartido por varios personajes se lista una sola vez.
  const rows = new Map<string, { who: string[]; tramo: string; fechas: string; nota: string }>();
  for (const j of data.journeys) {
    for (const leg of j.legs) {
      if (leg.confidence !== 'inferred') continue;
      const tramo =
        leg.from === leg.to
          ? `Estancia en ${placeName.get(leg.from) ?? leg.from}`
          : `${placeName.get(leg.from) ?? leg.from} → ${placeName.get(leg.to) ?? leg.to}`;
      const fechas = `${formatDate(leg.start)} – ${formatDate(leg.end)}`;
      const nota = (leg.note ?? '').replace(/\|/g, '\\|');
      const key = `${tramo}|${fechas}|${nota}`;
      const row = rows.get(key) ?? { who: [], tramo, fechas, nota };
      row.who.push(charName.get(j.characterId) ?? j.characterId);
      rows.set(key, row);
    }
  }
  const lines = ['| Quién | Tramo | Fechas | Motivo |', '| --- | --- | --- | --- |'];
  for (const r of rows.values())
    lines.push(`| ${r.who.join(', ')} | ${r.tramo} | ${r.fechas} | ${r.nota} |`);
  if (rows.size === 0) lines.push('| — | — | — | (sin tramos inferidos) |');
  return `${START}\n\n${lines.join('\n')}\n\n${END}`;
}

/** Compara ignorando el alineado de columnas que añade Prettier. */
export function sameTable(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/ *\| */g, '|')
      .replace(/-{3,}/g, '---')
      .replace(/\n+/g, '\n');
  return norm(a) === norm(b);
}

/** Sustituye el bloque generado dentro del documento. */
export function replaceBlock(doc: string, block: string): string {
  const a = doc.indexOf(START);
  const b = doc.indexOf(END);
  if (a < 0 || b < 0) throw new Error('Faltan los marcadores de inferencias en DATA_SOURCES.md');
  return doc.slice(0, a) + block + doc.slice(b + END.length);
}
