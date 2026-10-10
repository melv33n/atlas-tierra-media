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

## H1 — Mapa base ✅

- [x] Costas, mares interiores y lagos
- [x] Cordilleras y colinas (crestas + glifos)
- [x] Ríos con anchura por rango
- [x] Bosques, caminos, regiones
- [x] ~110 lugares con `zoomMin` y etiquetas por zoom sin solapes groseros
- [x] Estilo visual propio, modo oscuro, tipografía OFL autoalojada
- [x] Herramienta de autoría `?debug`
- [x] Capturas escritorio/móvil + preview single-file
- [x] PR mergeado (#2)

## H2 — La Compañía hasta Amon Hen ✅

- [x] Personajes (principales + secundarios)
- [x] Eventos Hobbiton → Rivendel → Moria → Lórien → Amon Hen
- [x] Rutas y tramos, `confidence` documentada
- [x] PR mergeado (#3)

## H3 — Timeline + sincronización + scrubber ✅

- [x] Swimlanes D3, convergencias
- [x] Scrubber de fecha ↔ marcadores interpolados en el mapa
- [x] Rango de fechas filtra el mapa; panel de evento
- [x] PR mergeado (#4)

## H4 — La ruptura ✅

- [x] Todas las líneas tras Amon Hen hasta los Puertos Grises (29-sep-3021) y el regreso de Sam
- [x] 91 eventos nuevos (152 en total): Fangorn, Cuernavilla, Isengard, Sendas de los Muertos,
      Pelennor, Cirith Ungol, Monte del Destino, Cormallen, coronación, limpieza de la Comarca, Puertos
- [x] Encuentros detectados: Gandalf el Blanco, Isengard, la torre, Minas Tirith, Cormallen, Puertos
- [x] Paradero desconocido (`afterGap`) y medio de viaje (`mode`) con límites de velocidad por medio
- [x] PR mergeado (#5)

## H5 — Controles y rediseño 🚧

_Dirección aprobada en el lienzo de diseño: interfaz de juego de fantasía moderno, solo tema
oscuro, móvil primero con su versión de escritorio (ADR 023). Un único PR._

- [ ] Mapa con estilo de juego: relieve sombreado, nieve, bosques en masa, ríos con brillo, tintes
      por región, etiquetas con halo
- [ ] Interfaz móvil: barra de búsqueda, hoja inferior (suceso + calles + reproductor), pestañas
- [ ] Escritorio: paneles flotantes (Compañía, ficha del suceso, línea temporal)
- [ ] Reproductor (play/pausa, ritmos) y cámara que sigue la historia
- [ ] «¿Dónde está cada uno?» agrupado por lugar
- [ ] Búsqueda (lugares, sucesos, personajes) y filtros (libros, fechas, personajes, capas)
- [ ] Estado en la URL y botón de compartir
- [ ] Accesibilidad (teclado, foco, áreas táctiles ≥ 44 px), capturas y preview
