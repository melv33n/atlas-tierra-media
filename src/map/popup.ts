/** Contenido de la ficha de un lugar: nombres, tipo y eventos ocurridos allí. */
import type { Character, Place, PlaceType, SourceRef, StoryEvent } from '../data/types.ts';
import { shortNameOf } from '../data/types.ts';
import { compareDates, formatDate } from '../lib/calendar.ts';
import { escapeHtml } from './journeyLayer.ts';

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

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function formatRef(ref: SourceRef): string {
  if (ref.appendix) return `Apéndice ${ref.appendix}`;
  const book = ref.book ? `Libro ${ROMAN[ref.book]}` : '';
  return ref.chapter ? `${book}, cap. ${ref.chapter}` : book;
}

/** Texto legible sobre el color del personaje (blanco o tinta). */
export function chipInk(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#231c14' : '#ffffff';
}

export function chipHtml(c: Character): string {
  return `<span class="chip" style="--c:${c.color};--ink:${chipInk(c.color)}" title="${escapeHtml(c.name)}">${escapeHtml(c.initials)}</span>`;
}

export function placePopupHtml(
  p: Place,
  events: StoryEvent[],
  characters: Map<string, Character>,
): string {
  const alt = p.altNames?.length
    ? `<div class="pp-alt">${p.altNames.map(escapeHtml).join(' · ')}</div>`
    : '';
  const meta = [TYPE_ES[p.type], p.region]
    .filter(Boolean)
    .map((s) => escapeHtml(s!))
    .join(' · ');
  const list = events
    .slice()
    .sort((a, b) => compareDates(a.date, b.date))
    .map((e) => {
      const who = e.characterIds
        .map((id) => characters.get(id))
        .filter((c): c is Character => !!c)
        .map((c) => `${chipHtml(c)}<span class="sr-only">${escapeHtml(shortNameOf(c))}</span>`)
        .join('');
      return `<li class="pe" data-event-id="${e.id}" tabindex="0" role="button">
  <div class="pe-date">${formatDate(e.date)}</div>
  <div class="pe-title">${escapeHtml(e.title)}</div>
  ${who ? `<div class="pe-who">${who}</div>` : ''}
  <p class="pe-summary">${escapeHtml(e.summary)}</p>
  <div class="pe-ref">${formatRef(e.ref)}</div>
</li>`;
    })
    .join('');
  const evs = events.length
    ? `<ol class="pp-events" aria-label="Eventos en ${escapeHtml(p.name)}">${list}</ol>`
    : '';
  return `<div class="pp-name">${escapeHtml(p.name)}</div>${alt}<div class="pp-meta">${meta}</div>${evs}`;
}
