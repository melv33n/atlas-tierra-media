/** Carga de los datos del mapa (empaquetados por Vite: funcionan también en el build single-file). */
import coastline from '../../data/geo/coastline.geojson?raw';
import mountains from '../../data/geo/mountains.geojson?raw';
import rivers from '../../data/geo/rivers.geojson?raw';
import forests from '../../data/geo/forests.geojson?raw';
import roads from '../../data/geo/roads.geojson?raw';
import regions from '../../data/geo/regions.geojson?raw';
import placesJson from '../../data/places.json';
import charactersJson from '../../data/characters.json';
import eventsJson from '../../data/events.json';
import journeysJson from '../../data/journeys.json';
import routesJson from '../../data/routes.json';
import type { GeoCollection, GeoData } from '../data/geo.ts';
import type { DataBundle, Place } from '../data/types.ts';

const parse = (raw: string) => JSON.parse(raw) as GeoCollection;

export const geo: GeoData = {
  coastline: parse(coastline),
  mountains: parse(mountains),
  rivers: parse(rivers),
  forests: parse(forests),
  roads: parse(roads),
  regions: parse(regions),
};

export const places = placesJson as Place[];

export const story: DataBundle = {
  places,
  characters: charactersJson as DataBundle['characters'],
  events: eventsJson as DataBundle['events'],
  journeys: journeysJson as DataBundle['journeys'],
  routes: routesJson as DataBundle['routes'],
};
