/** Capa de relieve: dibuja los glifos de `glyphs.ts` y los regenera al cambiar el zoom. */
import L from 'leaflet';
import type { GeoCollection, GeoFeature } from '../data/geo.ts';
import { isLine, isPoint } from '../data/geo.ts';
import { toLatLng } from '../lib/coords.ts';
import { peakGlyph, ridgeGlyphs, type Glyph } from './glyphs.ts';

/** Capa de relieve que se regenera al cambiar el zoom o salir del área dibujada. */
export class ReliefLayer {
  private group = L.layerGroup();
  private drawnZoom = NaN;
  private drawnBounds: L.LatLngBounds | null = null;
  private map: L.Map;
  private features: GeoFeature[];
  private renderer: L.Renderer;

  constructor(map: L.Map, mountains: GeoCollection, renderer: L.Renderer) {
    this.map = map;
    this.features = mountains.features;
    this.renderer = renderer;
    this.group.addTo(map);
    map.on('zoomend moveend', () => this.update());
    this.update();
  }

  update(): void {
    const zoom = this.map.getZoom();
    const view = this.map.getBounds();
    if (zoom === this.drawnZoom && this.drawnBounds?.contains(view)) return;
    const area = view.pad(0.6);
    this.drawnZoom = zoom;
    this.drawnBounds = area;

    const glyphs: Glyph[] = [];
    for (const f of this.features) {
      if (isLine(f)) glyphs.push(...ridgeGlyphs(f, zoom));
      else if (isPoint(f)) glyphs.push(peakGlyph(f, zoom));
    }
    const visible = glyphs.filter((g) => area.contains(toLatLng(g.outline[0]!)));

    const opts = { interactive: false, renderer: this.renderer, smoothFactor: 0 };
    this.group.clearLayers();
    const shadows = visible
      .filter((g) => g.shadow && !g.volcano)
      .map((g) => g.shadow!.map(toLatLng));
    const fire = visible.filter((g) => g.volcano).map((g) => g.shadow!.map(toLatLng));
    const outlines = visible.map((g) => g.outline.map(toLatLng));
    if (shadows.length)
      this.group.addLayer(L.polygon(shadows, { ...opts, className: 'relief-shadow' }));
    if (fire.length) this.group.addLayer(L.polygon(fire, { ...opts, className: 'relief-fire' }));
    if (outlines.length)
      this.group.addLayer(L.polyline(outlines, { ...opts, className: 'relief-line' }));
  }
}
