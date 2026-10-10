/**
 * Estado compartible en la URL: instante, suceso abierto, personajes ocultos, rango y
 * modo de cámara. Solo lo que define «qué se ve»; el resto es interfaz.
 */
export interface UrlState {
  t?: number;
  eventId?: string;
  hidden?: string[];
  range?: [number, number];
  follow?: boolean;
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const num = (s: string | null): number | undefined => {
  if (s === null || s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export function encodeUrlState(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.t !== undefined) p.set('t', s.t.toFixed(2).replace(/\.?0+$/, ''));
  if (s.eventId) p.set('e', s.eventId);
  if (s.hidden?.length) p.set('ocultos', [...s.hidden].sort().join(','));
  if (s.range) p.set('rango', s.range.map((v) => v.toFixed(1).replace(/\.0$/, '')).join('~'));
  if (s.follow === false) p.set('camara', 'libre');
  return p.toString();
}

export function decodeUrlState(query: string): UrlState {
  const p = new URLSearchParams(query);
  const out: UrlState = {};
  const t = num(p.get('t'));
  if (t !== undefined) out.t = t;
  const e = p.get('e');
  if (e && ID.test(e)) out.eventId = e;
  const h = p.get('ocultos');
  if (h) out.hidden = h.split(',').filter((id) => ID.test(id));
  const r = p
    .get('rango')
    ?.split('~')
    .map((v) => num(v));
  if (r?.length === 2 && r[0] !== undefined && r[1] !== undefined && r[0] < r[1])
    out.range = [r[0], r[1]];
  if (p.get('camara') === 'libre') out.follow = false;
  return out;
}
