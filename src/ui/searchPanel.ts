/** Panel de búsqueda: lugares, sucesos y personajes, con pestañas por tipo. */
import type { DataBundle, StoryEvent } from '../data/types.ts';
import { search, type Hit, type HitKind } from '../data/search.ts';
import { formatDate } from '../lib/calendar.ts';
import { escapeHtml } from '../map/journeyLayer.ts';
import type { Store } from '../state/store.ts';
import { isDesktop } from './shell.ts';

export interface SearchActions {
  openPlace(placeId: string): void;
  focusCharacter(id: string): void;
}

const KINDS: { kind: HitKind | 'all'; label: string }[] = [
  { kind: 'all', label: 'Todo' },
  { kind: 'place', label: 'Lugares' },
  { kind: 'event', label: 'Sucesos' },
  { kind: 'character', label: 'Personajes' },
];
const HEADINGS: Record<HitKind, string> = {
  place: 'Lugares',
  event: 'Sucesos',
  character: 'Personajes',
};

export function createSearch(
  el: HTMLElement,
  data: DataBundle,
  eventTime: (e: StoryEvent) => number,
  store: Store,
  actions: SearchActions,
): void {
  const events = new Map(data.events.map((e) => [e.id, e]));
  const chars = new Map(data.characters.map((c) => [c.id, c]));
  el.innerHTML = `
<div class="search__bar">
  <label class="search__field">
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <span class="sr-only">Buscar</span>
    <input type="search" class="search__input" placeholder="Lugar, personaje o suceso" autocomplete="off" enterkeyhint="search" />
  </label>
  <button type="button" class="link-btn" data-act="close-panel">Cancelar</button>
</div>
<div class="search__kinds" role="tablist" aria-label="Tipo de resultado"></div>
<div class="search__results" role="listbox" aria-label="Resultados"></div>`;
  const input = el.querySelector<HTMLInputElement>('.search__input')!;
  const kindsEl = el.querySelector<HTMLDivElement>('.search__kinds')!;
  const results = el.querySelector<HTMLDivElement>('.search__results')!;
  let kind: HitKind | 'all' = 'all';
  let hits: Hit[] = [];

  const highlight = (h: Hit) =>
    h.at < 0
      ? escapeHtml(h.title)
      : `${escapeHtml(h.title.slice(0, h.at))}<mark>${escapeHtml(h.title.slice(h.at, h.at + h.len))}</mark>${escapeHtml(
          h.title.slice(h.at + h.len),
        )}`;

  function render(): void {
    const count = (k: HitKind | 'all') =>
      k === 'all' ? hits.length : hits.filter((h) => h.kind === k).length;
    kindsEl.innerHTML =
      input.value.trim().length < 2
        ? ''
        : KINDS.map(
            (k) =>
              `<button type="button" role="tab" aria-selected="${k.kind === kind}" data-kind="${k.kind}">${k.label} · ${count(k.kind)}</button>`,
          ).join('');
    if (input.value.trim().length < 2) {
      results.innerHTML = `<p class="panel__empty">Escribe al menos dos letras. Por ejemplo: <em>Moria</em>, <em>Éowyn</em> o <em>Concilio</em>.</p>`;
      return;
    }
    const shown = hits.filter((h) => kind === 'all' || h.kind === kind);
    if (!shown.length) {
      results.innerHTML = `<p class="panel__empty">Nada coincide con «${escapeHtml(input.value.trim())}».</p>`;
      return;
    }
    const sections = (['place', 'event', 'character'] as HitKind[])
      .map((k) => {
        const items = shown.filter((h) => h.kind === k);
        if (!items.length) return '';
        return `<h3 class="search__heading">${HEADINGS[k]}</h3>${items
          .map((h) => {
            const ev = h.kind === 'event' ? events.get(h.id) : undefined;
            const c = h.kind === 'character' ? chars.get(h.id) : undefined;
            const icon =
              h.kind === 'event'
                ? '<span class="hit__icon hit__icon--event" aria-hidden="true"></span>'
                : c
                  ? `<span class="chip" style="--c:${c.color}" aria-hidden="true">${escapeHtml(c.initials)}</span>`
                  : '<span class="hit__icon hit__icon--place" aria-hidden="true"></span>';
            return `<button type="button" class="hit" role="option" data-kind="${h.kind}" data-id="${h.id}">
  ${icon}<span class="hit__text"><span class="hit__title">${highlight(h)}</span><span class="hit__sub">${escapeHtml(h.sub)}</span></span>
  ${ev ? `<span class="hit__date">${formatDate(ev.date)}</span>` : ''}
</button>`;
          })
          .join('')}`;
      })
      .join('');
    results.innerHTML = sections;
  }

  input.addEventListener('input', () => {
    hits = search(data, input.value, 60);
    render();
  });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') el.querySelector<HTMLButtonElement>('.hit')?.click();
  });
  el.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const k = target.closest<HTMLElement>('[data-kind]:not(.hit)')?.dataset.kind;
    if (k) {
      kind = k as HitKind | 'all';
      return render();
    }
    const hit = target.closest<HTMLButtonElement>('.hit');
    if (!hit) return;
    const id = hit.dataset.id!;
    if (hit.dataset.kind === 'event') {
      const e = events.get(id)!;
      store.set({
        eventId: id,
        t: eventTime(e),
        playing: false,
        panel: isDesktop() ? 'none' : 'event',
      });
    } else if (hit.dataset.kind === 'place') {
      store.set({ panel: 'none' });
      actions.openPlace(id);
    } else {
      store.set({ panel: 'none' });
      actions.focusCharacter(id);
    }
  });

  store.subscribe((s, prev) => {
    if (s.panel === 'search' && prev.panel !== 'search') {
      render();
      input.focus();
      input.select();
    }
  });
  render();
}
