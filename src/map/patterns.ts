/**
 * Patrones SVG propios (bosque y marisma). Se definen una vez en un <svg> oculto
 * y los polígonos de Leaflet los referencian con `fill: url(#…)` desde el CSS.
 * Colores vía clases, para que respondan al modo oscuro.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

const MARKUP = `
<defs>
  <pattern id="pat-forest" width="12" height="11" patternUnits="userSpaceOnUse">
    <rect class="pat-bg pat-forest-bg" width="12" height="11"/>
    <g class="pat-tree">
      <path d="M3 6.6 V8.6"/><circle cx="3" cy="5" r="1.8"/>
      <path d="M9 1.1 V3.1"/><circle cx="9" cy="-0.5" r="1.8"/><circle cx="9" cy="10.5" r="1.8"/>
    </g>
  </pattern>
  <pattern id="pat-marsh" width="14" height="10" patternUnits="userSpaceOnUse">
    <rect class="pat-bg pat-marsh-bg" width="14" height="10"/>
    <g class="pat-reed">
      <path d="M1 3 H6"/><path d="M8 8 H13"/>
      <path d="M3.5 3 V0.8 M2.5 3 L1.8 1.2 M4.5 3 L5.2 1.2"/>
    </g>
  </pattern>
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
