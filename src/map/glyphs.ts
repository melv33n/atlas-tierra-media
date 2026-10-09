/**
 * Generación pura de glifos de relieve (sin Leaflet, testeable).
 *
 * Los glifos tienen tamaño constante en píxeles, así que se regeneran en cada
 * zoom (en millas cambian). Su posición sale de un PRNG con semilla fija, de modo
 * que el dibujo es idéntico en cada carga. Se espacian para no solaparse nunca:
 * así todos caben en un único <path> por capa y no hace falta orden de pintado.
 */
import type { GeoFeature } from '../data/geo.ts';
import type { XY } from '../data/types.ts';
import { sampleAlong } from '../lib/geometry.ts';
import { hashString, mulberry32 } from '../lib/random.ts';
import { shapeOf } from './shapes.ts';

export interface Glyph {
  /** Contorno (polilínea abierta). */
  outline: XY[];
  /** Sombra (polígono) o null. */
  shadow: XY[] | null;
  volcano?: boolean;
}

/** Anchura en píxeles de un glifo según tipo y rango. */
function glyphPx(kind: string, rank: number, zoom: number): number {
  const base = kind === 'hills' ? 9 : rank <= 1 ? 12 : rank === 2 ? 10.5 : 9;
  return base * (1 + 0.45 * Math.max(0, zoom));
}

/** Filas máximas: al acercarse, la banda no debe convertirse en un tapiz. */
const MAX_ROWS = { range: 5, hills: 3 } as const;

function mountainGlyph(p: XY, w: number, h: number, skew: number): Glyph {
  const peak: XY = [p[0] + skew * w, p[1] + h];
  const left: XY = [p[0] - w / 2, p[1]];
  const right: XY = [p[0] + w / 2, p[1]];
  const foot: XY = [p[0] + skew * w * 0.4 + w * 0.06, p[1]];
  return { outline: [left, peak, right], shadow: [peak, right, foot] };
}

function hillGlyph(p: XY, w: number, h: number): Glyph {
  const outline: XY[] = [];
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI - (k * Math.PI) / 6;
    outline.push([p[0] + (w / 2) * Math.cos(a), p[1] + h * Math.sin(a)]);
  }
  return { outline, shadow: null };
}

/** Genera los glifos de una cordillera o colinas para un zoom dado (millas). */
export function ridgeGlyphs(feature: GeoFeature, zoom: number): Glyph[] {
  const { kind, rank = 2, width = 30, id } = feature.properties;
  const mpp = 1 / 2 ** zoom; // millas por píxel
  const w = glyphPx(kind, rank, zoom) * mpp;
  const h = kind === 'hills' ? w * 0.42 : w * 0.82;
  const rand = mulberry32(hashString(`${id}@${zoom}`));
  const pts = shapeOf(feature);

  // Huecos mínimos para que dos glifos vecinos no se toquen, según la dirección.
  const along = (t: XY) => w * 1.08 * Math.abs(t[0]) + h * 1.02 * Math.abs(t[1]);
  const across = (n: XY) => w * 0.8 * Math.abs(n[0]) + h * 0.8 * Math.abs(n[1]);

  const glyphs: Glyph[] = [];
  const samples = sampleAlong(pts, along);
  for (const s of samples) {
    const n: XY = [-s.tangent[1], s.tangent[0]];
    const step = across(n);
    const cap = kind === 'hills' ? MAX_ROWS.hills : MAX_ROWS.range;
    const maxRows = Math.max(1, Math.min(cap, Math.floor(width / step)));
    // Las cordilleras se estrechan en los extremos.
    const edge = Math.min(s.t, 1 - s.t);
    const taper = 0.35 + 0.65 * Math.min(1, edge / 0.18);
    const rows = Math.max(1, Math.round(maxRows * taper));
    for (let r = 0; r < rows; r++) {
      const o = (r - (rows - 1) / 2) * step;
      // Filas alternas desplazadas media posición: los glifos encajan al tresbolillo.
      const shift = (r % 2) * 0.5 * along(s.tangent) + (rand() - 0.5) * 0.12 * w;
      const p: XY = [
        s.point[0] + n[0] * o + s.tangent[0] * shift,
        s.point[1] + n[1] * o + s.tangent[1] * shift,
      ];
      // Más altas en el eje de la cresta, más bajas en las faldas; algún hueco al azar.
      const centrality = rows > 1 ? 1 - Math.abs(r - (rows - 1) / 2) / ((rows - 1) / 2) : 1;
      const scale = 0.72 + 0.26 * centrality + rand() * 0.16;
      if (rows > 1 && centrality < 1 && rand() < (kind === 'hills' ? 0.3 : 0.14)) continue;
      glyphs.push(
        kind === 'hills'
          ? hillGlyph(p, w * scale, h * scale)
          : mountainGlyph(p, w * scale, h * scale, (rand() - 0.5) * 0.18),
      );
    }
  }
  return glyphs;
}

export function peakGlyph(feature: GeoFeature, zoom: number): Glyph {
  const p = feature.geometry.coordinates as XY;
  const mpp = 1 / 2 ** zoom;
  const w = glyphPx('range', 1, zoom) * 1.45 * mpp;
  const g = mountainGlyph([p[0], p[1] - w * 0.3], w, w * 0.95, 0);
  return { ...g, volcano: feature.properties.id === 'orodruin' };
}
