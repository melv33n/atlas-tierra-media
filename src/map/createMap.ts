import L from 'leaflet';
import type { GeoData } from '../data/geo.ts';
import { isLine, isPoint, isPolygon } from '../data/geo.ts';
import type { DataBundle, XY } from '../data/types.ts';
import { centroid, pointAt } from '../lib/geometry.ts';
import { toLatLng } from '../lib/coords.ts';
import { toDayIndex } from '../lib/calendar.ts';
import { addBaseLayers, createPanes } from './baseLayers.ts';
import { enableDebug } from './debug.ts';
import { LabelLayer, screenAngle, type LabelKind } from './labels.ts';
import { PlaceLayer } from './places.ts';
import { ReliefLayer } from './relief.ts';
import { injectPatterns } from './patterns.ts';
import { JourneyLayer } from './journeyLayer.ts';
import { addLegend } from './legend.ts';
import { CharacterMarkers } from './markers.ts';
import type { Store } from '../state/store.ts';
import type { Track } from '../data/timeline.ts';
import { shapeOf } from './shapes.ts';

/** Zona con contenido (el resto del lienzo es margen): encuadre inicial. */
const HOME: [XY, XY] = [
  [40, 120],
  [1780, 1460],
];

/** Centro del núcleo narrativo (Eriador–Mordor). */
const CORE: XY = [760, 860];

export interface AtlasMap {
  map: L.Map;
  journeys: JourneyLayer;
  /** Centra el mapa en un lugar (sin alejar si ya está más cerca). */
  focusPlace(placeId: string): void;
}

/** Mapa no geográfico: 1 unidad = 1 milla; [lat, lng] = [y, x]. */
export function createMap(
  el: HTMLElement,
  geo: GeoData,
  story: DataBundle,
  store: Store,
  tracks: Track[],
  opts: { debug?: boolean; eventTime?: (e: DataBundle['events'][number]) => number } = {},
): AtlasMap {
  injectPatterns();
  const map = L.map(el, {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 4,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 90,
    maxBounds: L.latLngBounds(toLatLng([-250, -150]), toLatLng([2250, 1650])),
    maxBoundsViscosity: 0.8,
    attributionControl: false,
    zoomControl: true,
  });
  fitHome(map);

  const renderers = createPanes(map);
  addBaseLayers(map, geo, renderers);
  new ReliefLayer(map, geo.mountains, renderers.relief);
  const { places } = story;
  const journeys = new JourneyLayer(map, story, renderers.routes);
  addLegend(map, story.characters, store);
  map.createPane('characters').style.zIndex = '660';
  const markers = new CharacterMarkers(map, story, tracks, 'characters');
  const placeLayer = new PlaceLayer(map, places, renderers.places, story.events, story.characters);

  const labels = new LabelLayer(map, 'labels');
  labels.setObstacles(() => placeLayer.visiblePoints());
  addGeoLabels(labels, geo, new Set(places.map((p) => p.name)));
  for (const p of places) {
    labels.add({
      id: `place:${p.id}`,
      text: p.name,
      at: p.coords,
      kind: 'place',
      rank: p.zoomMin <= -2 ? 1 : p.zoomMin <= 0 ? 2 : 3,
      minZoom: p.zoomMin,
      variant: p.type,
    });
  }
  labels.mount();
  // Las medidas cambian cuando llegan las fuentes autoalojadas.
  void document.fonts?.ready.then(() => labels.measure());

  if (opts.debug) enableDebug(map, renderers.grid);

  // Estado → mapa.
  const sync = () => {
    const { t, range, hidden } = store.get();
    journeys.setHidden(hidden);
    journeys.setTime(t, range);
    markers.update(t, hidden);
  };
  store.subscribe((s, prev) => {
    if (s.t !== prev.t || s.range !== prev.range || s.hidden !== prev.hidden) sync();
  });
  sync();

  // Clic en un evento de la ficha de un lugar → abrir el panel del evento.
  el.addEventListener('click', (ev) => {
    const li = (ev.target as HTMLElement).closest<HTMLElement>('[data-event-id]');
    if (!li) return;
    const e = story.events.find((x) => x.id === li.dataset.eventId);
    if (e) store.set({ eventId: e.id, t: opts.eventTime?.(e) ?? toDayIndex(e.date) + 0.5 });
  });

  const coords = new Map(places.map((p) => [p.id, p]));
  const focusPlace = (placeId: string) => {
    const p = coords.get(placeId);
    if (!p) return;
    const zoom = Math.max(map.getZoom(), Math.min(2, p.zoomMin + 0.5));
    // En pantallas estrechas el panel del evento ocupa la mitad inferior: el lugar
    // se coloca en la mitad de arriba.
    const shift = map.getSize().x < 600 ? map.getSize().y * 0.22 : 0;
    const target = map.unproject(map.project(toLatLng(p.coords), zoom).add([0, shift]), zoom);
    map.flyTo(target, zoom, { duration: 0.8 });
  };
  return { map, journeys, focusPlace };
}

/**
 * Encuadre inicial: a medio camino entre «que quepa todo» y «que llene la
 * pantalla». En escritorio apenas cambia; en un móvil vertical evita un mapa
 * diminuto en mitad de la pantalla.
 */
function fitHome(map: L.Map): void {
  const size = map.getSize();
  const [[x0, y0], [x1, y1]] = HOME;
  const contain = Math.log2(Math.min(size.x / (x1 - x0), size.y / (y1 - y0)));
  const cover = Math.log2(Math.max(size.x / (x1 - x0), size.y / (y1 - y0)));
  const zoom = Math.floor(((contain + cover) / 2) * 4) / 4;
  map.setView(toLatLng(CORE), zoom);
}

/** `placeNames`: si un lugar ya se llama igual, la etiqueta la pone el lugar. */
function addGeoLabels(labels: LabelLayer, geo: GeoData, placeNames: Set<string>): void {
  const all = [
    ...geo.regions.features,
    ...geo.mountains.features,
    ...geo.rivers.features,
    ...geo.forests.features,
    ...geo.coastline.features,
    ...geo.roads.features,
  ];
  for (const f of all) {
    const { id, name, kind, rank = 2, labelZoom, labelAt = 0.5 } = f.properties;
    if (!name || labelZoom === undefined || placeNames.has(name)) continue;
    let at: XY;
    let angle = 0;
    let labelKind: LabelKind;
    if (isPoint(f)) {
      at = f.geometry.coordinates;
      labelKind = kind === 'peak' ? 'peak' : 'region';
      if (kind === 'peak') at = [at[0], at[1]];
    } else if (isLine(f)) {
      const s = pointAt(shapeOf(f), labelAt);
      at = s.point;
      angle = screenAngle(s.tangent);
      // Las cordilleras se rotulan junto a la banda de glifos, no encima.
      if (kind === 'range' || kind === 'hills') {
        const off = (f.properties.width ?? 20) / 2 + 12;
        const n: XY = [s.tangent[1], -s.tangent[0]];
        const side = n[1] < 0 || (n[1] === 0 && n[0] > 0) ? 1 : -1; // preferir debajo
        at = [at[0] + n[0] * off * side, at[1] + n[1] * off * side];
      }
      labelKind = kind === 'river' ? 'river' : kind === 'road' ? 'road' : 'range';
    } else if (isPolygon(f)) {
      at = centroid(f.geometry.coordinates[0]!);
      labelKind =
        kind === 'lake' ? 'lake' : kind === 'land' || kind === 'island' ? 'region' : 'forest';
      if (kind === 'border') continue;
    } else continue;
    labels.add({
      id: `${kind}:${id}`,
      text: name,
      at,
      kind: labelKind,
      rank,
      minZoom: labelZoom,
      angle,
    });
  }
}
