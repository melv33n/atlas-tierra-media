import 'leaflet/dist/leaflet.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-500-italic.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import './styles/main.css';
import './styles/map.css';
import './styles/timeline.css';
import './styles/app.css';
import { createMap } from './map/createMap.ts';
import { geo, story } from './map/data.ts';
import { createStore, initialState } from './state/store.ts';
import { decodeUrlState, encodeUrlState } from './state/url.ts';
import { createTimeline } from './timeline/timeline.ts';
import { createEventCard } from './ui/eventCard.ts';
import { createShell, isDesktop } from './ui/shell.ts';
import { createPlayer } from './ui/player.ts';
import { createCompany } from './ui/company.ts';
import { createSearch } from './ui/searchPanel.ts';
import { createFilters } from './ui/filters.ts';
import { booksRange } from './data/books.ts';
import { toDayIndex } from './lib/calendar.ts';

const debug = new URLSearchParams(location.search).has('debug');
const fromUrl = decodeUrlState(location.search);
const mainIds = new Set(story.characters.filter((c) => c.role === 'main').map((c) => c.id));

// Instante inicial: la tarde en que Frodo sale de Bolsón Cerrado (o lo que diga la URL).
const store = createStore(
  initialState({
    t: fromUrl.t ?? toDayIndex({ year: 3018, month: 9, day: 23 }) + 0.5,
    range: fromUrl.range ?? null,
    hidden: new Set((fromUrl.hidden ?? []).filter((id) => mainIds.has(id))),
    eventId: story.events.some((e) => e.id === fromUrl.eventId) ? fromUrl.eventId! : null,
    follow: fromUrl.follow ?? true,
  }),
);

const shell = createShell(store);
const timeline = createTimeline(document.getElementById('timeline')!, story, store);
const atlas = createMap(document.getElementById('map')!, geo, story, store, timeline.tracks, {
  debug,
  eventTime: timeline.eventTime,
  insets: shell.insets,
});

/** Personaje sin ficha en el mapa (secundario o fuera de su ruta): su suceso más cercano. */
const focusCharacter = (id: string) => {
  if (atlas.focusCharacter(id)) return;
  const { t } = store.get();
  const near = timeline.orderedEvents
    .filter((e) => e.characterIds.includes(id))
    .sort((a, b) => Math.abs(timeline.eventTime(a) - t) - Math.abs(timeline.eventTime(b) - t))[0];
  if (near) store.set({ eventId: near.id, t: timeline.eventTime(near), playing: false });
};

createEventCard(
  document.getElementById('event-card')!,
  story,
  timeline.orderedEvents,
  timeline.eventTime,
  timeline.tracks,
  store,
  (e) => atlas.focusPlace(e.placeId),
);
createCompany(document.getElementById('company')!, story, timeline.tracks, store, {
  focusPlace: atlas.focusPlace,
  focusCharacter,
});
createSearch(document.getElementById('search')!, story, timeline.eventTime, store, {
  openPlace: atlas.openPlace,
  focusCharacter,
});
createFilters(
  document.getElementById('filters')!,
  document.querySelector<HTMLElement>('.books-quick')!,
  story,
  store,
);

async function share(): Promise<void> {
  const url = location.href;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: document.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    shell.toast('Enlace copiado: abre el atlas en esta misma vista');
  } catch {
    shell.toast('No se pudo copiar; usa la dirección de la barra del navegador');
  }
}

createPlayer(story, timeline, store, {
  share: () => void share(),
  home: () => atlas.home(),
  'zoom-in': () => atlas.map.zoomIn(0.5),
  'zoom-out': () => atlas.map.zoomOut(0.5),
});

// Al abrir una hoja en el móvil cambia el hueco libre: recolocar el suceso abierto.
store.subscribe((s, prev) => {
  if (s.panel === prev.panel || isDesktop() || s.panel !== 'event' || !s.eventId) return;
  const e = story.events.find((x) => x.id === s.eventId);
  if (e) requestAnimationFrame(() => atlas.focusPlace(e.placeId));
});

// Elegir rango a mano (en el eje) desmarca los libros si ya no coinciden.
store.subscribe((s, prev) => {
  if (s.range === prev.range || s.books === prev.books || !s.books.size) return;
  const r = booksRange(s.books);
  if (!r || !s.range || r[0] !== s.range[0] || r[1] !== s.range[1]) store.set({ books: new Set() });
});

// Estado → URL (sin llenar el historial).
let urlTimer = 0;
store.subscribe((s, prev) => {
  if (
    s.t === prev.t &&
    s.eventId === prev.eventId &&
    s.hidden === prev.hidden &&
    s.range === prev.range &&
    s.follow === prev.follow
  )
    return;
  clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    const st = store.get();
    const q = encodeUrlState({
      t: st.t,
      eventId: st.eventId ?? undefined,
      hidden: [...st.hidden],
      range: st.range ?? undefined,
      follow: st.follow,
    });
    const keep = debug ? (q ? `debug&${q}` : 'debug') : q;
    history.replaceState(null, '', `${location.pathname}${keep ? `?${keep}` : ''}${location.hash}`);
  }, 400);
});

// Si la URL abre un suceso, se centra en él.
const opened = story.events.find((e) => e.id === store.get().eventId);
if (opened) atlas.focusPlace(opened.placeId);

// En modo debug se expone para inspeccionar desde la consola (y para las capturas).
if (debug) Object.assign(window, { atlas, store });
