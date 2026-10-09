# Decisiones técnicas (ADR corto)

Formato: contexto → decisión → consecuencias. Las nuevas al final.

## 001 · Stack base — 2026-10-09

- **Contexto**: web estática, mapa no geográfico, datos en JSON, móvil.
- **Decisión**: Vite + TypeScript estricto sin framework; Leaflet 1.9 con `CRS.Simple`; D3 entra
  en H3 para el timeline; Preact solo si el estado de la UI lo pide (se decide en H3/H5).
- **Consecuencias**: bundle pequeño (~44 kB gz en H0); el estado se gestiona a mano hasta que duela.

## 002 · Dependencias de H0 — 2026-10-09

| Paquete                         | Por qué                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leaflet`                       | Pan/zoom táctil maduro, `CRS.Simple` para coordenadas propias, capas vectoriales SVG.                                                                      |
| `vite`                          | Dev server y build; plugin single-file para previews.                                                                                                      |
| `vite-plugin-singlefile`        | Un único `index.html` autocontenido para publicar cada hito como artifact. Avisos de `npm audit` (braces/micromatch) solo afectan al build, no al runtime. |
| `typescript`                    | Tipado estricto; v7 (compilador nativo).                                                                                                                   |
| `vitest`                        | Tests rápidos integrados con Vite.                                                                                                                         |
| `ajv`                           | Validación de los JSON contra JSON Schema (draft-07).                                                                                                      |
| `prettier`                      | Formato uniforme; CI lo comprueba.                                                                                                                         |
| `@types/leaflet`, `@types/node` | Tipos.                                                                                                                                                     |

- **Descartados**: `tsx` (Node ≥ 22.18 ejecuta `.ts` con type-stripping nativo); ESLint (por ahora
  basta TS estricto + Prettier; se reconsidera si aparecen problemas que detectaría).

## 003 · Calendario y fechas — 2026-10-09

- **Decisión**: fechas en Cómputo de la Comarca tal como las da el Apéndice B (meses de 30 días +
  días especiales). Índice continuo con día 0 = 2 Yule T.E. 3001. Bisiesto: C.C. (= T.E. − 1600)
  múltiplo de 4 y no de 100. Fechas imprecisas se ordenan por su primer día.
- **Consecuencias**: ordenar e interpolar es aritmética entera; nunca se convierte a gregoriano.

## 004 · Coordenadas propias en millas — 2026-10-09

- **Decisión**: `[x, y]` en millas, x este, y norte, origen SO, extensión ≈ 2000 × 1500.
- **Consecuencias**: distancias y velocidades salen directamente (idea de IDEAS.md). Leaflet
  necesita `[y, x]`: siempre a través de `src/lib/coords.ts`.

## 005 · `routes.json` y semántica de tramos — 2026-10-09

- **Decisión**: geometrías de camino compartidas en `routes.json`; los tramos las referencian por
  `routeId` (o llevan `via` propio). Tramos inclusivos y contiguos; estancias con `from == to`;
  los lugares de evento deben ser extremos de tramo.
- **Consecuencias**: «quién va con quién» = mismo `routeId` + fechas solapadas, sin comparar
  geometrías; el validador puede comprobar posición exacta en cada evento.

## 006 · Referencias por libro interno — 2026-10-09

- **Decisión**: `ref.book` 1–6 (libros internos) + `chapter`, o `ref.appendix`. El volumen
  (Comunidad / Dos Torres / Retorno) se deriva (`volumeOfBook`).
- **Consecuencias**: el filtro «por libro» puede ofrecer volúmenes o libros sin duplicar datos.

## 007 · Toponimia en español — 2026-10-09

- **Decisión** (del usuario): nombres de la traducción de Minotauro como `name`; originales en
  `altNames` para la búsqueda. UI en español.

## 008 · GitHub Pages condicionado — 2026-10-09

- **Contexto**: repo privado en cuenta personal; Pages desde privado requiere GitHub Pro.
- **Decisión** (del usuario): `pages.yml` preparado pero solo corre con la variable de repo
  `PAGES_ENABLED=true`, que se activará al hacer público el repo. Mientras tanto, cada hito se
  previsualiza como artifact single-file.
