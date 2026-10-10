/**
 * Filtros y capas: libros (fijan el rango de fechas), personajes visibles, capas
 * opcionales del mapa y la leyenda. También pinta el selector rápido de libros de la
 * barra superior en escritorio.
 */
import { BOOKS, booksRange } from '../data/books.ts';
import type { DataBundle } from '../data/types.ts';
import { shortNameOf } from '../data/types.ts';
import { ZONES } from '../data/zones.ts';
import { formatDate, fromDayIndex } from '../lib/calendar.ts';
import { escapeHtml } from '../map/journeyLayer.ts';
import type { Layers, Store } from '../state/store.ts';
import { CLOSE } from './company.ts';

const LAYERS: { key: keyof Layers; label: string; hint: string }[] = [
  { key: 'pending', label: 'Camino por recorrer', hint: 'Trazo tenue del resto del viaje' },
  { key: 'inferred', label: 'Tramos deducidos', hint: 'Discontinuos: fecha o ruta inferida' },
  { key: 'minor', label: 'Nombres secundarios', hint: 'Aldeas, colinas, ríos menores y caminos' },
];

export function createFilters(
  el: HTMLElement,
  quick: HTMLElement,
  data: DataBundle,
  store: Store,
): void {
  const main = data.characters.filter((c) => c.role === 'main');

  el.innerHTML = `
<div class="panel__grab" aria-hidden="true"></div>
<header class="panel__head">
  <h2 class="panel__title" id="filters-title">Filtros y capas</h2>
  <button type="button" class="link-btn" data-act="reset-filters">Restablecer</button>
  <button type="button" class="icon-btn panel__close" data-act="close-panel" aria-label="Cerrar">${CLOSE}</button>
</header>
<div class="panel__body">
  <h3 class="ec-sub">Libros</h3>
  <div class="books" role="group" aria-label="Libros">${BOOKS.map(
    (b) =>
      `<button type="button" class="book-btn" data-book="${b.book}" aria-pressed="false">${b.label}</button>`,
  ).join('')}</div>
  <p class="filters__range"></p>
  <h3 class="ec-sub">Personajes en el mapa</h3>
  <div class="people" role="group" aria-label="Personajes">${main
    .map(
      (c) =>
        `<button type="button" class="people__btn" data-id="${c.id}" aria-pressed="true"><span class="chip" style="--c:${c.color}" aria-hidden="true">${escapeHtml(
          c.initials,
        )}</span><span>${escapeHtml(shortNameOf(c))}</span></button>`,
    )
    .join('')}</div>
  <div class="people__all"><button type="button" class="link-btn" data-all="1">Mostrar todos</button><button type="button" class="link-btn" data-all="0">Ocultar todos</button></div>
  <h3 class="ec-sub">Capas</h3>
  ${LAYERS.map(
    (
      l,
    ) => `<button type="button" class="switch" role="switch" data-layer="${l.key}" aria-checked="true">
  <span class="switch__text"><span class="switch__label">${l.label}</span><span class="switch__hint">${l.hint}</span></span>
  <span class="switch__track" aria-hidden="true"><span class="switch__knob"></span></span>
</button>`,
  ).join('')}
  <h3 class="ec-sub">Leyenda</h3>
  <ul class="legend-zones">${ZONES.map(
    (z) =>
      `<li><span class="legend-zones__sw" style="background:var(${z.token})"></span>${escapeHtml(z.name)}</li>`,
  ).join('')}</ul>
  <p class="legend-lines"><span class="key-line"></span> fecha y ruta canónicas <span class="key-line key-line--dashed"></span> inferidas</p>
</div>
<div class="panel__foot"><button type="button" class="btn-gold" data-act="close-panel">Ver el mapa</button></div>`;

  quick.innerHTML = `<button type="button" data-book="0" aria-pressed="true">Todos</button>${BOOKS.map(
    (b) => `<button type="button" data-book="${b.book}" aria-pressed="false">${b.label}</button>`,
  ).join('')}`;

  const setBooks = (books: Set<number>) => store.set({ books, range: booksRange(books) });

  const onClick = (ev: Event, single: boolean) => {
    const target = ev.target as HTMLElement;
    const book = target.closest<HTMLElement>('[data-book]')?.dataset.book;
    if (book !== undefined) {
      const n = Number(book);
      const cur = new Set(store.get().books);
      if (n === 0) return setBooks(new Set());
      if (single) return setBooks(cur.size === 1 && cur.has(n) ? new Set() : new Set([n]));
      if (cur.has(n)) cur.delete(n);
      else cur.add(n);
      return setBooks(cur);
    }
    const id = target.closest<HTMLElement>('[data-id]')?.dataset.id;
    if (id) {
      const hidden = new Set(store.get().hidden);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return store.set({ hidden });
    }
    const all = target.closest<HTMLElement>('[data-all]')?.dataset.all;
    if (all !== undefined)
      return store.set({ hidden: all === '1' ? new Set() : new Set(main.map((c) => c.id)) });
    const layer = target.closest<HTMLElement>('[data-layer]')?.dataset.layer as
      keyof Layers | undefined;
    if (layer)
      return store.set({ layers: { ...store.get().layers, [layer]: !store.get().layers[layer] } });
    if (target.closest('[data-act="reset-filters"]'))
      store.set({
        books: new Set(),
        range: null,
        hidden: new Set(),
        layers: { pending: true, inferred: true, minor: true },
      });
  };
  el.addEventListener('click', (ev) => onClick(ev, false));
  quick.addEventListener('click', (ev) => onClick(ev, true));

  function render(): void {
    const { books, hidden, layers, range } = store.get();
    for (const b of el.querySelectorAll<HTMLElement>('[data-book]'))
      b.setAttribute('aria-pressed', String(books.has(Number(b.dataset.book))));
    for (const b of quick.querySelectorAll<HTMLElement>('[data-book]')) {
      const n = Number(b.dataset.book);
      b.setAttribute(
        'aria-pressed',
        String(n === 0 ? books.size === 0 : books.size === 1 && books.has(n)),
      );
    }
    for (const b of el.querySelectorAll<HTMLElement>('[data-id]'))
      b.setAttribute('aria-pressed', String(!hidden.has(b.dataset.id!)));
    for (const b of el.querySelectorAll<HTMLElement>('[data-layer]'))
      b.setAttribute('aria-checked', String(layers[b.dataset.layer as keyof Layers]));
    const rangeP = el.querySelector<HTMLParagraphElement>('.filters__range')!;
    rangeP.textContent = range
      ? `Del ${formatDate(fromDayIndex(Math.floor(range[0])))} al ${formatDate(fromDayIndex(Math.floor(range[1] - 1e-6)))}. También puedes arrastrar sobre el eje de la línea temporal.`
      : 'Toda la historia. Elige libros o arrastra sobre el eje de la línea temporal para acotar fechas.';
  }
  store.subscribe((s, prev) => {
    if (
      s.books !== prev.books ||
      s.hidden !== prev.hidden ||
      s.layers !== prev.layers ||
      s.range !== prev.range
    )
      render();
  });
  render();
}
