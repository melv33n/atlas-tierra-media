# CLAUDE.md — Atlas de la Tierra Media

Web interactiva (proyecto fan, sin ánimo de lucro, repo privado) que muestra sobre un mapa
propio de la Tierra Media las rutas de los personajes de _El Señor de los Anillos_, sincronizadas
con una línea temporal de swimlanes. **Fuente canónica: los libros** (Apéndice B), no las películas.

**Al empezar cada sesión**: lee este fichero, `docs/ROADMAP.md` y la última entrada de
`docs/SESSION_LOG.md`. **Al terminar**: añade 3–5 líneas a `SESSION_LOG.md` y actualiza el ROADMAP.

## Comandos

| Comando                          | Qué hace                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`                    | Servidor de desarrollo (Vite). `?debug` activa la herramienta de autoría de coordenadas.     |
| `npm run typecheck`              | `tsc --noEmit` (TS estricto).                                                                |
| `npm test`                       | Vitest (`tests/**/*.test.ts`).                                                               |
| `npm run validate`               | Schemas + integridad + cronología + eventos/rutas + geografía + cobertura.                   |
| `npm run docs:inferences`        | Regenera la tabla de inferencias de `docs/DATA_SOURCES.md` (validate exige que esté al día). |
| `npm run build` / `build:single` | `dist/` para Pages / `dist-single/index.html` autocontenido para previews.                   |
| `npm run format`                 | Prettier. CI ejecuta `format:check`.                                                         |
| `npm run check`                  | Todo lo anterior en orden (lo que corre CI).                                                 |

Node ≥ 22.18: los scripts `.ts` se ejecutan con el type-stripping nativo de Node (sin `tsx`).
Por eso: imports relativos **con extensión `.ts`**, y nada de `enum`/`namespace`/parameter
properties (`erasableSyntaxOnly`).

## Estructura

- `data/` — fuente de verdad. `places.json`, `characters.json`, `events.json`, `journeys.json`,
  `routes.json`, `geo/*.geojson`. Formato en `schemas/*.schema.json`.
- `src/lib/calendar.ts` — Cómputo de la Comarca ↔ índice de día continuo (0 = 2 Yule T.E. 3001).
- `src/lib/coords.ts` — coordenadas propias `[x, y]` en **millas** (x este, y norte, origen SO);
  Leaflet `CRS.Simple` usa `[lat, lng] = [y, x]`.
- `src/data/validate.ts` — comprobaciones semánticas puras; `scripts/validate.ts` las ejecuta.
- `src/data/legs.ts` — geometría de los tramos, carriles paralelos y desplazamiento de polilíneas.
- `src/data/timeline.ts` — modelo temporal continuo: posición de cada personaje en cualquier
  instante, segmentos para las calles y detección de encuentros. `zones.ts`: 8 zonas de color.
- `src/state/store.ts` — estado compartido (fecha, rango, ocultos, evento abierto).
- `src/timeline/` — línea temporal D3 (calles, eje, cursor, rango). `src/ui/eventCard.ts` — panel
  de evento.
- `src/map/` — Leaflet: `createMap.ts` (montaje y encuadre), `baseLayers.ts` (paneles y capas
  vectoriales), `shapes.ts` (rugosidad + suavizado), `glyphs.ts`/`relief.ts` (relieve por zoom),
  `labels.ts` (etiquetas con anticolisión), `places.ts` + `popup.ts` (marcadores y ficha con eventos),
  `journeyLayer.ts` + `legend.ts` (rutas y leyenda), `markers.ts` (fichas de personaje en el
  instante actual), `debug.ts` (`?debug`; expone `window.atlas` y `window.store`).
- `src/styles/` — tokens de color (claro/oscuro) en `main.css`, estilo cartográfico en `map.css`.
- `docs/` — memoria del proyecto.

## Modelo de datos (resumen)

- Fecha: `{ year, month?, day?, special?, precision? }`. Meses de 30 días (existe el 30 de
  febrero); `special` ∈ yule2, lithe1, midyear, overlithe, lithe2, yule1.
- Tramo `[start, end]` inclusive: el día `start` está en `from`, el día `end` en `to`, entre
  medias «de camino». Estancia = `from == to`. Los tramos de un personaje son contiguos
  (`next.start == prev.end`, `next.from == prev.to`).
- Todo tramo `inferred` lleva `note` con el motivo.
- `mode` (pie/caballo/barca/aguila) fija el límite de millas por jornada que comprueba un test.
- `afterGap: true` = paradero desconocido entre el tramo anterior y este (sin posición en el hueco).
- Los lugares de los eventos deben ser extremos de tramo: si algo pasa a mitad de camino
  (p.ej. Cima de los Vientos), se parte el tramo ahí.
- `routes.json` guarda geometrías compartidas; quien comparte `routeId` en fechas solapadas «va
  junto» y se dibuja en paralelo.
- `confidence: "inferred"` = fecha/trayecto deducido, no explícito. Se dibuja discontinuo y se
  documenta en `docs/DATA_SOURCES.md`.

## Restricciones de contenido (obligatorias)

1. **Cartografía original**: geografía como datos vectoriales propios con estilo propio. No calcar,
   muestrear ni incrustar mapas publicados de los libros; nada de imágenes, fotogramas, logos ni
   tipografías de las películas.
2. **Sin retratos**: personajes = marcadores de color con iniciales o iconos genéricos.
3. **Sin citas de los libros**: resúmenes con palabras propias, 1–2 frases (el schema limita a 320
   caracteres). Fechas, nombres y quién estuvo dónde son datos y sí van.
4. Dato dudoso → `inferred` + nota en `DATA_SOURCES.md`. Nunca inventar con aparente certeza.

## Convenciones

- Toponimia y UI en **español (traducción Minotauro)**; inglés/sindarin en `altNames`.
- Ids en kebab-case ASCII (`minas-tirith`, `cima-de-los-vientos`).
- Commits convencionales (`feat:`, `fix:`, `data:`, `docs:`, `chore:`, `test:`, `ci:`).
- Un hito = rama `h<n>-<slug>` + PR contra `main` con descripción, capturas
  (`docs/screenshots/`) y preview single-file. El usuario mergea.
- Nueva dependencia ⇒ entrada en `docs/DECISIONS.md` justificándola.
- **«idea: …»** del usuario ⇒ añadir a `docs/IDEAS.md` con fecha. **No implementarla** salvo que
  lo pida.
- Antes de cerrar un hito: `npm run check`, capturas a 1440×900 y 390×844 y revisión visual.
