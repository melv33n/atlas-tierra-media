/**
 * Marcadores de los personajes en el instante actual: ficha de color con
 * iniciales (sin retratos). Si varios coinciden en el mismo sitio se reparten en
 * fila para que se vean todos.
 */
import L from 'leaflet';
import type { Character, DataBundle } from '../data/types.ts';
import { shortNameOf } from '../data/types.ts';
import { positionAt, type Track } from '../data/timeline.ts';
import { toLatLng } from '../lib/coords.ts';
import { chipInk } from './popup.ts';
import { escapeHtml } from './journeyLayer.ts';

/** Distancia en px por debajo de la cual dos fichas se agrupan. */
const CLUSTER_PX = 16;
const SPACING_PX = 19;

export class CharacterMarkers {
  private items: { c: Character; track: Track; marker: L.Marker; shown: boolean }[] = [];
  private map: L.Map;
  private placeName: Map<string, string>;

  constructor(map: L.Map, data: DataBundle, tracks: Track[], pane: string) {
    this.map = map;
    this.placeName = new Map(data.places.map((p) => [p.id, p.name]));
    const byId = new Map(tracks.map((t) => [t.characterId, t]));
    for (const c of data.characters.filter((c) => c.role === 'main')) {
      const track = byId.get(c.id);
      if (!track) continue;
      const marker = L.marker([0, 0], {
        pane,
        keyboard: false,
        icon: L.divIcon({
          className: 'char-marker',
          html: `<span class="char-chip" style="--c:${c.color};--ink:${chipInk(c.color)}">${escapeHtml(c.initials)}</span>`,
          iconSize: [0, 0],
        }),
      });
      marker.bindTooltip('', { direction: 'top', offset: [0, -12], className: 'char-tip' });
      this.items.push({ c, track, marker, shown: false });
    }
    map.on('zoomend', () => this.layoutClusters());
  }

  update(t: number, hidden: ReadonlySet<string>): void {
    for (const it of this.items) {
      const pos = hidden.has(it.c.id) ? null : positionAt(it.track, t);
      if (!pos) {
        if (it.shown) it.marker.remove();
        it.shown = false;
        continue;
      }
      it.marker.setLatLng(toLatLng(pos.xy));
      const where = pos.placeId
        ? `en ${this.placeName.get(pos.placeId) ?? pos.placeId}`
        : `de camino a ${this.placeName.get(pos.move!.leg.to) ?? pos.move!.leg.to}`;
      it.marker.setTooltipContent(
        `<strong>${escapeHtml(shortNameOf(it.c))}</strong> ${escapeHtml(where)}`,
      );
      if (!it.shown) it.marker.addTo(this.map);
      it.shown = true;
    }
    this.layoutClusters();
  }

  /** Reparte en fila las fichas que caen casi en el mismo punto de pantalla. */
  private layoutClusters(): void {
    const shown = this.items.filter((it) => it.shown);
    const pts = shown.map((it) => this.map.latLngToLayerPoint(it.marker.getLatLng()));
    const used = new Set<number>();
    for (let i = 0; i < shown.length; i++) {
      if (used.has(i)) continue;
      const group = [i];
      for (let k = i + 1; k < shown.length; k++)
        if (!used.has(k) && pts[i]!.distanceTo(pts[k]!) < CLUSTER_PX) group.push(k);
      group.forEach((g, n) => {
        used.add(g);
        const el = shown[g]!.marker.getElement()?.firstElementChild as HTMLElement | null;
        if (!el) return;
        const per = Math.min(group.length, 5);
        const row = Math.floor(n / per);
        const col = n % per;
        const dx = (col - (per - 1) / 2) * SPACING_PX;
        const dy = row * SPACING_PX;
        el.style.setProperty('--dx', `${dx}px`);
        el.style.setProperty('--dy', `${dy}px`);
      });
    }
  }
}
