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
