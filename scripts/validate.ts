/**
 * npm run validate — schema + integridad + cronología + coherencia eventos/rutas,
 * y un informe de cobertura. Sale con código 1 si hay errores.
 */
import { loadRepo } from './lib/repo.ts';
import { validateBundle, type Issue } from '../src/data/validate.ts';
import { fromDayIndex, formatDate } from '../src/lib/calendar.ts';
import { checkGeo } from '../src/data/geo-checks.ts';

const { bundle, geo, schemaIssues } = loadRepo();
const issues: Issue[] = [...schemaIssues];

// Si la forma está mal, las comprobaciones semánticas solo generarían ruido.
if (schemaIssues.length === 0) {
  const result = validateBundle(bundle);
  issues.push(...result.issues, ...checkGeo(bundle, geo));

  console.log('\nCobertura por personaje');
  if (result.coverage.byCharacter.length === 0) console.log('  (sin personajes todavía)');
  else
    console.table(
      result.coverage.byCharacter.map((r) => ({
        personaje: r.characterId,
        tramos: r.legs,
        inferidos: r.inferredLegs,
        eventos: r.events,
        desde: r.firstDay === undefined ? '' : formatDate(fromDayIndex(r.firstDay)),
        hasta: r.lastDay === undefined ? '' : formatDate(fromDayIndex(r.lastDay)),
      })),
    );
  console.log('Eventos por libro');
  const books = Object.entries(result.coverage.eventsByBook);
  if (books.length === 0) console.log('  (sin eventos todavía)');
  else console.table(Object.fromEntries(books));
}

console.log(
  `\nDatos: ${bundle.places.length} lugares · ${bundle.characters.length} personajes · ` +
    `${bundle.events.length} eventos · ${bundle.journeys.length} rutas · ${bundle.routes.length} caminos · ` +
    `${Object.keys(geo).length} capas geo`,
);

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const w of warnings) console.warn(`⚠ [${w.code}] ${w.message}`);
for (const e of errors) console.error(`✖ [${e.code}] ${e.message}`);
console.log(`\n${errors.length} errores, ${warnings.length} avisos`);
process.exit(errors.length ? 1 : 0);
