/**
 * Definiciones SVG compartidas (patrones y degradados). Se insertan una vez en un
 * <svg> oculto y los polígonos de Leaflet las referencian con `fill: url(#…)`.
 * Todo es propio: copas de árbol genéricas, juncos y textura de ruido.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Tintes del terreno por región: id de región → [color, opacidad]. */
export const TINT_COLORS: Record<string, [string, number]> = {
  ash: ['#1e1716', 0.75],
  embers: ['#2a1a16', 0.55],
  steppe: ['#3a3326', 0.4],
  plains: ['#7d8a46', 0.5],
  sand: ['#9a7f4a', 0.5],
  frost: ['#a9b4b6', 0.45],
  stone: ['#4a4a4a', 0.38],
  shire: ['#6f8a42', 0.55],
  meadow: ['#5d7a3e', 0.4],
  dust: ['#7a6a45', 0.32],
};

const gradients = Object.entries(TINT_COLORS)
  .map(
    ([id, [c, o]]) => `<radialGradient id="tint-${id}">
    <stop offset="0" stop-color="${c}" stop-opacity="${o}"/>
    <stop offset="0.55" stop-color="${c}" stop-opacity="${o * 0.6}"/>
    <stop offset="1" stop-color="${c}" stop-opacity="0"/>
  </radialGradient>`,
  )
  .join('');

const MARKUP = `
<defs>
  <filter id="terrain-noise" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.024" numOctaves="4" seed="11" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.15  0 0 0 0 0.1  0 0 0 1.1 -0.42"/>
  </filter>
  <filter id="terrain-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.14 0"/>
  </filter>
  <pattern id="pat-terrain" width="320" height="320" patternUnits="userSpaceOnUse">
    <rect class="pat-land" width="320" height="320"/>
    <rect width="320" height="320" filter="url(#terrain-noise)"/>
    <rect width="320" height="320" filter="url(#terrain-grain)"/>
  </pattern>
  <pattern id="pat-forest" width="18" height="15" patternUnits="userSpaceOnUse">
    <rect class="pat-forest-bg" width="18" height="15"/>
    <circle class="pat-crown-a" cx="4" cy="4" r="4.2"/>
    <circle class="pat-crown-b" cx="13" cy="3" r="3.6"/>
    <circle class="pat-crown-c" cx="9" cy="10" r="4.4"/>
    <circle class="pat-crown-a" cx="17.5" cy="11" r="3.4"/>
    <circle class="pat-crown-b" cx="0" cy="12" r="3.2"/>
  </pattern>
  <pattern id="pat-marsh" width="14" height="10" patternUnits="userSpaceOnUse">
    <rect class="pat-marsh-bg" width="14" height="10"/>
    <g class="pat-reed">
      <path d="M1 3 H6"/><path d="M8 8 H13"/>
      <path d="M3.5 3 V0.8 M2.5 3 L1.8 1.2 M4.5 3 L5.2 1.2"/>
    </g>
  </pattern>
  ${gradients}
</defs>`;

export function injectPatterns(): void {
  if (document.getElementById('atlas-patterns')) return;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = 'atlas-patterns';
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = MARKUP;
  document.body.prepend(svg);
}
