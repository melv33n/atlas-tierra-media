import { describe, expect, it } from 'vitest';
import {
  centroid,
  chaikin,
  distanceToPolyline,
  isClosed,
  pointAt,
  pointInPolygon,
  polylineLength,
  roughen,
  sampleAlong,
} from '../src/lib/geometry.ts';
import { distance, fromLatLng, pathLength, toLatLng } from '../src/lib/coords.ts';
import { hashString, mulberry32 } from '../src/lib/random.ts';
import type { XY } from '../src/data/types.ts';

const square: XY[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const line: XY[] = [
  [0, 0],
  [10, 0],
  [10, 10],
];

describe('chaikin', () => {
  it('conserva los extremos de una línea abierta', () => {
    const out = chaikin(line, 3);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([10, 10]);
    expect(out.length).toBeGreaterThan(line.length);
  });
  it('un anillo cerrado sigue cerrado', () => {
    const out = chaikin(square, 2);
    expect(isClosed(out)).toBe(true);
  });
  it('acorta las esquinas (el resultado es más corto)', () => {
    expect(polylineLength(chaikin(line, 2))).toBeLessThan(polylineLength(line));
  });
});

describe('roughen', () => {
  it('es determinista y conserva los vértices originales', () => {
    const a = roughen(line, 42);
    const b = roughen(line, 42);
    expect(a).toEqual(b);
    expect(a).toContainEqual([10, 0]);
    expect(a[0]).toEqual([0, 0]);
    expect(a[a.length - 1]).toEqual([10, 10]);
    expect(roughen(line, 43)).not.toEqual(a);
  });
  it('un anillo cerrado sigue cerrado', () => {
    expect(isClosed(roughen(square, 7))).toBe(true);
  });
  it('limita la deformación de segmentos larguísimos', () => {
    const long: XY[] = [
      [0, 0],
      [3000, 0],
    ];
    const out = roughen(long, 1, 0.15, 1, 150);
    expect(Math.abs(out[1]![1])).toBeLessThanOrEqual(150 * 0.15);
  });
});

describe('medidas', () => {
  it('punto en polígono', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true);
    expect(pointInPolygon([15, 5], square)).toBe(false);
  });
  it('distancia a una polilínea', () => {
    expect(distanceToPolyline([5, 3], line)).toBeCloseTo(3);
    expect(distanceToPolyline([12, 5], line)).toBeCloseTo(2);
  });
  it('pointAt y sampleAlong', () => {
    expect(pointAt(line, 0.5).point).toEqual([10, 0]);
    expect(pointAt(line, 0.75).tangent).toEqual([0, 1]);
    const samples = sampleAlong(line, () => 2);
    expect(samples).toHaveLength(10);
    expect(samples[0]!.point).toEqual([1, 0]);
  });
  it('centroide', () => {
    expect(centroid(square)).toEqual([5, 5]);
  });
});

describe('coordenadas', () => {
  it('[x, y] ↔ [lat, lng] = [y, x]', () => {
    expect(toLatLng([100, 200])).toEqual([200, 100]);
    expect(fromLatLng(200, 100)).toEqual([100, 200]);
  });
  it('distancias en millas', () => {
    expect(distance([0, 0], [3, 4])).toBe(5);
    expect(pathLength(line)).toBe(20);
  });
});

describe('aleatoriedad determinista', () => {
  it('misma semilla, misma secuencia', () => {
    const a = mulberry32(hashString('anduin'));
    const b = mulberry32(hashString('anduin'));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashString('anduin')).not.toBe(hashString('isen'));
  });
});
