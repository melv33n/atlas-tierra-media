import 'leaflet/dist/leaflet.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya-sc/latin-500.css';
import './styles/main.css';
import './styles/map.css';
import { createMap } from './map/createMap.ts';
import { geo, places } from './map/data.ts';

const debug = new URLSearchParams(location.search).has('debug');
const atlas = createMap(document.getElementById('map')!, geo, places, { debug });
// En modo debug se expone para inspeccionar desde la consola (y para las capturas).
if (debug) Object.assign(window, { atlas });
