/** Marcadores de lugares (símbolo por tipo) con ficha emergente y visibilidad por zoom. */
import L from 'leaflet';
import type { Place, PlaceType, XY } from '../data/types.ts';
import { toLatLng } from '../lib/coords.ts';

const SYMBOL: Partial<Record<PlaceType, string>> = {
  ciudad: 'city',
  fortaleza: 'fort',
  torre: 'fort',
  ruina: 'ruin',
  morada: 'dwelling',
  puerto: 'city',
};

const TYPE_ES: Record<PlaceType, string> = {
  ciudad: 'ciudad',
  aldea: 'aldea',
  fortaleza: 'fortaleza',
  torre: 'torre',
  morada: 'morada',
  puerto: 'puerto',
  puente: 'puente',
  vado: 'vado',
  paso: 'paso',
  puerta: 'puerta',
  colina: 'colina',
  monte: 'monte',
  bosque: 'bosque',
  valle: 'valle',
  campo: 'campo',
  lago: 'lago',
  cascada: 'cascada',
  ruina: 'ruina',
  lugar: 'lugar',
};

export class PlaceLayer {
  private items: { place: Place; layer: L.LayerGroup; shown: boolean }[] = [];
  private map: L.Map;

  constructor(map: L.Map, places: Place[], renderer: L.Renderer) {
    this.map = map;
    for (const place of places) {
      const ll = toLatLng(place.coords);
      const symbol = SYMBOL[place.type] ?? 'dot';
      const radius = symbol === 'city' ? 4 : symbol === 'dot' ? 2.6 : 3.4;
      const mark = L.circleMarker(ll, {
        renderer,
        radius,
        className: `place place--${symbol}`,
        interactive: false,
      });
      // Área de toque generosa para el móvil, invisible.
      const hit = L.circleMarker(ll, { renderer, radius: 12, className: 'place-hit' });
      hit.bindPopup(popupHtml(place), {
        className: 'place-popup',
        closeButton: false,
        offset: [0, -4],
      });
      this.items.push({ place, layer: L.layerGroup([mark, hit]), shown: false });
    }
    map.on('zoomend', () => this.update());
    this.update();
  }

  update(): void {
    const zoom = this.map.getZoom();
    for (const it of this.items) {
      const show = zoom >= it.place.zoomMin;
      if (show && !it.shown) it.layer.addTo(this.map);
      if (!show && it.shown) it.layer.remove();
      it.shown = show;
    }
  }

  /** Posiciones en pantalla (capa) de los marcadores visibles: obstáculos para las etiquetas. */
  visiblePoints(): XY[] {
    return this.items
      .filter((it) => it.shown)
      .map((it) => {
        const p = this.map.latLngToLayerPoint(toLatLng(it.place.coords));
        return [p.x, p.y] as XY;
      });
  }
}

function popupHtml(p: Place): string {
  const alt = p.altNames?.length ? `<div class="pp-alt">${p.altNames.join(' · ')}</div>` : '';
  const meta = [TYPE_ES[p.type], p.region].filter(Boolean).join(' · ');
  return `<div class="pp-name">${p.name}</div>${alt}<div class="pp-meta">${meta}</div>`;
}
