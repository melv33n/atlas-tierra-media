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
- La zona entre Los Gamos y la Cima de los Vientos se desplazó hacia el oeste en H2 para que las
  jornadas a pie sean plausibles (ADR 016).
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

Criterio de `confidence`:

- **`canon`**: las dos fechas del tramo salen del Apéndice B o la narración las fija sin ambigüedad
  (p.ej. «a la mañana siguiente» de un día conocido).
- **`inferred`**: al menos una fecha o el trazado es una estimación mía. Todo tramo inferido lleva una
  `note` con el motivo (`npm run validate` lo exige) y se dibuja con trazo discontinuo.
- Los **trazados** (`data/routes.json`) son siempre aproximados: siguen caminos y ríos cuando el
  texto lo dice y, si no, el camino plausible más corto.
- Lugares de evento con nombre descriptivo propio (no canónico): _Faldas del Caradhras_ (la colina
  del ataque de los lobos). La reunión de Gandalf con Radagast se sitúa en el Vado Sarn por ser la
  frontera sur de la Comarca (etiqueta `lugar-aproximado`).

Tabla generada a partir de las notas de los tramos inferidos:

<!-- inferencias:inicio (generado por npm run docs:inferences) -->

| Quién                                                                | Tramo                                      | Fechas                                              | Motivo                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Frodo                                                                | Estancia en Bolsón Cerrado                 | 22 de septiembre de 3001 – 23 de septiembre de 3018 | Frodo vive en Bolsón Cerrado desde la marcha de Bilbo; sus salidas por la Comarca no se registran.                                       |
| Frodo, Sam, Merry, Pippin, Aragorn                                   | Bree → Pantanos de Moscagua                | 30 de septiembre de 3018 – 2 de octubre de 3018     | Salida de Bree el 30 de septiembre (Apéndice B); el día de entrada en los pantanos es estimado.                                          |
| Frodo, Sam, Merry, Pippin, Aragorn                                   | Pantanos de Moscagua → Cima de los Vientos | 2 de octubre de 3018 – 6 de octubre de 3018         | El ataque en la Cima es la noche del 6 de octubre (Apéndice B); la llegada ese mismo día es estimada.                                    |
| Frodo, Sam, Merry, Pippin, Aragorn                                   | Estancia en Cima de los Vientos            | 6 de octubre de 3018 – 7 de octubre de 3018         | Salida a la mañana siguiente del ataque (estimado).                                                                                      |
| Frodo, Sam, Merry, Pippin, Aragorn                                   | Cima de los Vientos → Último Puente        | 7 de octubre de 3018 – 13 de octubre de 3018        | Cruce del Último Puente el 13 de octubre (Apéndice B); salida de la Cima estimada.                                                       |
| Frodo, Sam, Merry, Pippin, Aragorn                                   | Último Puente → Trolls de piedra           | 13 de octubre de 3018 – 18 de octubre de 3018       | El encuentro con Glorfindel es el 18 al anochecer (Apéndice B); que los trolls se encuentren ese mismo día es deducción de la narración. |
| Frodo, Sam, Merry, Pippin, Aragorn, Legolas, Gimli, Gandalf, Boromir | Estancia en Acebeda                        | 8 de enero de 3019 – 9 de enero de 3019             | Descanso en Acebeda; la salida el día 9 es estimada.                                                                                     |
| Frodo, Sam, Merry, Pippin, Aragorn, Legolas, Gimli, Gandalf, Boromir | Acebeda → Paso del Cuerno Rojo             | 9 de enero de 3019 – 11 de enero de 3019            | La nevada en el Caradhras es el 11–12 de enero (Apéndice B); el día de salida de Acebeda es estimado.                                    |
| Merry                                                                | Estancia en Cricava                        | 23 de septiembre de 3018 – 25 de septiembre de 3018 | Merry se adelanta a Cricava para preparar la casa; el día exacto de llegada no consta.                                                   |
| Aragorn                                                              | Estancia en Rivendel                       | 20 de octubre de 3018 – 25 de diciembre de 3018     | Aragorn pasa estos meses en Rivendel o en sus cercanías: tras el Concilio salen exploradores y no consta cuánto se ausenta.              |
| Legolas                                                              | Estancias de Thranduil → Rivendel          | 1 de octubre de 3018 – 24 de octubre de 3018        | Llega como mensajero de Thranduil antes del Concilio (25 de octubre); salida y ruta estimadas.                                           |
| Legolas, Gimli                                                       | Estancia en Rivendel                       | 24 de octubre de 3018 – 25 de diciembre de 3018     | Llegada a Rivendel estimada (antes del Concilio).                                                                                        |
| Gimli                                                                | Erebor → Rivendel                          | 25 de septiembre de 3018 – 24 de octubre de 3018    | Viaja con su padre Glóin desde Erebor para el Concilio; fechas y ruta estimadas.                                                         |
| Gandalf                                                              | Estancia en Bolsón Cerrado                 | 12 de abril de 3018 – 28 de junio de 3018           | Llega el 12 de abril (Apéndice B) y se queda en la Comarca unos dos meses; la salida es estimada.                                        |
| Gandalf                                                              | Bolsón Cerrado → Vado Sarn                 | 28 de junio de 3018 – Día del Medio Año de 3018     | Se encuentra con Radagast en Medio Año en la frontera sur de la Comarca; el lugar exacto no consta.                                      |
| Gandalf                                                              | Vado Sarn → Bree                           | Día del Medio Año de 3018 – 1 de julio de 3018      | Pasa por Bree y deja una carta para Frodo; día estimado.                                                                                 |
| Gandalf                                                              | Bree → Isengard                            | 1 de julio de 3018 – 10 de julio de 3018            | Llega a Orthanc el 10 de julio (Apéndice B); la salida de Bree es estimada.                                                              |
| Gandalf                                                              | Estancia en Cima de los Vientos            | 3 de octubre de 3018 – 4 de octubre de 3018         | Resiste el ataque nocturno y sale al amanecer (estimado).                                                                                |
| Gandalf                                                              | Cima de los Vientos → Rivendel             | 4 de octubre de 3018 – 18 de octubre de 3018        | Llega a Rivendel el 18 de octubre (Apéndice B) dando un rodeo por el norte; el trazado es estimado.                                      |
| Boromir                                                              | Minas Tirith → Edoras                      | 4 de julio de 3018 – 16 de julio de 3018            | Sale de Minas Tirith el 4 de julio (Apéndice B); etapas intermedias estimadas.                                                           |
| Boromir                                                              | Edoras → Vados del Isen                    | 16 de julio de 3018 – 20 de julio de 3018           | Etapa estimada.                                                                                                                          |
| Boromir                                                              | Vados del Isen → Tharbad                   | 20 de julio de 3018 – 1 de agosto de 3018           | Etapa estimada; en Tharbad pierde el caballo al cruzar el Aguada Gris.                                                                   |
| Boromir                                                              | Tharbad → Rivendel                         | 1 de agosto de 3018 – 24 de octubre de 3018         | Busca Imladris a pie durante meses; llega el 24 de octubre (Apéndice B). Trazado estimado.                                               |
| Gollum                                                               | Estancias de Thranduil → Moria             | 20 de junio de 3018 – 15 de agosto de 3018          | Escapa de los elfos hacia el 20 de junio y en agosto se le pierde el rastro; se cree que se refugió en Moria. Ruta y fechas estimadas.   |
| Gollum                                                               | Estancia en Moria                          | 15 de agosto de 3018 – 13 de enero de 3019          | Atrapado en Moria sin dar con la salida del oeste.                                                                                       |
| Gollum                                                               | Moria → Nimrodel                           | 13 de enero de 3019 – 15 de enero de 3019           | Sigue a la Compañía por Moria desde el 13 de enero (Apéndice B) hasta las lindes de Lórien.                                              |
| Gollum                                                               | Estancia en Nimrodel                       | 15 de enero de 3019 – 16 de febrero de 3019         | Merodea por los bordes de Lórien sin poder entrar.                                                                                       |
| Gollum                                                               | Nimrodel → Egladil                         | 16 de febrero de 3019 – 16 de febrero de 3019       | Observa la partida desde la orilla oeste (Apéndice B); punto exacto estimado.                                                            |
| Gollum                                                               | Egladil → Sarn Gebir                       | 16 de febrero de 3019 – 23 de febrero de 3019       | Sigue las barcas río abajo agarrado a un tronco.                                                                                         |
| Gollum                                                               | Sarn Gebir → Emyn Muil                     | 23 de febrero de 3019 – 26 de febrero de 3019       | Rodea las cataratas y sigue a Frodo hacia las Emyn Muil.                                                                                 |

<!-- inferencias:fin -->
