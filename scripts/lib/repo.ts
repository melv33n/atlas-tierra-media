/** Carga de datos y validación con JSON Schema desde disco (Node). */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv, { type ErrorObject } from 'ajv';
import type { DataBundle } from '../../src/data/types.ts';
import type { Issue } from '../../src/data/validate.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DATA_FILES = ['places', 'characters', 'events', 'journeys', 'routes'] as const;
export type DataFile = (typeof DATA_FILES)[number];

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function createAjv(root = ROOT): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    strictRequired: false,
    allowUnionTypes: true,
  });
  const dir = join(root, 'schemas');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.schema.json'))) {
    ajv.addSchema(readJson(join(dir, f)) as object);
  }
  return ajv;
}

const SCHEMA_BASE = 'https://atlas-tierra-media.local/schemas/';

function formatErrors(file: string, errors: ErrorObject[] | null | undefined): Issue[] {
  return (errors ?? []).map((e) => ({
    level: 'error' as const,
    code: 'schema',
    message: `${file}${e.instancePath || '/'} ${e.message ?? ''}${
      e.params && 'allowedValues' in e.params
        ? ` (${(e.params.allowedValues as unknown[]).join(', ')})`
        : ''
    }${e.params && 'additionalProperty' in e.params ? ` «${String(e.params.additionalProperty)}»` : ''}`,
  }));
}

export function checkSchema(ajv: Ajv, schema: string, file: string, value: unknown): Issue[] {
  const validate = ajv.getSchema(`${SCHEMA_BASE}${schema}.schema.json`);
  if (!validate) throw new Error(`Schema no encontrado: ${schema}`);
  return validate(value) ? [] : formatErrors(file, validate.errors);
}

export interface LoadedRepo {
  bundle: DataBundle;
  geo: Record<string, unknown>;
  schemaIssues: Issue[];
}

/** Lee `data/` y valida cada fichero contra su schema. */
export function loadRepo(root = ROOT): LoadedRepo {
  const ajv = createAjv(root);
  const schemaIssues: Issue[] = [];
  const raw = {} as Record<DataFile, unknown>;
  for (const name of DATA_FILES) {
    const path = join(root, 'data', `${name}.json`);
    raw[name] = existsSync(path) ? readJson(path) : [];
    schemaIssues.push(...checkSchema(ajv, name, `data/${name}.json`, raw[name]));
  }

  const geo: Record<string, unknown> = {};
  const geoIds: string[] = [];
  const geoDir = join(root, 'data', 'geo');
  if (existsSync(geoDir)) {
    for (const f of readdirSync(geoDir)
      .filter((f) => f.endsWith('.geojson'))
      .sort()) {
      const value = readJson<{ features?: { properties?: { id?: string } }[] }>(join(geoDir, f));
      geo[f.replace(/\.geojson$/, '')] = value;
      schemaIssues.push(...checkSchema(ajv, 'geo', `data/geo/${f}`, value));
      for (const feat of value.features ?? [])
        if (feat.properties?.id) geoIds.push(feat.properties.id);
    }
  }
  const dupGeo = geoIds.filter((id, i) => geoIds.indexOf(id) !== i);
  for (const id of new Set(dupGeo))
    schemaIssues.push({
      level: 'error',
      code: 'duplicate-id',
      message: `geo: id duplicado «${id}»`,
    });

  const bundle = {
    ...(raw as unknown as Omit<DataBundle, 'geoIds'>),
    geoIds,
  } as DataBundle;
  return { bundle, geo, schemaIssues };
}
