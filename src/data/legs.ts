/**
 * Geometría de los tramos de viaje y reparto en carriles paralelos.
 *
 * Cada tramo con desplazamiento (from ≠ to) se convierte en una polilínea en
 * millas: lugar de origen + puntos intermedios (de `routes.json` o del propio
 * tramo) + destino. La polilínea se guarda siempre en el sentido canónico de su
 * trazado, de modo que dos personajes que lo recorren en sentidos opuestos
 * comparten el mismo «lado» al desplazarse en paralelo.
 */
import { toDayIndex } from '../lib/calendar.ts';
import type { DataBundle, Leg, XY } from './types.ts';

export interface LegShape {
  characterId: string;
  /** Posición del tramo dentro de la ruta del personaje. */
  index: number;
  leg: Leg;
  /** Puntos en sentido canónico del trazado (millas). */
  points: XY[];
  /** El personaje recorre `points` del final al principio. */
  reversed: boolean;
  /** Clave del trazado: tramos con la misma clave comparten geometría. */
  key: string;
  startDay: number;
  endDay: number;
}

export function legShapes(data: DataBundle): LegShape[] {
  const coords = new Map(data.places.map((p) => [p.id, p.coords]));
  const routes = new Map(data.routes.map((r) => [r.id, r]));
  const out: LegShape[] = [];
  for (const j of data.journeys) {
    j.legs.forEach((leg, index) => {
      if (leg.from === leg.to) return;
      const a = coords.get(leg.from);
      const b = coords.get(leg.to);
      if (!a || !b) return;
      const route = leg.routeId ? routes.get(leg.routeId) : undefined;
      let points: XY[];
      let reversed = false;
      let key: string;
      if (route) {
        const ra = coords.get(route.from)!;
        const rb = coords.get(route.to)!;
        points = [ra, ...route.via, rb];
        reversed = route.from !== leg.from;
        key = route.id;
      } else {
        // Sin trazado compartido: sentido canónico = orden alfabético de los extremos.
        reversed = leg.from > leg.to;
        const [p, q] = reversed ? [b, a] : [a, b];
        const via = leg.via ?? [];
        points = [p, ...(reversed ? via.slice().reverse() : via), q];
        key = `${reversed ? leg.to : leg.from}~${reversed ? leg.from : leg.to}~${JSON.stringify(via)}`;
      }
      out.push({
        characterId: j.characterId,
        index,
        leg,
        points,
        reversed,
        key,
        startDay: toDayIndex(leg.start),
        endDay: toDayIndex(leg.end),
      });
    });
  }
  return out;
}

export interface Lane {
  /** 0…lanes-1 */
  lane: number;
  lanes: number;
}

/**
 * Tramos del mismo trazado cuyos intervalos de fechas se solapan forman un grupo
 * («van juntos»); dentro del grupo, cada personaje ocupa un carril según `order`.
 */
export function assignLanes(shapes: LegShape[], order: string[]): Map<LegShape, Lane> {
  const rank = new Map(order.map((id, i) => [id, i]));
  const byKey = new Map<string, LegShape[]>();
  for (const s of shapes) byKey.set(s.key, [...(byKey.get(s.key) ?? []), s]);

  const result = new Map<LegShape, Lane>();
  for (const list of byKey.values()) {
    list.sort((a, b) => a.startDay - b.startDay);
    let group: LegShape[] = [];
    let groupEnd = -Infinity;
    const flush = () => {
      const chars = [...new Set(group.map((s) => s.characterId))].sort(
        (a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99),
      );
      for (const s of group)
        result.set(s, { lane: chars.indexOf(s.characterId), lanes: chars.length });
    };
    for (const s of list) {
      if (group.length && s.startDay > groupEnd) {
        flush();
        group = [];
        groupEnd = -Infinity;
      }
      group.push(s);
      groupEnd = Math.max(groupEnd, s.endDay);
    }
    if (group.length) flush();
  }
  return result;
}

/**
 * Desplaza una polilínea `d` unidades a la izquierda de su sentido (d < 0: a la
 * derecha), con inglete limitado en los vértices.
 */
export function offsetPolyline(points: XY[], d: number): XY[] {
  if (d === 0 || points.length < 2) return points.slice();
  const normals: XY[] = [];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    normals.push([-(y1 - y0) / len, (x1 - x0) / len]);
  }
  return points.map((p, i) => {
    const n0 = normals[Math.max(0, i - 1)]!;
    const n1 = normals[Math.min(normals.length - 1, i)]!;
    let nx = n0[0] + n1[0];
    let ny = n0[1] + n1[1];
    const len = Math.hypot(nx, ny);
    if (len < 1e-6) {
      nx = n1[0];
      ny = n1[1];
    } else {
      nx /= len;
      ny /= len;
    }
    // Inglete: compensa el ángulo, sin pasar del doble para no crear picos.
    const cos = nx * n1[0] + ny * n1[1];
    const miter = Math.min(2, 1 / Math.max(cos, 0.5));
    return [p[0] + nx * d * miter, p[1] + ny * d * miter] as XY;
  });
}
