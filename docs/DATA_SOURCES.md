# Fuentes de datos

## Canon

- **Fechas**: Apéndice B (_La Cuenta de los Años_), Tercera Edad, Cómputo de la Comarca. El
  Apéndice B usa nombres de meses modernos como equivalentes de los de la Comarca, con 30 días
  cada uno (de ahí el «30 de febrero»). Ver `src/lib/calendar.ts`.
- **Calendario**: Apéndice D (estructura del año, días especiales, regla de bisiestos).
- **Quién estuvo dónde**: texto de los seis libros + Apéndice B. Referencia por evento en `ref`
  (`book` 1–6 y `chapter`, o `appendix`).
- **Toponimia**: traducción española de Minotauro; nombres originales en `altNames`.

## Geografía

- Dibujada a mano como datos vectoriales propios en un sistema de coordenadas propio (millas).
- Las posiciones se deducen de relaciones y distancias descritas en el texto (p.ej. la anchura de
  la Comarca, jornadas entre lugares), no de calcar ni muestrear mapas publicados. Las formas son
  simplificadas y estilizadas: **toda la geografía es aproximada**.
- Anclas de escala usadas (aprox.): la Comarca mide unas 120 millas de oeste a este y 150 de norte a
  sur; de Hobbiton al Puente del Brandivino hay unas 40 millas; de Edoras a Minas Tirith, unas 300
  por el camino; de Minas Tirith a Osgiliath, unas 12. Las posiciones relativas (qué está al norte
  o al este de qué, qué río desemboca dónde) salen de las descripciones del texto.
- Puntos de control en `data/geo/*.geojson`; el aspecto «a mano» (rugosidad, suavizado, glifos de
  relieve) se genera al cargar y no forma parte de los datos.

## Toponimia por confirmar

Nombres en español que he puesto de memoria y conviene cotejar con la edición de Minotauro. Si
alguno es incorrecto, se corrige en `data/places.json` o `data/geo/*.geojson` (el nombre original
está siempre en `altNames`).

- **Comarca**: Alforzaburgo (Tuckborough), Ranales (Frogmorton), Cepeda (Stock), Casa del Bosque
  (Woodhall), Surcos Blancos (Whitfurrows), Puerta del Seto (Hay Gate), Granja de Maggot, Bosque
  Cerrado (Woody End).
- **Eriador**: Bosque de los Trolls (Trollshaws), Norburgo de los Reyes (Fornost), Fontegrís
  (Mitheithel), Aguada Gris (Gwathló), Sonorona (Bruinen), Paso del Cuerno Rojo.
- **Rhovanion**: Gladio / Campos Gladios (Gladden), Río Rápido (Celduin), Agua Roja (Carnen),
  Estancias de Thranduil.
- **Rohan**: Limclaro (Limlight), Nevado (Snowbourn), Emnet Este, La Ondulada (Wold), Folde
  Oeste/Este, Lindero de Fangorn, Valle de los Ents (Derndingle), Tierra Brunia (Dunland).
  _Wellinghall_ se deja en inglés hasta confirmar su traducción.
- **Gondor y Mordor**: Puerta Oscura (Dark Door), Montañas de la Sombra, Montañas de Ceniza,
  _Isenmouthe_ (en original hasta confirmar), Raíz Negra (Morthond).

## Inferencias

Cada tramo o fecha marcado `confidence: "inferred"` se lista aquí con su razonamiento.

| Dato | Inferencia | Motivo                                           |
| ---- | ---------- | ------------------------------------------------ |
| —    | —          | (sin datos de personajes todavía; empieza en H2) |
