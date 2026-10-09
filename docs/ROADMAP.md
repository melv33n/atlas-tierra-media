# Roadmap

Estado: ✅ hecho · 🚧 en curso · ⏳ pendiente

## H0 — Esqueleto ✅

- [x] Vite + TypeScript estricto, Leaflet `CRS.Simple`, página mínima
- [x] Schemas JSON (fecha, lugares, personajes, eventos, rutas, tramos, geo)
- [x] Calendario de la Comarca ↔ índice de día (con tests)
- [x] `npm run validate`: integridad, cronología, ubicuidad, eventos↔rutas, cobertura (con tests)
- [x] CI (typecheck, formato, tests, validate, build ×2)
- [x] Workflow de Pages preparado (desactivado hasta `PAGES_ENABLED=true`)
- [x] `CLAUDE.md` + docs de memoria
- [x] PR mergeado (#1)

## H1 — Mapa base ⏳

- [ ] Costas, mares interiores y lagos
- [ ] Cordilleras y colinas (crestas + glifos)
- [ ] Ríos con anchura por rango
- [ ] Bosques, caminos, regiones
- [ ] ~110 lugares con `zoomMin` y etiquetas por zoom sin solapes groseros
- [ ] Estilo visual propio, modo oscuro, tipografía OFL autoalojada
- [ ] Herramienta de autoría `?debug`
- [ ] Capturas escritorio/móvil + preview single-file

## H2 — La Compañía hasta Amon Hen ⏳

- [ ] Personajes (principales + secundarios)
- [ ] Eventos Hobbiton → Rivendel → Moria → Lórien → Amon Hen
- [ ] Rutas y tramos, `confidence` documentada

## H3 — Timeline + sincronización + scrubber ⏳

- [ ] Swimlanes D3, convergencias
- [ ] Scrubber de fecha ↔ marcadores interpolados en el mapa
- [ ] Rango de fechas filtra el mapa; panel de evento

## H4 — La ruptura ⏳

- [ ] Todas las líneas tras Amon Hen hasta los Puertos Grises
- [ ] Convergencias (Edoras, Isengard, Minas Tirith, Cormallen…)

## H5 — Pulido ⏳

- [ ] Búsqueda, filtros, «¿dónde estaba cada uno el día X?»
- [ ] Estado en URL, móvil, accesibilidad
- [ ] Build single-file y despliegue público
