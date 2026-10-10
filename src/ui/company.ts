/**
 * Panel «¿Dónde está cada uno?»: los personajes principales agrupados por el lugar
 * donde están (o al que van) en el instante actual, con un paso de un día atrás o
 * adelante. Tocar un lugar o una ficha centra el mapa.
 */
import type { DataBundle } from '../data/types.ts';
import { shortNameOf } from '../data/types.ts';
import type { Track } from '../data/timeline.ts';
import { whereabouts } from '../data/whereabouts.ts';
import { zoneOf } from '../data/zones.ts';
import { formatDate, formatDateShort, fromDayIndex } from '../lib/calendar.ts';
import { escapeHtml } from '../map/journeyLayer.ts';
import type { Store } from '../state/store.ts';

export interface CompanyActions {
  focusPlace(placeId: string): void;
  focusCharacter(id: string): void;
}

export function createCompany(
  el: HTMLElement,
  data: DataBundle,
  tracks: Track[],
  store: Store,
  actions: CompanyActions,
): void {
  const main = data.characters.filter((c) => c.role === 'main');
  const order = main.map((c) => c.id);
  const chars = new Map(main.map((c) => [c.id, c]));
  const places = new Map(data.places.map((p) => [p.id, p]));

  el.innerHTML = `
<div class="panel__grab" aria-hidden="true"></div>
<header class="panel__head">
  <h2 class="panel__title" id="company-title">¿Dónde está cada uno?</h2>
  <button type="button" class="icon-btn panel__close" data-act="close-panel" aria-label="Cerrar">${CLOSE}</button>
</header>
<div class="stepper" role="group" aria-label="Fecha">
  <button type="button" class="stepper__btn" data-step="-1" aria-label="Un día antes">${CHEV_L}</button>
  <output class="stepper__date"></output>
  <button type="button" class="stepper__btn" data-step="1" aria-label="Un día después">${CHEV_R}</button>
</div>
<div class="company__groups"></div>`;
  const dateOut = el.querySelector<HTMLOutputElement>('.stepper__date')!;
  const list = el.querySelector<HTMLDivElement>('.company__groups')!;

  el.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const step = target.closest<HTMLElement>('[data-step]')?.dataset.step;
    if (step) {
      const t = Math.floor(store.get().t) + 0.5 + Number(step);
      store.set({ t, playing: false });
      return;
    }
    const who = target.closest<HTMLElement>('[data-character]')?.dataset.character;
    if (who) return actions.focusCharacter(who);
    const place = target.closest<HTMLElement>('[data-place]')?.dataset.place;
    if (place) actions.focusPlace(place);
  });

  let shown = '';
  function render(): void {
    const { t, hidden } = store.get();
    const day = formatDate(fromDayIndex(Math.floor(t)));
    const groups = whereabouts(tracks, t, order);
    const key = `${day}|${JSON.stringify(groups)}|${[...hidden].join()}`;
    if (key === shown) return;
    shown = key;
    dateOut.textContent = formatDateShort(fromDayIndex(Math.floor(t)));
    dateOut.title = day;
    list.innerHTML = groups
      .map((g) => {
        const place = g.placeId ? places.get(g.placeId) : undefined;
        const zone = place ? zoneOf(place) : undefined;
        const name =
          g.kind === 'none'
            ? 'Sin posición en esta fecha'
            : g.kind === 'move'
              ? `De camino a ${place?.name ?? g.placeId ?? ''}`
              : (place?.name ?? g.placeId ?? '');
        const head =
          g.placeId && g.kind !== 'none'
            ? `<button type="button" class="group__head" data-place="${g.placeId}">`
            : `<div class="group__head">`;
        const close = g.placeId && g.kind !== 'none' ? '</button>' : '</div>';
        const people = g.characterIds
          .map((id) => {
            const c = chars.get(id)!;
            const off = hidden.has(id);
            return `<button type="button" class="person${off ? ' is-off' : ''}" data-character="${id}" ${
              g.kind === 'none' ? 'disabled' : ''
            }><span class="chip" style="--c:${c.color}" aria-hidden="true">${escapeHtml(c.initials)}</span>${escapeHtml(
              shortNameOf(c),
            )}${off ? '<span class="sr-only"> (oculto en el mapa)</span>' : ''}</button>`;
          })
          .join('');
        return `<section class="group group--${g.kind}">
  ${head}<span class="group__swatch" style="background:${zone ? `var(${zone.token})` : 'var(--ink-mute)'}" title="${
    zone ? escapeHtml(zone.name) : ''
  }"></span><span class="group__name">${escapeHtml(name)}</span><span class="group__count">${g.characterIds.length}</span>${close}
  <div class="group__people">${people}</div>
</section>`;
      })
      .join('');
  }

  store.subscribe((s, prev) => {
    if (s.t !== prev.t || s.hidden !== prev.hidden) render();
  });
  render();
}

export const CLOSE =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
export const CHEV_L =
  '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
export const CHEV_R =
  '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
