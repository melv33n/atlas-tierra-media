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

## 009 · Cartografía generada a partir de puntos de control — 2026-10-09

- **Contexto**: hace falta una geografía propia, legible y con aspecto de mapa dibujado, sin calcar
  ninguno publicado.
- **Decisión**: los GeoJSON guardan pocos puntos de control (fáciles de editar a mano). Al cargar,
  `src/map/shapes.ts` aplica rugosidad determinista (desplazamiento de punto medio con semilla del
  id) y suavizado de Chaikin. El relieve no se guarda como polígonos: cada cordillera es una cresta
  (`LineString` + `width`) y `src/map/glyphs.ts` genera glifos «^»/«∩» por zoom, espaciados para no
  solaparse, más altos en el eje y más bajos en las faldas.
- **Consecuencias**: mismo dibujo en cada carga; editar una cordillera es mover 5–10 puntos. Al
  zoom máximo las bandas se ven más estrechas que su `width` (se limita a 5 filas para no hacer un
  tapiz).

## 010 · Render en paneles SVG con estilo por CSS — 2026-10-09

- **Decisión**: un panel de Leaflet (con su propio renderer SVG) por capa, en orden fijo de pintado;
  colores y grosores en `src/styles/map.css` vía `className` y tokens CSS (modo claro/oscuro). Bosques
  y marismas usan patrones SVG propios (`src/map/patterns.ts`). Los GeoJSON se importan con `?raw`
  para que también entren en el build single-file.
- **Consecuencias**: cambiar el estilo no toca TypeScript; el modo oscuro sale gratis.

## 011 · Etiquetas: DOM + colisiones voraces — 2026-10-09

- **Decisión**: etiquetas como `divIcon` en un panel propio. Tras cada zoom se ordenan por prioridad
  (zoom mínimo, tipo, rango) y se oculta la que choca; los lugares prueban cuatro posiciones. Las
  regiones son etiquetas puntuales (`kind: region`), no polígonos: solo la Comarca tiene frontera
  dibujada. Si un elemento geográfico y un lugar se llaman igual, rotula el lugar.
- **Consecuencias**: ~250 etiquetas sin librería extra; sin texto curvo a lo largo de los ríos (se
  rotan según la tangente).

## 012 · Tipografía: Alegreya (OFL) autoalojada — 2026-10-09

- **Decisión**: `@fontsource/alegreya` (redonda y cursiva) y `@fontsource/alegreya-sc` (versalitas)
  para el mapa; fuente del sistema para la UI. Solo el subconjunto latino.
- **Consecuencias**: sin peticiones externas (funciona en el single-file y offline); nada de
  tipografías asociadas a las películas.

## 013 · `onWater` en lugares — 2026-10-09

- **Decisión**: `npm run validate` exige que cada lugar caiga en tierra y fuera de lagos, y que cada
  río desemboque en el mar, un lago u otro río. Las excepciones a propósito (Esgaroth, Tol Brandir,
  Cair Andros) llevan `onWater: true`; los puertos pueden quedar hasta 8 millas fuera de la costa.

## 014 · Rutas en carriles paralelos — 2026-10-09

- **Contexto**: hay que ver de un vistazo quién viaja con quién.
- **Decisión**: cada tramo se dibuja como polilínea del color del personaje sobre el trazado de
  `routes.json` (en su sentido canónico). Los tramos con el mismo trazado y fechas solapadas forman
  un grupo y cada personaje ocupa un carril, a 3,4 px del siguiente, en el orden de
  `characters.json` (`src/data/legs.ts`). El desplazamiento se calcula en millas para el zoom actual
  y se rehace en cada zoom. Inferido = discontinuo. Al ocultar personajes, los visibles se reparten
  los carriles.
- **Consecuencias**: la Compañía se ve como una cinta de nueve colores que se abre y se cierra; no
  hace falta ningún plugin de Leaflet. En los cruces entre trazados con distinto número de carriles
  hay pequeños saltos laterales.

## 015 · Reglas nuevas del validador — 2026-10-09

- Todo tramo `inferred` debe llevar `note` (es la fuente de la tabla de inferencias de
  `DATA_SOURCES.md`, que genera `npm run docs:inferences` y `validate` comprueba que esté al día).
- Los eventos fuera del periodo que cubre la ruta de un personaje no se comprueban (Gandalf en la
  fiesta de 3001, antes de que empiece su ruta en 3018).
- Personajes secundarios: «dos sitios el mismo día» solo es error si están a más de 100 millas
  (`MAX_DAY_DISTANCE`), porque dentro de un día se viaja.
- `shortName` opcional en personajes para leyendas y tablas.

## 016 · Corrección de escala en Tierra de Bree — 2026-10-09

- **Contexto**: con las rutas, las jornadas a pie entre Cricava, el Bosque Viejo, los Túmulos y Bree
  salían de 60–100 millas.
- **Decisión**: deformación suave hacia el oeste (máx. 34 millas, con caída gradual) de lugares,
  bosques, colinas, ríos, caminos y trazados de esa zona. La costa no se toca.
- **Consecuencias**: jornadas a pie ≤ ~45 millas. Un test comprueba que ningún tramo a pie o en barca
  supere 70 millas/día (Gandalf a caballo o en águila queda fuera).

## 017 · Modelo temporal continuo — 2026-10-09

- **Contexto**: el cursor de fecha tiene que mover a cada personaje por su ruta, también dentro de
  un día (la Balsadera y Cricava el mismo 25 de septiembre).
- **Decisión**: `t` = índice de día con decimales. Un viaje de varios días sale a las 0,7 del día de
  salida y llega a las 0,3 del de llegada; los viajes del mismo día se encadenan entre 0,3 y 0,7. La
  posición se interpola por longitud de camino (`src/data/timeline.ts`). Un **encuentro** es una
  llegada a un lugar donde hay otro principal del que se estaba separado al salir y el día anterior.
- **Consecuencias**: el mapa y la línea temporal comparten el mismo modelo; los encuentros salen de
  los datos, no se anotan a mano.

## 018 · Sin framework de UI: estado con suscriptores — 2026-10-09

- **Contexto**: H3 introduce estado compartido (fecha, rango, ocultos, evento abierto).
- **Decisión**: un `store` mínimo (`src/state/store.ts`, ~40 líneas) con `get/set/subscribe`. Mapa,
  línea temporal, leyenda y panel de evento se suscriben. Preact no compensa todavía; se reconsidera
  si H5 (búsqueda, filtros, URL) complica la UI.

## 019 · Paleta de zonas validada — 2026-10-09

- **Decisión**: la línea temporal colorea por zona (8 zonas; Rhovanion se funde con el valle del
  Anduin para no pasar de 8 categorías). Colores de la paleta de referencia de la skill de
  visualización, en un orden que pasa todas las comprobaciones de daltonismo y separación en claro
  (sobre `#f3ead8`) y en oscuro (sobre `#2a2620`): Comarca verde, Eriador naranja, Nubladas violeta,
  Lórien amarillo, Anduin azul, Rohan aguamarina, Gondor magenta, Mordor rojo.
- **Consecuencias**: cuatro colores quedan por debajo de 3:1 de contraste en claro; se compensa con
  rótulos directos en las paradas, leyenda de zonas y tooltip. Lo inferido lleva rayado además de
  color.

## 020 · D3 modular — 2026-10-09

| Paquete        | Por qué                                                       |
| -------------- | ------------------------------------------------------------- |
| `d3-scale`     | Escala tiempo → píxeles.                                      |
| `d3-selection` | Data join del SVG de la línea temporal.                       |
| `d3-zoom`      | Zoom y desplazamiento con rueda, arrastre y pellizco (móvil). |
| `d3-brush`     | Selección de rango sobre el eje.                              |

- **Descartado**: el paquete `d3` completo (no hacen falta ejes, formas ni tiempo gregoriano: el
  calendario es propio).
