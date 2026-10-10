/** Capa de relieve: dibuja los glifos de `glyphs.ts` y los regenera al cambiar el zoom. */
import L from 'leaflet';
import type { GeoCollection, GeoFeature } from '../data/geo.ts';
import { isLine, isPoint } from '../data/geo.ts';
import { toLatLng } from '../lib/coords.ts';
import { peakGlyph, ridgeGlyphs, type Glyph } from './glyphs.ts';
import type { XY } from '../data/types.ts';

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
    const poly = (rings: XY[][], className: string) => {
      if (rings.length)
        this.group.addLayer(
          L.polygon(
            rings.map((r) => r.map(toLatLng)),
            { ...opts, className },
          ),
        );
    };
    this.group.clearLayers();
    const peaks = visible.filter((g) => g.shadow);
    // Caras iluminadas y en sombra (luz del oeste), nieve, lava y el contorno encima.
    poly(
      visible.filter((g) => !g.shadow).map((g) => g.light),
      'relief-hill',
    );
    poly(
      peaks.map((g) => g.light),
      'relief-light',
    );
    poly(
      peaks.filter((g) => !g.volcano).map((g) => g.shadow!),
      'relief-shadow',
    );
    poly(
      peaks.filter((g) => g.volcano).map((g) => g.shadow!),
      'relief-fire',
    );
    poly(
      visible.filter((g) => g.snow).map((g) => g.snow!),
      'relief-snow',
    );
    const outlines = visible.map((g) => g.outline.map(toLatLng));
    if (outlines.length)
      this.group.addLayer(L.polyline(outlines, { ...opts, className: 'relief-line' }));
  }
}
