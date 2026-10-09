/** Leyenda de personajes con interruptores para mostrar u ocultar sus rutas. */
import L from 'leaflet';
import { shortNameOf, type Character } from '../data/types.ts';
import { escapeHtml } from './journeyLayer.ts';
import type { Store } from '../state/store.ts';

export function addLegend(map: L.Map, characters: Character[], store: Store): void {
  const main = characters.filter((c) => c.role === 'main');
  const Legend = L.Control.extend({
    onAdd() {
      const el = L.DomUtil.create('details', 'legend');
      // Abierta en escritorio, plegada en móvil.
      if (window.matchMedia('(min-width: 720px)').matches) el.setAttribute('open', '');
      el.innerHTML = `<summary>Personajes</summary>
<ul class="legend__list">${main
        .map(
          (c) => `<li><label class="legend__item">
  <input type="checkbox" checked data-id="${c.id}" />
  <span class="chip" style="--c:${c.color}">${escapeHtml(c.initials)}</span>
  <span class="legend__name">${escapeHtml(shortNameOf(c))}</span>
</label></li>`,
        )
        .join('')}</ul>
<div class="legend__actions">
  <button type="button" data-all="1">Todos</button>
  <button type="button" data-all="0">Ninguno</button>
</div>
<p class="legend__key"><span class="key-line"></span> fecha canónica <span class="key-line key-line--dashed"></span> inferida</p>`;
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
      el.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        const id = input.dataset.id;
        if (!id) return;
        const hidden = new Set(store.get().hidden);
        if (input.checked) hidden.delete(id);
        else hidden.add(id);
        store.set({ hidden });
      });
      el.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;
        store.set({ hidden: btn.dataset.all === '1' ? new Set() : new Set(main.map((c) => c.id)) });
      });
      // Reflejar cambios hechos desde la línea temporal.
      store.subscribe((s, prev) => {
        if (s.hidden === prev.hidden) return;
        el.querySelectorAll<HTMLInputElement>('input[data-id]').forEach((input) => {
          input.checked = !s.hidden.has(input.dataset.id!);
        });
      });
      return el;
    },
  });
  new Legend({ position: 'topright' }).addTo(map);
}
