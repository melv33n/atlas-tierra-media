/**
 * Herramienta de autoría (`?debug`): rejilla de 100 millas, coordenadas del
 * cursor y clic para copiar `[x, y]`. Sirve para corregir posiciones a mano.
 */
import L from 'leaflet';
import { fromLatLng, MAP_EXTENT, toLatLng } from '../lib/coords.ts';

export function enableDebug(map: L.Map, renderer: L.Renderer): void {
  const lines: L.LatLngExpression[][] = [];
  for (let x = 0; x <= MAP_EXTENT.width; x += 100)
    lines.push([toLatLng([x, 0]), toLatLng([x, MAP_EXTENT.height])]);
  for (let y = 0; y <= MAP_EXTENT.height; y += 100)
    lines.push([toLatLng([0, y]), toLatLng([MAP_EXTENT.width, y])]);
  L.polyline(lines, { renderer, className: 'debug-grid', interactive: false }).addTo(map);

  const Readout = L.Control.extend({
    onAdd() {
      const el = L.DomUtil.create('div', 'debug-readout');
      el.textContent = 'x —, y —';
      return el;
    },
  });
  const readout = new Readout({ position: 'bottomleft' }).addTo(map);
  const el = readout.getContainer()!;
  const fmt = (e: L.LeafletMouseEvent) => {
    const [x, y] = fromLatLng(e.latlng.lat, e.latlng.lng);
    return `[${Math.round(x)}, ${Math.round(y)}]`;
  };
  map.on('mousemove', (e) => (el.textContent = `${fmt(e)} · z ${map.getZoom()}`));
  map.on('click', (e) => {
    const text = fmt(e);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    el.textContent = `${text} copiado`;
    console.info('[debug]', text);
  });
}
