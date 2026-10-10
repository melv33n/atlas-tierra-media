/**
 * Ficha del suceso: fecha, lugar, presentes, resumen propio y referencia, qué hacía
 * mientras tanto el resto, y navegación al suceso anterior o siguiente.
 */
import type { Character, DataBundle, StoryEvent } from '../data/types.ts';
import { shortNameOf } from '../data/types.ts';
import type { Track } from '../data/timeline.ts';
import { whereabouts } from '../data/whereabouts.ts';
import { zoneOf } from '../data/zones.ts';
import { formatDate } from '../lib/calendar.ts';
import type { Store } from '../state/store.ts';
import { formatRef } from '../map/popup.ts';
import { escapeHtml } from '../map/journeyLayer.ts';
import { CLOSE } from './company.ts';

export function createEventCard(
  el: HTMLElement,
  data: DataBundle,
  ordered: StoryEvent[],
  eventTime: (e: StoryEvent) => number,
  tracks: Track[],
  store: Store,
  onShow: (e: StoryEvent) => void,
): void {
  const chars = new Map(data.characters.map((c) => [c.id, c]));
  const places = new Map(data.places.map((p) => [p.id, p]));
  const order = data.characters.filter((c) => c.role === 'main').map((c) => c.id);

  function render(id: string | null): void {
    const i = ordered.findIndex((e) => e.id === id);
    const e = ordered[i];
    el.classList.toggle('has-event', !!e);
    if (!e) {
      el.innerHTML = `<div class="panel__grab" aria-hidden="true"></div>
<header class="panel__head"><h2 class="panel__title">Sucesos</h2>
<button type="button" class="icon-btn panel__close" data-act="close-panel" aria-label="Cerrar">${CLOSE}</button></header>
<p class="panel__empty">Pulsa ▶ para recorrer la historia o toca un rombo de la línea temporal para abrir un suceso.</p>`;
      return;
    }
    const place = places.get(e.placeId);
    const zone = place ? zoneOf(place) : undefined;
    const present = e.characterIds.map((cid) => chars.get(cid)).filter((c): c is Character => !!c);
    const tokens = present
      .map(
        (c) =>
          `<li class="token${c.role === 'main' ? ' token--main' : ''}"><span class="chip" style="--c:${c.color}" aria-hidden="true">${escapeHtml(
            c.initials,
          )}</span><span class="token__name">${escapeHtml(shortNameOf(c))}</span></li>`,
      )
      .join('');
    // Mientras tanto: dónde están los principales que no participan.
    const others = whereabouts(tracks, eventTime(e), order)
      .map((g) => ({
        ...g,
        characterIds: g.characterIds.filter((id) => !e.characterIds.includes(id)),
      }))
      .filter((g) => g.characterIds.length && g.kind !== 'none')
      .slice(0, 3)
      .map((g) => {
        const names = g.characterIds.map((id) => shortNameOf(chars.get(id)!)).join(', ');
        const where = places.get(g.placeId!)?.name ?? g.placeId;
        return `<li><strong>${escapeHtml(names)}</strong> ${g.kind === 'move' ? 'de camino a' : 'en'} ${escapeHtml(where ?? '')}</li>`;
      })
      .join('');
    const prev = ordered[i - 1];
    const next = ordered[i + 1];
    el.innerHTML = `
<div class="panel__grab" aria-hidden="true"></div>
<header class="panel__head">
  <span class="ec-kicker">Suceso ${i + 1} / ${ordered.length} · ${escapeHtml(formatRef(e.ref))}</span>
  <button type="button" class="icon-btn panel__close" data-act="close" aria-label="Cerrar la ficha">${CLOSE}</button>
</header>
<div class="panel__body">
  <h2 class="ec-title">${escapeHtml(e.title)}</h2>
  <div class="ec-meta">
    <span class="tag">${CAL}${formatDate(e.date)}</span>
    <button type="button" class="tag tag--btn" data-act="place">${PIN}${escapeHtml(place?.name ?? e.placeId)}</button>
    ${zone ? `<span class="tag tag--zone" style="--z:var(${zone.token})"><span class="tag__swatch"></span>${escapeHtml(zone.name)}</span>` : ''}
  </div>
  <p class="ec-summary">${escapeHtml(e.summary)}</p>
  ${tokens ? `<h3 class="ec-sub">Presentes · ${present.length}</h3><ul class="ec-who">${tokens}</ul>` : ''}
  ${others ? `<h3 class="ec-sub">Mientras tanto</h3><ul class="ec-others">${others}</ul>` : ''}
</div>
<div class="ec-nav">
  <button type="button" class="ec-step" data-act="prev" ${prev ? '' : 'disabled'}>
    <span class="ec-step__dir">‹ Anterior</span><span class="ec-step__title">${prev ? escapeHtml(prev.title) : '—'}</span>
  </button>
  <button type="button" class="ec-step ec-step--next" data-act="next" ${next ? '' : 'disabled'}>
    <span class="ec-step__dir">Siguiente ›</span><span class="ec-step__title">${next ? escapeHtml(next.title) : '—'}</span>
  </button>
</div>`;
  }

  el.addEventListener('click', (ev) => {
    const act = (ev.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.act;
    const { eventId } = store.get();
    const i = ordered.findIndex((e) => e.id === eventId);
    const go = (e: StoryEvent | undefined) =>
      e && store.set({ eventId: e.id, t: eventTime(e), playing: false });
    if (act === 'close')
      store.set({
        eventId: null,
        panel: store.get().panel === 'event' ? 'none' : store.get().panel,
      });
    else if (act === 'prev') go(ordered[i - 1]);
    else if (act === 'next') go(ordered[i + 1]);
    else if (act === 'place' && ordered[i]) onShow(ordered[i]!);
  });

  store.subscribe((s, prev) => {
    if (s.eventId === prev.eventId) return;
    render(s.eventId);
    const e = ordered.find((x) => x.id === s.eventId);
    if (e && s.follow) onShow(e);
  });
  render(store.get().eventId);
}

const CAL =
  '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const PIN =
  '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
