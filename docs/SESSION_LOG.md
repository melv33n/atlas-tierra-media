# Registro de sesiones

## 2026-10-09 · Sesión 1

- H0: esqueleto completo (Vite+TS, Leaflet `CRS.Simple`, schemas, calendario de la Comarca, validador con tests, CI, Pages condicionado, docs de memoria). PR `h0-esqueleto`.
- Decisiones del usuario: Pages desactivado hasta que el repo sea público; toponimia Minotauro.
- Siguiente: H1 (mapa base) en `h1-mapa-base`.

## 2026-10-09 · Sesión 1 (cont.)

- H0 mergeado (#1). Repo ya público; Pages verificado con un despliegue manual (`PAGES_ENABLED` ok).
- H1: geografía propia completa (costa, 8 lagos, 34 elementos de relieve, 29 ríos, 15 bosques/marismas, 8 caminos, 36 regiones + frontera de la Comarca) y 107 lugares; render con estilo propio, modo oscuro, etiquetas con anticolisión y `?debug`.
- Pendiente: cotejar la «toponimia por confirmar» (`DATA_SOURCES.md`); al zoom máximo las cordilleras se ven estrechas.
- Siguiente: H2 (personajes, eventos y rutas hasta Amon Hen).

## 2026-10-09 · Sesión 1 (H2)

- H1 mergeado (#2) y desplegado en Pages.
- H2: 34 personajes, 61 eventos y las rutas de los 10 principales hasta el 26-feb-3019 (Gandalf hasta su llegada a Lórien el 17-feb), sobre 54 trazados compartidos. Rutas en carriles paralelos, leyenda con interruptores y eventos en la ficha de cada lugar.
- Validador: notas obligatorias en tramos inferidos, tabla de inferencias generada, ubicuidad de secundarios por distancia. Corrección de escala en Tierra de Bree.
- Siguiente: H3 (timeline de swimlanes, scrubber y sincronización mapa ↔ timeline).

## 2026-10-09 · Sesión 1 (H3)

- H2 mergeado (#3).
- H3: línea temporal de calles con D3 (paradas/viajes por zona, encuentros automáticos, eventos), cursor de fecha sincronizado con fichas de personaje interpoladas en el mapa, rango que filtra, panel de evento con navegación.
- Datos: Gollum sigue en Moria hasta el 15-ene (antes aparecía adelantando a la Compañía).
- Siguiente: estilo temático del mapa (IDEAS) o H4 (la ruptura hasta los Puertos Grises), a elección del usuario.

## 2026-10-09 · Sesión 1 (H4)

- H3 mergeado (#4).
- H4: rutas completas tras Amon Hen hasta los Puertos Grises (3021) y el regreso de Sam; 152 eventos; 7 lugares nuevos.
- Modelo: `afterGap` (paradero desconocido) y `mode` (medio de viaje) con límites de velocidad; regla de encuentros revisada (sin falsos «encuentros» al cruzarse).
- Siguiente: según el usuario, controles y rediseño temático (H5).
