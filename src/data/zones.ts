/**
 * Zonas geográficas para colorear la línea temporal. Agrupan el campo `region`
 * de los lugares en ocho grandes áreas. Colores validados para daltonismo en claro y
 * oscuro (ADR 019); el orden de la lista es el orden narrativo y el de la leyenda.
 */
import type { Place } from './types.ts';

export interface Zone {
  id: string;
  name: string;
  /** Token CSS con el color (definido en main.css para claro y oscuro). */
  token: string;
  regions: string[];
}

export const ZONES: Zone[] = [
  {
    id: 'comarca',
    name: 'La Comarca y Lindon',
    token: '--zone-comarca',
    regions: ['La Comarca', 'Los Gamos', 'Lindon', 'Colinas de las Torres'],
  },
  {
    id: 'eriador',
    name: 'Eriador',
    token: '--zone-eriador',
    regions: [
      'Bosque Viejo',
      'Quebradas de los Túmulos',
      'Tierra de Bree',
      'Eriador',
      'Bosque de los Trolls',
      'Dunland',
    ],
  },
  {
    id: 'nubladas',
    name: 'Montañas Nubladas y Moria',
    token: '--zone-nubladas',
    regions: ['Montañas Nubladas', 'Moria'],
  },
  { id: 'lorien', name: 'Lothlórien', token: '--zone-lorien', regions: ['Lothlórien'] },
  {
    id: 'anduin',
    name: 'Anduin y Rhovanion',
    token: '--zone-anduin',
    regions: [
      'Anduin',
      'Nen Hithoel',
      'Emyn Muil',
      'Valles del Anduin',
      'Bosque Negro',
      'Rhovanion',
    ],
  },
  {
    id: 'rohan',
    name: 'Rohan',
    token: '--zone-rohan',
    regions: ['Rohan', 'Fangorn', 'Folde Oeste', 'Folde Este', 'Montañas Blancas'],
  },
  {
    id: 'gondor',
    name: 'Gondor',
    token: '--zone-gondor',
    regions: ['Gondor', 'Lamedon', 'Lebennin', 'Belfalas', 'Anórien', 'Ithilien'],
  },
  {
    id: 'mordor',
    name: 'Mordor',
    token: '--zone-mordor',
    regions: ['Montañas de la Sombra', 'Mordor', 'Dagorlad'],
  },
];

const byRegion = new Map(ZONES.flatMap((z) => z.regions.map((r) => [r, z] as const)));

export function zoneOf(place: Pick<Place, 'region'> | undefined): Zone | undefined {
  return place?.region ? byRegion.get(place.region) : undefined;
}
