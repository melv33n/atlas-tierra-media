/**
 * Estado compartido entre mapa, línea temporal y paneles. Un objeto inmutable y
 * suscriptores; sin framework (ADR 018).
 */
export interface AppState {
  /** Instante actual (índice de día con decimales). */
  t: number;
  /** Rango seleccionado en la línea temporal, o null. */
  range: [number, number] | null;
  /** Personajes ocultos. */
  hidden: ReadonlySet<string>;
  /** Evento abierto en el panel. */
  eventId: string | null;
  /** Reproducción automática de la historia y su ritmo (0 pausado … 2 rápido). */
  playing: boolean;
  speed: 0 | 1 | 2;
  /** La cámara sigue al suceso actual. */
  follow: boolean;
  /** Libros elegidos en los filtros (vacío = todos). */
  books: ReadonlySet<number>;
  /** Capas opcionales del mapa. */
  layers: Layers;
  /** Panel abierto (en el móvil, la hoja que ocupa la pantalla). */
  panel: Panel;
}

export interface Layers {
  /** Camino aún por recorrer (tenue). */
  pending: boolean;
  /** Tramos deducidos (discontinuos). */
  inferred: boolean;
  /** Nombres secundarios: aldeas, ríos menores, caminos. */
  minor: boolean;
}

export type Panel = 'none' | 'company' | 'event' | 'search' | 'filters';

export const DEFAULT_LAYERS: Layers = { pending: true, inferred: true, minor: true };

/** Estado inicial con valores por defecto para lo que no se indique. */
export function initialState(patch: Partial<AppState> & { t: number }): AppState {
  return {
    range: null,
    hidden: new Set(),
    eventId: null,
    playing: false,
    speed: 1,
    follow: true,
    books: new Set(),
    layers: DEFAULT_LAYERS,
    panel: 'none',
    ...patch,
  };
}

type Listener = (state: AppState, prev: AppState) => void;

export interface Store {
  get(): AppState;
  set(patch: Partial<AppState>): void;
  subscribe(fn: Listener): () => void;
}

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch) {
      const prev = state;
      const next = { ...state, ...patch };
      const changed = (Object.keys(patch) as (keyof AppState)[]).some((k) => prev[k] !== next[k]);
      if (!changed) return;
      state = next;
      for (const fn of listeners) fn(state, prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
