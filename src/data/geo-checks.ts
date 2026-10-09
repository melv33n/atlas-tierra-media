/** Comprobaciones de la geografía (se amplían en H1). */
import type { DataBundle } from './types.ts';
import type { Issue } from './validate.ts';

export function checkGeo(_bundle: DataBundle, _geo: Record<string, unknown>): Issue[] {
  return [];
}
