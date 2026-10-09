/** Utilidades geométricas puras sobre puntos [x, y] (millas). */
import type { XY } from '../data/types.ts';
import { mulberry32 } from './random.ts';

/**
 * Suavizado de Chaikin. En líneas abiertas conserva los extremos; en anillos
 * cerrados (primer punto == último) devuelve otro anillo cerrado.
 */
export function chaikin(points: XY[], iterations = 2): XY[] {
  if (points.length < 3) return points.slice();
  const closed = isClosed(points);
  let pts = closed ? points.slice(0, -1) : points.slice();
  for (let it = 0; it < iterations; it++) {
    const out: XY[] = [];
    const n = pts.length;
    if (!closed) out.push(pts[0]!);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % n]!;
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (!closed) out.push(pts[n - 1]!);
    pts = out;
  }
  return closed ? [...pts, pts[0]!] : pts;
}

/**
 * Desplazamiento de punto medio: subdivide cada segmento y desplaza el punto
 * nuevo en perpendicular, para que costas y orillas parezcan dibujadas a mano.
 * Determinista dado `seed`. Conserva los vértices originales. El desplazamiento
 * se calcula como si ningún segmento midiera más de `maxSegment` (los tramos
 * larguísimos fuera de la vista no deben combarse cientos de millas).
 */
export function roughen(
  points: XY[],
  seed: number,
  amplitude = 0.15,
  levels = 3,
  maxSegment = 150,
): XY[] {
  if (points.length < 2) return points.slice();
  const rand = mulberry32(seed);
  let pts = points.slice();
  for (let level = 0; level < levels; level++) {
    const out: XY[] = [pts[0]!];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      const off = Math.min(len, maxSegment) * amplitude * (rand() * 2 - 1);
      const nx = len ? -dy / len : 0;
      const ny = len ? dx / len : 0;
      out.push([(a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off], b);
    }
    pts = out;
  }
  return pts;
}

export function isClosed(points: XY[]): boolean {
  const a = points[0];
  const b = points[points.length - 1];
  return !!a && !!b && points.length > 2 && a[0] === b[0] && a[1] === b[1];
}

export function pointInPolygon([x, y]: XY, ring: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function distanceToPolyline(p: XY, line: XY[]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++)
    best = Math.min(best, distanceToSegment(p, line[i - 1]!, line[i]!));
  return best;
}

export function polylineLength(points: XY[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++)
    total += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]);
  return total;
}

export interface Sample {
  point: XY;
  /** Tangente unitaria. */
  tangent: XY;
  /** Fracción recorrida (0–1). */
  t: number;
}

/** Punto y tangente a una fracción `t` (0–1) de la longitud de la línea. */
export function pointAt(points: XY[], t: number): Sample {
  const total = polylineLength(points);
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (target <= len || i === points.length - 1) {
      const f = len ? Math.min(1, target / len) : 0;
      return {
        point: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        tangent: len ? [(b[0] - a[0]) / len, (b[1] - a[1]) / len] : [1, 0],
        t,
      };
    }
    target -= len;
  }
  return { point: points[0] ?? [0, 0], tangent: [1, 0], t: 0 };
}

/**
 * Muestras equiespaciadas a lo largo de la línea. `spacing` puede depender de la
 * tangente local (las montañas necesitan más hueco en vertical que en horizontal).
 */
export function sampleAlong(points: XY[], spacing: (tangent: XY) => number): Sample[] {
  const total = polylineLength(points);
  const out: Sample[] = [];
  if (total === 0) return out;
  let d = spacing(pointAt(points, 0).tangent) / 2;
  while (d < total) {
    const s = pointAt(points, d / total);
    out.push(s);
    d += Math.max(spacing(s.tangent), total / 5000);
  }
  return out;
}

/** Centroide (media de vértices) de un anillo. */
export function centroid(ring: XY[]): XY {
  const pts = isClosed(ring) ? ring.slice(0, -1) : ring;
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
}
