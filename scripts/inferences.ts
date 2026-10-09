/** npm run docs:inferences — regenera la tabla de inferencias de docs/DATA_SOURCES.md. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRepo, ROOT } from './lib/repo.ts';
import { renderInferences, replaceBlock } from './lib/inferences.ts';

const path = join(ROOT, 'docs', 'DATA_SOURCES.md');
const { bundle } = loadRepo();
writeFileSync(path, replaceBlock(readFileSync(path, 'utf8'), renderInferences(bundle)));
console.log('DATA_SOURCES.md actualizado');
