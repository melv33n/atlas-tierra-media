/**
 * Panel de evento: fecha, lugar, personajes presentes, resumen y referencia, con
 * navegación al evento anterior o siguiente en orden cronológico.
 */
import type { Character, DataBundle, StoryEvent } from '../data/types.ts';
import { shortNameOf } from '../data/types.ts';
import { formatDate } from '../lib/calendar.ts';
import type { Store } from '../state/store.ts';
import { chipHtml, formatRef } from '../map/popup.ts';
import { escapeHtml } from '../map/journeyLayer.ts';

export function createEventCard(
  el: HTMLElement,
  data: DataBundle,
  ordered: StoryEvent[],
  eventTime: (e: StoryEvent) => number,
  store: Store,
  onShow: (e: StoryEvent) => void,
): void {
  const chars = new Map(data.characters.map((c) => [c.id, c]));
  const places = new Map(data.places.map((p) => [p.id, p]));

  function render(id: string | null): void {
    const i = ordered.findIndex((e) => e.id === id);
    const e = ordered[i];
    el.hidden = !e;
    if (!e) return;
    const place = places.get(e.placeId);
    const who = e.characterIds
      .map((cid) => chars.get(cid))
      .filter((c): c is Character => !!c)
      .map((c) => `<li>${chipHtml(c)} ${escapeHtml(shortNameOf(c))}</li>`)
      .join('');
    el.innerHTML = `
<div class="ec-head">
  <div class="ec-date">${formatDate(e.date)}</div>
  <button type="button" class="ec-close" data-act="close" aria-label="Cerrar">×</button>
</div>
<h2 class="ec-title">${escapeHtml(e.title)}</h2>
<button type="button" class="ec-place" data-act="place">${escapeHtml(place?.name ?? e.placeId)}</button>
<p class="ec-summary">${escapeHtml(e.summary)}</p>
${who ? `<ul class="ec-who" aria-label="Personajes presentes">${who}</ul>` : ''}
<div class="ec-foot">
  <span class="ec-ref">${formatRef(e.ref)}</span>
  <span class="ec-nav">
    <button type="button" data-act="prev" ${i === 0 ? 'disabled' : ''} aria-label="Evento anterior">‹ Anterior</button>
    <span class="ec-count">${i + 1}/${ordered.length}</span>
    <button type="button" data-act="next" ${i === ordered.length - 1 ? 'disabled' : ''} aria-label="Evento siguiente">Siguiente ›</button>
  </span>
</div>`;
  }

  el.addEventListener('click', (ev) => {
    const act = (ev.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.act;
    const { eventId } = store.get();
    const i = ordered.findIndex((e) => e.id === eventId);
    const go = (e: StoryEvent | undefined) => e && store.set({ eventId: e.id, t: eventTime(e) });
    if (act === 'close') store.set({ eventId: null });
    else if (act === 'prev') go(ordered[i - 1]);
    else if (act === 'next') go(ordered[i + 1]);
    else if (act === 'place' && ordered[i]) onShow(ordered[i]!);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && store.get().eventId) store.set({ eventId: null });
  });

  store.subscribe((s, prev) => {
    if (s.eventId === prev.eventId) return;
    render(s.eventId);
    const e = ordered.find((x) => x.id === s.eventId);
    if (e) onShow(e);
  });
  render(store.get().eventId);
}
