/**
 * Reproductor de la historia y controles de la hoja inferior: play/pausa con tres
 * ritmos, suceso anterior/siguiente, fecha actual, rango y el resumen del suceso.
 * Al reproducir, el tiempo avanza solo y cada suceso que se cruza se abre (y, si la
 * cámara sigue la historia, el mapa vuela hasta él).
 */
import type { DataBundle, StoryEvent } from '../data/types.ts';
import { formatDate, fromDayIndex } from '../lib/calendar.ts';
import { formatRef } from '../map/popup.ts';
import { escapeHtml } from '../map/journeyLayer.ts';
import type { Store } from '../state/store.ts';
import type { TimelineApi } from '../timeline/timeline.ts';

/** Días por segundo de cada ritmo. */
const DAYS_PER_SECOND = [1.2, 3, 8] as const;
/** En los tramos sin sucesos cercanos se avanza más deprisa. */
const QUIET_DAYS = 4;
const QUIET_BOOST = 4;

export function createPlayer(
  data: DataBundle,
  timeline: TimelineApi,
  store: Store,
  actions: Record<string, () => void>,
): void {
  const { orderedEvents: events, eventTime } = timeline;
  const times = events.map(eventTime);
  const places = new Map(data.places.map((p) => [p.id, p.name]));
  const dock = document.querySelector<HTMLElement>('.dock')!;
  const eventBtn = dock.querySelector<HTMLButtonElement>('.dock__event')!;
  const playBtn = dock.querySelector<HTMLButtonElement>('[data-act="play"]')!;
  const dayOut = dock.querySelector<HTMLOutputElement>('.player__day')!;
  const refOut = dock.querySelector<HTMLSpanElement>('.player__ref')!;
  const rangeBox = dock.querySelector<HTMLDivElement>('.player__range')!;
  const rangeLabel = dock.querySelector<HTMLSpanElement>('.player__range-label')!;
  const chipText = document.querySelector<HTMLSpanElement>('.date-chip__text')!;
  const speedBtns = [...dock.querySelectorAll<HTMLButtonElement>('[data-speed]')];
  const followBtn = document.querySelector<HTMLButtonElement>('[data-act="follow"]')!;
  const [, lastT] = timeline.span;

  document.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.dataset.speed) return store.set({ speed: Number(btn.dataset.speed) as 0 | 1 | 2 });
    const act = btn.dataset.act;
    if (!act) return;
    if (act === 'play') return togglePlay();
    if (act === 'follow') return store.set({ follow: !store.get().follow });
    if (actions[act]) return actions[act]!();
    if (/^(prev|next)-(event|day)$|^clear-range$|^view-/.test(act)) timeline.command(act);
  });

  function togglePlay(): void {
    const { playing, t } = store.get();
    // Al terminar, volver a empezar desde el primer suceso del viaje.
    if (!playing && t >= Math.min(lastT, times[times.length - 1]!) - 0.01) {
      const first = events.find((e) => e.id === 'frodo-deja-bolson-cerrado') ?? events[0]!;
      store.set({ t: eventTime(first), eventId: first.id });
    }
    store.set({ playing: !playing });
  }

  // --- Bucle de reproducción -------------------------------------------------
  let frame = 0;
  let last = 0;
  function tick(now: number): void {
    const s = store.get();
    if (!s.playing) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const next = times.findIndex((te) => te > s.t + 1e-6);
    const quiet = next < 0 || times[next]! - s.t > QUIET_DAYS;
    let t = s.t + dt * DAYS_PER_SECOND[s.speed] * (quiet ? QUIET_BOOST : 1);
    if (s.range && t > s.range[1]) t = s.range[1];
    // Sucesos cruzados en este paso: se abre el último.
    let crossed: StoryEvent | undefined;
    for (let i = Math.max(0, next); i < times.length && times[i]! <= t; i++) crossed = events[i];
    const end = t >= (s.range ? s.range[1] : lastT) || next < 0;
    store.set({
      t,
      ...(crossed ? { eventId: crossed.id } : {}),
      ...(end ? { playing: false } : {}),
    });
    if (!end) frame = requestAnimationFrame(tick);
  }

  // --- Reflejo del estado ----------------------------------------------------
  let shown = '';
  function render(): void {
    const s = store.get();
    const day = formatDate(fromDayIndex(Math.floor(s.t)));
    dayOut.textContent = day;
    chipText.textContent = day;
    playBtn.classList.toggle('is-playing', s.playing);
    playBtn.setAttribute('aria-label', s.playing ? 'Pausar' : 'Reproducir la historia');
    speedBtns.forEach((b) =>
      b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s.speed)),
    );
    followBtn.setAttribute('aria-pressed', String(s.follow));
    rangeBox.hidden = !s.range;
    if (s.range) {
      const a = formatDate(fromDayIndex(Math.floor(s.range[0])));
      const b = formatDate(fromDayIndex(Math.floor(s.range[1] - 1e-6)));
      rangeLabel.textContent = `Rango: ${a} – ${b}`;
    }

    // Suceso abierto o, si no hay, el último antes del instante actual.
    let i = events.findIndex((e) => e.id === s.eventId);
    const open = i >= 0;
    if (!open) {
      i = -1;
      while (i + 1 < times.length && times[i + 1]! <= s.t + 1e-6) i++;
    }
    const e = events[i];
    const key = `${i}|${open}`;
    if (key === shown) return;
    shown = key;
    refOut.textContent = e
      ? `Cómputo de la Comarca · ${formatRef(e.ref)}`
      : 'Cómputo de la Comarca';
    eventBtn.innerHTML = e
      ? `<span class="dock__kicker">${open ? `Suceso ${i + 1} / ${events.length}` : 'Último suceso'} · ${escapeHtml(formatRef(e.ref))}</span>
<span class="dock__title">${escapeHtml(e.title)}</span>
<span class="dock__place">${escapeHtml(places.get(e.placeId) ?? '')} · ${escapeHtml(formatDate(e.date))}</span>
<span class="dock__chev" aria-hidden="true"></span>`
      : `<span class="dock__title">Pulsa ▶ para recorrer la historia</span>`;
    eventBtn.dataset.eventId = e?.id ?? '';
  }

  // Abrir la ficha desde el resumen fija ese suceso si aún no había uno abierto.
  eventBtn.addEventListener('click', () => {
    const id = eventBtn.dataset.eventId;
    if (id && !store.get().eventId) store.set({ eventId: id });
  });

  store.subscribe((s, prev) => {
    if (s.playing && !prev.playing) {
      last = performance.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    }
    render();
  });
  render();
}
