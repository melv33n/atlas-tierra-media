/** Marcadores de lugares (símbolo por tipo) con ficha emergente y visibilidad por zoom. */
import L from 'leaflet';
import type { Character, Place, PlaceType, StoryEvent, XY } from '../data/types.ts';
import { toLatLng } from '../lib/coords.ts';
import { placePopupHtml } from './popup.ts';

const SYMBOL: Partial<Record<PlaceType, string>> = {
  ciudad: 'city',
  fortaleza: 'fort',
  torre: 'fort',
  ruina: 'ruin',
  morada: 'dwelling',
  puerto: 'city',
};

export class PlaceLayer {
  private items: { place: Place; layer: L.LayerGroup; hit: L.CircleMarker; shown: boolean }[] = [];
  private map: L.Map;

  constructor(
    map: L.Map,
    places: Place[],
    renderer: L.Renderer,
    events: StoryEvent[] = [],
    characters: Character[] = [],
  ) {
    this.map = map;
    const chars = new Map(characters.map((c) => [c.id, c]));
    const byPlace = new Map<string, StoryEvent[]>();
    for (const e of events) byPlace.set(e.placeId, [...(byPlace.get(e.placeId) ?? []), e]);
    for (const place of places) {
      const placeEvents = byPlace.get(place.id) ?? [];
      const ll = toLatLng(place.coords);
      const symbol = SYMBOL[place.type] ?? 'dot';
      const radius = symbol === 'city' ? 4 : symbol === 'dot' ? 2.6 : 3.4;
      const mark = L.circleMarker(ll, {
        renderer,
        radius,
        className: `place place--${symbol}${placeEvents.length ? ' place--events' : ''}`,
        interactive: false,
      });
      // Área de toque generosa para el móvil, invisible.
      const hit = L.circleMarker(ll, { renderer, radius: 12, className: 'place-hit' });
      hit.bindPopup(placePopupHtml(place, placeEvents, chars), {
        className: 'place-popup',
        closeButton: true,
        // En móvil, más estrecha y sin quedar bajo los controles de zoom y leyenda.
        maxWidth: Math.min(320, window.innerWidth - 90),
        minWidth: Math.min(220, window.innerWidth - 90),
        autoPanPaddingTopLeft: [60, 60],
        autoPanPaddingBottomRight: [16, 16],
      });
      this.items.push({ place, layer: L.layerGroup([mark, hit]), hit, shown: false });
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

  /** Abre la ficha de un lugar (mostrándolo aunque el zoom aún no lo incluya). */
  openPopup(placeId: string): void {
    const it = this.items.find((x) => x.place.id === placeId);
    if (!it) return;
    if (!it.shown) {
      it.layer.addTo(this.map);
      it.shown = true;
    }
    it.hit.openPopup();
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
