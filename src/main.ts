import 'leaflet/dist/leaflet.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya-sc/latin-500.css';
import './styles/main.css';
import './styles/map.css';
import './styles/timeline.css';
import { createMap } from './map/createMap.ts';
import { geo, story } from './map/data.ts';
import { createStore } from './state/store.ts';
import { createTimeline } from './timeline/timeline.ts';
import { createEventCard } from './ui/eventCard.ts';
import { toDayIndex } from './lib/calendar.ts';

const debug = new URLSearchParams(location.search).has('debug');

// Instante inicial: la tarde en que Frodo sale de Bolsón Cerrado.
const store = createStore({
  t: toDayIndex({ year: 3018, month: 9, day: 23 }) + 0.5,
  range: null,
  hidden: new Set(),
  eventId: null,
});

const timeline = createTimeline(document.getElementById('timeline')!, story, store);
const atlas = createMap(document.getElementById('map')!, geo, story, store, timeline.tracks, {
  debug,
});
createEventCard(
  document.getElementById('event-card')!,
  story,
  timeline.orderedEvents,
  timeline.eventTime,
  store,
  (e) => atlas.focusPlace(e.placeId),
);

// En modo debug se expone para inspeccionar desde la consola (y para las capturas).
if (debug) Object.assign(window, { atlas, store });
