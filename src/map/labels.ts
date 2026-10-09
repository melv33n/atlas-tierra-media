/**
 * Etiquetas del mapa con aparición por zoom y eliminación de solapes.
 *
 * Cada etiqueta tiene un zoom mínimo y una prioridad. Tras cada zoom se recorren
 * de mayor a menor prioridad y se oculta la que choca con otra ya colocada. Los
 * nombres de lugar prueban cuatro posiciones (derecha, izquierda, arriba, abajo).
 */
import L from 'leaflet';
import type { XY } from '../data/types.ts';
import { toLatLng } from '../lib/coords.ts';

export type LabelKind =
  'region' | 'place' | 'range' | 'peak' | 'river' | 'forest' | 'lake' | 'road';

export interface LabelSpec {
  id: string;
  text: string;
  at: XY;
  kind: LabelKind;
  rank: number;
  minZoom: number;
  /** Grados, sentido horario en pantalla. */
  angle?: number;
  /** Clase extra (p.ej. tipo de lugar). */
  variant?: string;
}

type Anchor = 'center' | 'right' | 'left' | 'top' | 'bottom';

interface Label extends LabelSpec {
  marker: L.Marker;
  el: HTMLElement | null;
  w: number;
  h: number;
  priority: number;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const KIND_WEIGHT: Record<LabelKind, number> = {
  place: 0,
  region: 1,
  peak: 2,
  lake: 2,
  range: 3,
  forest: 3,
  river: 4,
  road: 6,
};

/** Separación entre el punto del lugar y su etiqueta (px). */
const GAP = 6;
const PAD = 2;

export class LabelLayer {
  private labels: Label[] = [];
  /** Obstáculos fijos (marcadores visibles) en coordenadas de capa, recalculados por zoom. */
  private obstacles: () => XY[] = () => [];
  private map: L.Map;
  private pane: string;

  constructor(map: L.Map, pane: string) {
    this.map = map;
    this.pane = pane;
    map.on('zoomend', () => this.layout());
  }

  setObstacles(fn: () => XY[]): void {
    this.obstacles = fn;
  }

  add(spec: LabelSpec): void {
    const angle = spec.angle ?? 0;
    const html = `<span class="lbl lbl--${spec.kind} lbl--r${spec.rank}${
      spec.variant ? ` lbl--${spec.variant}` : ''
    }" data-anchor="${spec.kind === 'place' ? 'right' : 'center'}" style="--angle:${angle}deg">${escape(spec.text)}</span>`;
    const marker = L.marker(toLatLng(spec.at), {
      pane: this.pane,
      interactive: false,
      keyboard: false,
      icon: L.divIcon({ className: 'lbl-anchor', html, iconSize: [0, 0] }),
    });
    this.labels.push({
      ...spec,
      marker,
      el: null,
      w: 0,
      h: 0,
      priority: spec.minZoom * 10 + KIND_WEIGHT[spec.kind] + spec.rank * 0.5,
    });
  }

  /** Añade todas al mapa, mide su tamaño y hace la primera colocación. */
  mount(): void {
    for (const l of this.labels) {
      l.marker.addTo(this.map);
      l.el = (l.marker.getElement()?.firstElementChild as HTMLElement | null) ?? null;
    }
    this.measure();
    this.layout();
  }

  /** Vuelve a medir (p.ej. cuando terminan de cargar las fuentes). */
  measure(): void {
    for (const l of this.labels) {
      if (!l.el) continue;
      const prev = l.el.style.display;
      l.el.style.display = '';
      l.w = l.el.offsetWidth;
      l.h = l.el.offsetHeight;
      l.el.style.display = prev;
    }
    this.layout();
  }

  layout(): void {
    const zoom = this.map.getZoom();
    const placed: Box[] = this.obstacles().map(([x, y]) => ({
      x0: x - 3,
      y0: y - 3,
      x1: x + 3,
      y1: y + 3,
    }));
    const ordered = this.labels.slice().sort((a, b) => a.priority - b.priority);
    for (const l of ordered) {
      if (!l.el) continue;
      if (zoom < l.minZoom) {
        l.el.style.display = 'none';
        continue;
      }
      const p = this.map.latLngToLayerPoint(toLatLng(l.at));
      const anchors: Anchor[] =
        l.kind === 'place' ? ['right', 'left', 'top', 'bottom'] : ['center'];
      let chosen: Anchor | null = null;
      for (const a of anchors) {
        const box = boxFor(p.x, p.y, l.w, l.h, a, l.angle ?? 0);
        if (!placed.some((b) => overlaps(b, box))) {
          placed.push(box);
          chosen = a;
          break;
        }
      }
      if (chosen) {
        l.el.style.display = '';
        l.el.dataset.anchor = chosen;
      } else {
        l.el.style.display = 'none';
      }
    }
  }
}

function boxFor(x: number, y: number, w: number, h: number, a: Anchor, angle: number): Box {
  switch (a) {
    case 'right':
      return { x0: x + GAP - PAD, y0: y - h / 2 - PAD, x1: x + GAP + w + PAD, y1: y + h / 2 + PAD };
    case 'left':
      return { x0: x - GAP - w - PAD, y0: y - h / 2 - PAD, x1: x - GAP + PAD, y1: y + h / 2 + PAD };
    case 'top':
      return { x0: x - w / 2 - PAD, y0: y - GAP - h - PAD, x1: x + w / 2 + PAD, y1: y - GAP + PAD };
    case 'bottom':
      return { x0: x - w / 2 - PAD, y0: y + GAP - PAD, x1: x + w / 2 + PAD, y1: y + GAP + h + PAD };
    case 'center': {
      const r = (angle * Math.PI) / 180;
      const W = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r));
      const H = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r));
      return { x0: x - W / 2 - PAD, y0: y - H / 2 - PAD, x1: x + W / 2 + PAD, y1: y + H / 2 + PAD };
    }
  }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function escape(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );
}

/** Ángulo de pantalla (grados) para una tangente en coordenadas de mapa, siempre legible. */
export function screenAngle([tx, ty]: XY): number {
  let deg = (-Math.atan2(ty, tx) * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  return Math.round(deg);
}
