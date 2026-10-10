/**
 * Armazón de la interfaz: qué panel está abierto (en el móvil, la hoja que ocupa la
 * pantalla), pestañas, atajos de teclado y el hueco libre del mapa entre paneles.
 */
import type { Panel, Store } from '../state/store.ts';

export const DESKTOP = '(min-width: 900px)';
export const isDesktop = (): boolean => window.matchMedia(DESKTOP).matches;

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function createShell(store: Store): { insets(): Insets; toast(msg: string): void } {
  const body = document.body;
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('.tabs [data-tab]')];
  const toastEl = document.querySelector<HTMLDivElement>('.toast')!;
  let lastOpener: HTMLElement | null = null;

  const open = (panel: Panel) => store.set({ panel });

  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const opener = target.closest<HTMLElement>('[data-panel-open]');
    if (opener) {
      lastOpener = opener;
      const panel = opener.dataset.panelOpen as Panel;
      open(store.get().panel === panel && panel !== 'event' ? 'none' : panel);
      return;
    }
    const tab = target.closest<HTMLButtonElement>('.tabs [data-tab]');
    if (tab) open(tab.dataset.tab as Panel);
    if (target.closest('[data-act="close-panel"]')) open('none');
  });

  document.addEventListener('keydown', (ev) => {
    const typing = (ev.target as HTMLElement).closest('input, textarea, select');
    if (ev.key === 'Escape' && store.get().panel !== 'none') {
      open('none');
      lastOpener?.focus();
    } else if (ev.key === '/' && !typing) {
      ev.preventDefault();
      open('search');
    } else if (ev.key === ' ' && !typing && !(ev.target as HTMLElement).closest('button')) {
      ev.preventDefault();
      store.set({ playing: !store.get().playing });
    }
  });

  const PANEL_EL: Record<Exclude<Panel, 'none'>, string> = {
    company: '#company',
    event: '#event-card',
    search: '#search',
    filters: '#filters',
  };
  const sync = () => {
    const { panel } = store.get();
    body.dataset.panel = panel;
    for (const [name, sel] of Object.entries(PANEL_EL))
      document.querySelector(sel)?.classList.toggle('is-open', name === panel);
    for (const t of tabs) {
      if (t.dataset.tab === panel) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    }
  };
  store.subscribe((s, prev) => {
    if (s.panel !== prev.panel) sync();
  });
  sync();

  /** Zona del mapa que no tapan los paneles (para centrar lo que se enfoca). */
  function insets(): Insets {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el || el.hidden || getComputedStyle(el).display === 'none') return null;
      const r = el.getBoundingClientRect();
      return r.width && r.height ? r : null;
    };
    const top = rect('.hud-top')?.bottom ?? 0;
    const dock = rect('.dock');
    const panel = !isDesktop() && store.get().panel !== 'none' ? rect('.panel.is-open') : null;
    const bottom = vh - Math.min(dock?.top ?? vh, panel?.top ?? vh);
    if (!isDesktop()) return { top, right: 0, bottom, left: 0 };
    const company = rect('.panel--company');
    const event = store.get().eventId ? rect('.panel--event') : null;
    return {
      top,
      bottom,
      left: company ? company.right : 0,
      right: event ? vw - event.left : 0,
    };
  }

  // Altura de la hoja inferior: la usan el CSS (controles de cámara) y el encuadre.
  const dock = document.querySelector<HTMLElement>('.dock')!;
  new ResizeObserver(() => body.style.setProperty('--dock-h', `${dock.offsetHeight}px`)).observe(
    dock,
  );

  let toastTimer = 0;
  function toast(msg: string): void {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toastEl.hidden = true), 2400);
  }

  return { insets, toast };
}
