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

## Inferencias

Cada tramo o fecha marcado `confidence: "inferred"` se lista aquí con su razonamiento.

| Dato | Inferencia | Motivo                                           |
| ---- | ---------- | ------------------------------------------------ |
| —    | —          | (sin datos de personajes todavía; empieza en H2) |
