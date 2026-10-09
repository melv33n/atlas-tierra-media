import 'leaflet/dist/leaflet.css';
import './styles/main.css';
import { createMap } from './map/createMap.ts';

createMap(document.getElementById('map')!);
