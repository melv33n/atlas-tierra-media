/**
 * Rutas de los personajes: una polilínea por tramo, del color del personaje,
 * discontinua si es inferida. Los tramos que varios personajes recorren a la vez
 * se dibujan en carriles paralelos (desplazamiento constante en píxeles, por eso
 * se recalculan en cada zoom).
 */
import L from 'leaflet';
import { assignLanes, legShapes, offsetPolyline, type Lane, type LegShape } from '../data/legs.ts';
import { shortNameOf, type Character, type DataBundle } from '../data/types.ts';
import { formatDate } from '../lib/calendar.ts';
import { toLatLng } from '../lib/coords.ts';
import { chaikin } from '../lib/geometry.ts';
import { DEPART } from '../data/timeline.ts';

/** Separación entre carriles (px). */
const LANE_PX = 3.4;

interface Drawn {
  shape: LegShape;
  lane: Lane;
  smooth: LegShape['points'];
  line: L.Polyline;
}

export class JourneyLayer {
  private groups = new Map<string, L.LayerGroup>();
  private drawn: Drawn[] = [];
  private hidden = new Set<string>();
  private map: L.Map;

  constructor(map: L.Map, data: DataBundle, renderer: L.Renderer) {
    this.map = map;
    const main = data.characters.filter((c) => c.role === 'main');
    const chars = new Map(data.characters.map((c) => [c.id, c]));
    const placeName = new Map(data.places.map((p) => [p.id, p.name]));
    const shapes = legShapes(data);
    const lanes = assignLanes(
      shapes,
      main.map((c) => c.id),
    );

    for (const c of main) this.groups.set(c.id, L.layerGroup().addTo(map));
    for (const shape of shapes) {
      const char = chars.get(shape.characterId);
      const group = this.groups.get(shape.characterId);
      if (!char || !group) continue;
      const inferred = shape.leg.confidence === 'inferred';
      const line = L.polyline([], {
        renderer,
        color: char.color,
        weight: 2.6,
        opacity: 0.95,
        dashArray: inferred ? '6 5' : undefined,
        lineCap: inferred ? 'butt' : 'round',
        lineJoin: 'round',
        className: `journey journey--${shape.characterId}`,
        smoothFactor: 0,
      });
      line.bindTooltip(tooltipHtml(char, shape, placeName), {
        sticky: true,
        className: 'journey-tip',
      });
      group.addLayer(line);
      this.drawn.push({ shape, lane: lanes.get(shape)!, smooth: chaikin(shape.points, 2), line });
    }
    map.on('zoomend', () => this.redraw());
    this.redraw();
  }

  /** Recoloca los carriles para el zoom actual. */
  redraw(): void {
    const mpp = 1 / 2 ** this.map.getZoom();
    for (const d of this.drawn) {
      const lanes = this.visibleLane(d);
      const offset = (lanes.lane - (lanes.lanes - 1) / 2) * LANE_PX * mpp;
      d.line.setLatLngs(offsetPolyline(d.smooth, offset).map(toLatLng));
    }
  }

  /** Si se ocultan personajes, los que quedan se reparten los carriles visibles. */
  private visibleLane(d: Drawn): Lane {
    if (this.hidden.size === 0) return d.lane;
    const mates = this.drawn
      .filter((o) => o.shape.key === d.shape.key && o.lane.lanes === d.lane.lanes)
      .filter((o) => o.shape.startDay <= d.shape.endDay && o.shape.endDay >= d.shape.startDay)
      .filter((o) => !this.hidden.has(o.shape.characterId))
      .sort((a, b) => a.lane.lane - b.lane.lane)
      .map((o) => o.shape.characterId);
    const unique = [...new Set(mates)];
    return {
      lane: Math.max(0, unique.indexOf(d.shape.characterId)),
      lanes: Math.max(1, unique.length),
    };
  }

  setVisible(characterId: string, visible: boolean): void {
    const group = this.groups.get(characterId);
    if (!group) return;
    if (visible) {
      this.hidden.delete(characterId);
      group.addTo(this.map);
    } else {
      this.hidden.add(characterId);
      group.remove();
    }
    this.redraw();
  }

  isVisible(characterId: string): boolean {
    return !this.hidden.has(characterId);
  }

  /** Sincroniza los personajes ocultos con el estado global. */
  setHidden(hidden: ReadonlySet<string>): void {
    for (const id of this.groups.keys()) {
      if (hidden.has(id) !== this.hidden.has(id)) this.setVisible(id, !hidden.has(id));
    }
  }

  /**
   * Atenúa lo que aún no ha ocurrido en el instante `t` y, si hay rango, casi
   * oculta lo que cae fuera de él.
   */
  setTime(t: number, range: [number, number] | null): void {
    for (const d of this.drawn) {
      const { startDay, endDay } = d.shape;
      const out = range && (endDay + 1 < range[0] || startDay > range[1]);
      const future = startDay + DEPART > t;
      const opacity = out ? 0.06 : future ? 0.2 : 0.95;
      if (d.line.options.opacity !== opacity) d.line.setStyle({ opacity });
    }
  }
}

function tooltipHtml(char: Character, shape: LegShape, placeName: Map<string, string>): string {
  const { leg } = shape;
  const from = placeName.get(leg.from) ?? leg.from;
  const to = placeName.get(leg.to) ?? leg.to;
  const dates =
    formatDate(leg.start) === formatDate(leg.end)
      ? formatDate(leg.start)
      : `${formatDate(leg.start)} – ${formatDate(leg.end)}`;
  const note =
    leg.confidence === 'inferred'
      ? `<div class="jt-note"><strong>Inferido.</strong> ${escapeHtml(leg.note ?? '')}</div>`
      : leg.note
        ? `<div class="jt-note">${escapeHtml(leg.note)}</div>`
        : '';
  return `<div class="jt-who" style="--c:${char.color}">${escapeHtml(shortNameOf(char))}</div>
<div class="jt-path">${escapeHtml(from)} → ${escapeHtml(to)}</div>
<div class="jt-dates">${dates}</div>${note}`;
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );
}
