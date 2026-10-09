/**
 * Línea temporal de calles (swimlanes): una fila por personaje principal con sus
 * paradas y viajes coloreados por zona, marcas de eventos, encuentros y el cursor
 * de fecha. Zoom y desplazamiento con rueda/arrastre/pellizco; arrastrar sobre el
 * eje selecciona un rango que filtra el mapa.
 */
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { brushX, type BrushBehavior, type D3BrushEvent } from 'd3-brush';
import type { Character, DataBundle, StoryEvent } from '../data/types.ts';
import { shortNameOf } from '../data/types.ts';
import {
  buildTracks,
  convergences,
  eventInstant,
  trackSegments,
  type Convergence,
  type Segment,
  type Track,
} from '../data/timeline.ts';
import { formatDate, fromDayIndex, toDayIndex } from '../lib/calendar.ts';
import type { Store } from '../state/store.ts';
import { chipInk } from '../map/popup.ts';
import { escapeHtml } from '../map/journeyLayer.ts';
import { timeTicks } from './ticks.ts';
import { ZONES } from '../data/zones.ts';

type SVG = Selection<SVGSVGElement, unknown, null, undefined>;
type G = Selection<SVGGElement, unknown, null, undefined>;

const AXIS_H = 34;
const EVENTS_H = 18;
const PAD_R = 10;

export interface TimelineApi {
  /** Instante de un evento (mediodía de su fecha). */
  eventTime(e: StoryEvent): number;
  /** Eventos ordenados cronológicamente. */
  orderedEvents: StoryEvent[];
  tracks: Track[];
}

export function createTimeline(root: HTMLElement, data: DataBundle, store: Store): TimelineApi {
  const main = data.characters.filter((c) => c.role === 'main');
  const tracks = buildTracks(data);
  const trackOf = new Map(tracks.map((t) => [t.characterId, t]));
  const segments = main.flatMap((c) => {
    const t = trackOf.get(c.id);
    return t ? trackSegments(t, data) : [];
  });
  const meets = convergences(tracks);
  const placeName = new Map(data.places.map((p) => [p.id, p.name]));
  const chars = new Map(data.characters.map((c) => [c.id, c]));
  const laneOf = new Map(main.map((c, i) => [c.id, i]));
  const coordsOf = new Map(data.places.map((p) => [p.id, p.coords]));
  const instants = new Map(data.events.map((e) => [e.id, eventInstant(e, tracks, coordsOf)]));
  const eventTime = (e: StoryEvent): number => instants.get(e.id)!;
  const orderedEvents = data.events.slice().sort((a, b) => eventTime(a) - eventTime(b));

  // Dominio completo (con margen) y ventana inicial: el viaje de 3018–3019.
  const allStart = Math.min(...tracks.map((t) => t.start), ...orderedEvents.map(eventTime)) - 20;
  const allEnd = Math.max(...tracks.map((t) => t.end), ...orderedEvents.map(eventTime)) + 20;
  const focus: [number, number] = [
    toDayIndex({ year: 3018, month: 9, day: 15 }),
    toDayIndex({ year: 3019, month: 3, day: 5 }),
  ];

  // --- Estructura DOM -------------------------------------------------------
  root.innerHTML = `
<div class="tl-bar">
  <div class="tl-nav" role="group" aria-label="Navegar por la línea temporal">
    <button type="button" class="tl-btn" data-act="prev-event" title="Evento anterior" aria-label="Evento anterior">⏮</button>
    <button type="button" class="tl-btn" data-act="prev-day" title="Día anterior" aria-label="Día anterior">◀</button>
    <output class="tl-date" aria-live="polite"></output>
    <button type="button" class="tl-btn" data-act="next-day" title="Día siguiente" aria-label="Día siguiente">▶</button>
    <button type="button" class="tl-btn" data-act="next-event" title="Evento siguiente" aria-label="Evento siguiente">⏭</button>
  </div>
  <div class="tl-range" hidden>
    <span class="tl-range__label"></span>
    <button type="button" class="tl-btn tl-btn--text" data-act="clear-range">Quitar rango</button>
  </div>
  <div class="tl-views" role="group" aria-label="Encuadre">
    <button type="button" class="tl-btn tl-btn--text" data-act="view-focus">3018–3019</button>
    <button type="button" class="tl-btn tl-btn--text" data-act="view-all">Todo</button>
  </div>
</div>
<div class="tl-body">
  <svg class="tl-svg" role="img" aria-label="Calles de la línea temporal por personaje"></svg>
  <div class="tl-tip" role="tooltip" hidden></div>
</div>
<ul class="tl-zones" aria-label="Zonas">${ZONES.map(
    (z) =>
      `<li><span class="tl-zone-swatch" style="background:var(${z.token})"></span>${escapeHtml(z.name)}</li>`,
  ).join('')}</ul>`;

  const body = root.querySelector<HTMLDivElement>('.tl-body')!;
  const tip = root.querySelector<HTMLDivElement>('.tl-tip')!;
  const dateOut = root.querySelector<HTMLOutputElement>('.tl-date')!;
  const rangeBox = root.querySelector<HTMLDivElement>('.tl-range')!;
  const svg: SVG = select(root.querySelector<SVGSVGElement>('.tl-svg')!);

  const defs = svg.append('defs');
  const clipId = 'tl-clip';
  const clipRect = defs.append('clipPath').attr('id', clipId).append('rect');
  // Rayado para lo inferido (textura además del color, para daltonismo e impresión).
  defs
    .append('pattern')
    .attr('id', 'tl-hatch')
    .attr('width', 5)
    .attr('height', 5)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)')
    .append('rect')
    .attr('width', 2)
    .attr('height', 5)
    .attr('class', 'tl-hatch');

  const gLanesBg = svg.append('g').attr('class', 'tl-lanes-bg');
  const gAxis = svg.append('g').attr('class', 'tl-axis');
  const gBrush = svg.append('g').attr('class', 'tl-brush');
  const gPlot = svg.append('g').attr('clip-path', `url(#${clipId})`);
  const gSegs = gPlot.append('g').attr('class', 'tl-segs');
  const gMeets = gPlot.append('g').attr('class', 'tl-meets');
  const gMarks = gPlot.append('g').attr('class', 'tl-marks');
  const gCursor = svg.append('g').attr('class', 'tl-cursor');
  const gLabels = svg.append('g').attr('class', 'tl-labels');

  let width = 0;
  let laneH = 20;
  let labelW = 104;
  let height = 0;
  const x0 = scaleLinear().domain(focus);
  let x: ScaleLinear<number, number> = x0.copy();
  let ignoreBrush = false;

  const laneY = (i: number) => AXIS_H + EVENTS_H + i * laneH;

  // --- Zoom y rango ---------------------------------------------------------
  const zoom: ZoomBehavior<SVGSVGElement, unknown> = d3zoom<SVGSVGElement, unknown>()
    .filter((ev: Event) => {
      // El eje es para seleccionar rango; el resto, para desplazar y hacer zoom.
      const target = ev.target as Element;
      if (target.closest('.tl-brush') && ev.type !== 'wheel') return false;
      if (target.closest('.tl-cursor-handle')) return false;
      return (!(ev as MouseEvent).ctrlKey || ev.type === 'wheel') && !(ev as MouseEvent).button;
    })
    .on('zoom', (ev: D3ZoomEvent<SVGSVGElement, unknown>) => {
      x = ev.transform.rescaleX(x0);
      render();
    });

  const brush: BrushBehavior<unknown> = brushX().on('end', (ev: D3BrushEvent<unknown>) => {
    if (ignoreBrush) return;
    const sel = ev.selection as [number, number] | null;
    if (!sel) {
      if (ev.sourceEvent) store.set({ range: null });
      return;
    }
    const r: [number, number] = [x.invert(sel[0]), x.invert(sel[1])];
    if (r[1] - r[0] < 0.5) return;
    store.set({ range: r });
  });

  function layout(): void {
    width = Math.max(320, body.clientWidth);
    const narrow = width < 600;
    labelW = narrow ? 34 : 104;
    laneH = narrow ? 17 : 20;
    height = AXIS_H + EVENTS_H + main.length * laneH + 6;
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    clipRect
      .attr('x', labelW)
      .attr('y', 0)
      .attr('width', width - labelW - PAD_R)
      .attr('height', height);
    x0.range([labelW, width - PAD_R]);
    const k = (focus[1] - focus[0]) / 6; // como mucho, 6 días a lo ancho
    zoom
      .extent([
        [labelW, 0],
        [width - PAD_R, height],
      ])
      .scaleExtent([((focus[1] - focus[0]) / (allEnd - allStart)) * 0.98, k])
      .translateExtent([
        [x0(allStart), 0],
        [x0(allEnd), height],
      ]);
    brush.extent([
      [labelW, 0],
      [width - PAD_R, AXIS_H - 14],
    ]);
    gBrush.call(brush);
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
  }

  // --- Dibujo ---------------------------------------------------------------
  function render(): void {
    const { t, range, hidden, eventId } = store.get();
    const [d0, d1] = x.domain() as [number, number];
    const pxPerDay = (x.range()[1]! - x.range()[0]!) / (d1 - d0);

    // Fondo de calles y nombres.
    gLanesBg
      .selectAll<SVGRectElement, Character>('rect')
      .data(main, (c) => c.id)
      .join('rect')
      .attr('x', 0)
      .attr('y', (_, i) => laneY(i))
      .attr('width', width)
      .attr('height', laneH)
      .attr('class', (_, i) => `tl-lane-bg${i % 2 ? ' tl-lane-bg--odd' : ''}`);

    const labels = gLabels
      .selectAll<SVGGElement, Character>('g.tl-label')
      .data(main, (c) => c.id)
      .join((enter) => {
        const g = enter
          .append('g')
          .attr('class', 'tl-label')
          .attr('tabindex', 0)
          .attr('role', 'switch')
          .on('click', (_, c) => toggle(c.id))
          .on('keydown', (ev: KeyboardEvent, c) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              toggle(c.id);
            }
          });
        g.append('rect').attr('class', 'tl-label-bg');
        g.append('circle').attr('class', 'tl-chip');
        g.append('text').attr('class', 'tl-chip-text');
        g.append('text').attr('class', 'tl-name');
        g.append('title');
        return g;
      });
    labels
      .attr('transform', (_, i) => `translate(0,${laneY(i)})`)
      .attr('aria-checked', (c) => String(!hidden.has(c.id)))
      .classed('is-hidden', (c) => hidden.has(c.id));
    labels.select('.tl-label-bg').attr('width', labelW).attr('height', laneH);
    labels
      .select('.tl-chip')
      .attr('cx', 15)
      .attr('cy', laneH / 2)
      .attr('r', laneH / 2 - 2)
      .attr('fill', (c) => c.color);
    labels
      .select('.tl-chip-text')
      .attr('x', 15)
      .attr('y', laneH / 2)
      .attr('fill', (c) => chipInk(c.color))
      .text((c) => c.initials);
    labels
      .select('.tl-name')
      .attr('x', 30)
      .attr('y', laneH / 2)
      .attr('display', labelW > 60 ? null : 'none')
      .text((c) => shortNameOf(c));
    labels.select('title').text((c) => `${c.name}: ${hidden.has(c.id) ? 'mostrar' : 'ocultar'}`);

    // Eje.
    const ticks = timeTicks(d0, d1, pxPerDay);
    const tk = gAxis
      .selectAll<SVGGElement, (typeof ticks)[number]>('g.tl-tick')
      .data(ticks, (d) => String(d.t))
      .join((enter) => {
        const g = enter.append('g').attr('class', 'tl-tick');
        g.append('line');
        g.append('text');
        return g;
      });
    tk.attr('transform', (d) => `translate(${x(d.t)},0)`).classed('is-major', (d) => d.major);
    tk.select('line')
      .attr('y1', AXIS_H - 12)
      .attr('y2', height);
    tk.select('text')
      .attr('x', 3)
      .attr('y', AXIS_H - 4)
      .text((d) => d.label);
    tk.attr('display', (d) => (x(d.t) < labelW || x(d.t) > width - PAD_R ? 'none' : null));

    // Segmentos (paradas a toda altura, viajes a media altura).
    const visible = segments.filter((s) => s.t1 >= d0 && s.t0 <= d1);
    const segSel = gSegs
      .selectAll<SVGGElement, Segment>('g.tl-seg')
      .data(visible, (s) => `${s.characterId}@${s.t0}`)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'tl-seg');
        g.append('rect').attr('class', 'tl-seg-fill');
        g.append('rect').attr('class', 'tl-seg-hatch');
        g.append('text').attr('class', 'tl-seg-label');
        g.on('pointerenter', (ev: PointerEvent, s) => showTip(ev, segmentTip(s)))
          .on('pointermove', moveTip)
          .on('pointerleave', hideTip);
        return g;
      });
    segSel
      .classed('is-move', (s) => s.kind === 'move')
      .classed('is-hidden', (s) => hidden.has(s.characterId))
      .classed('is-out', (s) => !!range && (s.t1 < range[0] || s.t0 > range[1]));
    const segX = (s: Segment) => x(s.t0) + 1;
    const segW = (s: Segment) => Math.max(1, x(s.t1) - x(s.t0) - 2);
    const segY = (s: Segment) =>
      laneY(laneOf.get(s.characterId)!) + (s.kind === 'move' ? laneH * 0.3 : 3);
    const segH = (s: Segment) => (s.kind === 'move' ? laneH * 0.4 : laneH - 6);
    for (const cls of ['.tl-seg-fill', '.tl-seg-hatch'])
      segSel
        .select(cls)
        .attr('x', segX)
        .attr('y', segY)
        .attr('width', segW)
        .attr('height', segH)
        .attr('rx', 2);
    segSel
      .select('.tl-seg-fill')
      .style('fill', (s) => (s.zone ? `var(${s.zone.token})` : 'var(--ink-soft)'));
    segSel.select('.tl-seg-hatch').attr('display', (s) => (s.inferred ? null : 'none'));
    segSel
      .select('.tl-seg-label')
      // Margen extra: los puntos de encuentro caen justo al inicio de la parada.
      .attr('x', (s) => Math.max(segX(s), labelW) + 9)
      .attr('y', (s) => segY(s) + segH(s) / 2)
      .text((s) => {
        if (s.kind !== 'stay') return '';
        const name = placeName.get(s.placeId) ?? '';
        const room = x(Math.min(s.t1, d1)) - Math.max(segX(s), labelW) - 14;
        return room > name.length * 5.6 ? name : '';
      });

    // Encuentros: línea vertical que une a los presentes.
    const meetSel = gMeets
      .selectAll<SVGGElement, Convergence>('g.tl-meet')
      .data(
        meets.filter((m) => m.t >= d0 && m.t <= d1),
        (m) => `${m.placeId}@${m.t}`,
      )
      .join((enter) => {
        const g = enter.append('g').attr('class', 'tl-meet');
        g.append('line');
        g.on('pointerenter', (ev: PointerEvent, m) => showTip(ev, meetTip(m)))
          .on('pointermove', moveTip)
          .on('pointerleave', hideTip);
        return g;
      });
    meetSel.each(function (m) {
      const lanes = m.characterIds.map((id) => laneOf.get(id)!).filter((i) => i !== undefined);
      const top = laneY(Math.min(...lanes)) + 2;
      const bottom = laneY(Math.max(...lanes)) + laneH - 2;
      const g = select(this);
      g.attr('transform', `translate(${x(m.t)},0)`);
      g.select('line').attr('y1', top).attr('y2', bottom);
      g.selectAll<SVGCircleElement, number>('circle')
        .data(lanes)
        .join('circle')
        .attr('cy', (i) => laneY(i) + laneH / 2)
        .attr('r', 3.2);
    });

    // Marcas de eventos: fila superior (todos) y en la calle de cada principal.
    type Mark = { e: StoryEvent; lane: number | null };
    const marks: Mark[] = [];
    for (const e of orderedEvents) {
      const te = eventTime(e);
      if (te < d0 || te > d1) continue;
      marks.push({ e, lane: null });
      for (const id of e.characterIds) {
        const lane = laneOf.get(id);
        if (lane !== undefined) marks.push({ e, lane });
      }
    }
    const markSel = gMarks
      .selectAll<SVGPathElement, Mark>('path.tl-mark')
      .data(marks, (m) => `${m.e.id}#${m.lane}`)
      .join((enter) =>
        enter
          .append('path')
          .attr('class', 'tl-mark')
          .attr('tabindex', 0)
          .attr('role', 'button')
          .on('click', (ev: MouseEvent, m) => {
            ev.stopPropagation();
            store.set({ eventId: m.e.id, t: eventTime(m.e) });
          })
          .on('keydown', (ev: KeyboardEvent, m) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              store.set({ eventId: m.e.id, t: eventTime(m.e) });
            }
          })
          .on('pointerenter', (ev: PointerEvent, m) => showTip(ev, eventTip(m.e)))
          .on('pointermove', moveTip)
          .on('pointerleave', hideTip),
      );
    markSel
      .attr('aria-label', (m) => `${formatDate(m.e.date)}: ${m.e.title}`)
      .attr('transform', (m) => {
        const y = m.lane === null ? AXIS_H + EVENTS_H / 2 : laneY(m.lane) + laneH / 2;
        return `translate(${x(eventTime(m.e))},${y})`;
      })
      .attr('d', (m) => {
        const r = m.lane === null ? 4.5 : 3.6;
        return `M0,${-r}L${r},0L0,${r}L${-r},0Z`;
      })
      .classed('is-row', (m) => m.lane === null)
      .classed('is-selected', (m) => m.e.id === eventId)
      .classed('is-hidden', (m) => m.lane !== null && hidden.has(main[m.lane]!.id))
      .classed(
        'is-out',
        (m) => !!range && (eventTime(m.e) < range[0] || eventTime(m.e) > range[1]),
      );

    // Cursor de fecha.
    const cx = x(t);
    gCursor.attr('display', cx < labelW || cx > width - PAD_R ? 'none' : null);
    const cur = gCursor
      .selectAll<SVGGElement, number>('g.tl-cursor-g')
      .data([t])
      .join((enter) => {
        const g = enter.append('g').attr('class', 'tl-cursor-g');
        g.append('line').attr('class', 'tl-cursor-line');
        g.append('path')
          .attr('class', 'tl-cursor-handle')
          .attr('d', 'M-7,0 L7,0 L7,9 L0,16 L-7,9 Z')
          .attr('tabindex', 0)
          .attr('role', 'slider')
          .attr('aria-label', 'Fecha actual');
        return g;
      });
    cur.attr('transform', `translate(${cx},0)`);
    cur.select('.tl-cursor-line').attr('y1', 0).attr('y2', height);
    cur
      .select('.tl-cursor-handle')
      .attr('aria-valuetext', formatDate(fromDayIndex(Math.floor(t))))
      .attr('aria-valuemin', allStart)
      .attr('aria-valuemax', allEnd)
      .attr('aria-valuenow', Math.floor(t));

    // Rango (reflejar en el pincel sin volver a disparar).
    ignoreBrush = true;
    gBrush.call(brush.move, range ? [x(range[0]), x(range[1])] : null);
    ignoreBrush = false;
  }

  // --- Interacción ----------------------------------------------------------
  function toggle(id: string): void {
    const hidden = new Set(store.get().hidden);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    store.set({ hidden });
  }

  const tAtPointer = (ev: PointerEvent | MouseEvent) => {
    const rect = (svg.node() as SVGSVGElement).getBoundingClientRect();
    return x.invert(ev.clientX - rect.left);
  };
  const clampT = (t: number) => Math.max(allStart, Math.min(allEnd, t));

  // Clic en las calles: mover el cursor (d3-zoom marca defaultPrevented tras arrastrar).
  svg.on('click', (ev: MouseEvent) => {
    if (ev.defaultPrevented) return;
    const target = ev.target as Element;
    if (target.closest('.tl-label, .tl-brush, .tl-mark')) return;
    store.set({ t: clampT(tAtPointer(ev)) });
  });

  // Arrastrar el asa del cursor.
  gCursor.on('pointerdown', (ev: PointerEvent) => {
    const handle = (ev.target as Element).closest('.tl-cursor-handle');
    if (!handle) return;
    ev.preventDefault();
    const el = handle as SVGPathElement;
    el.setPointerCapture(ev.pointerId);
    const onMove = (e: PointerEvent) => store.set({ t: clampT(tAtPointer(e)) });
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  });
  gCursor.on('keydown', (ev: KeyboardEvent) => {
    const step = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowLeft') store.set({ t: clampT(store.get().t - step) });
    else if (ev.key === 'ArrowRight') store.set({ t: clampT(store.get().t + step) });
    else return;
    ev.preventDefault();
  });

  root.querySelector('.tl-bar')!.addEventListener('click', (ev) => {
    const act = (ev.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.act;
    const { t } = store.get();
    switch (act) {
      case 'prev-day':
        return store.set({ t: clampT(Math.floor(t) - 0.5) });
      case 'next-day':
        return store.set({ t: clampT(Math.floor(t) + 1.5) });
      case 'prev-event':
      case 'next-event': {
        // Con un evento abierto se recorre la lista en orden (hay varios por día);
        // si no, el más cercano a la fecha actual.
        const { eventId } = store.get();
        const i = orderedEvents.findIndex((e) => e.id === eventId);
        const forward = act === 'next-event';
        const e =
          i >= 0
            ? orderedEvents[i + (forward ? 1 : -1)]
            : forward
              ? orderedEvents.find((e) => eventTime(e) > t + 1e-6)
              : [...orderedEvents].reverse().find((e) => eventTime(e) < t - 1e-6);
        if (e) store.set({ eventId: e.id, t: eventTime(e) });
        return;
      }
      case 'clear-range':
        return store.set({ range: null });
      case 'view-focus':
        return showWindow(focus[0], focus[1]);
      case 'view-all':
        return showWindow(allStart, allEnd);
    }
  });

  /** Encuadra [a, b] a lo ancho: x(t) = k·x0(t) + tx. */
  function showWindow(a: number, b: number): void {
    const k = (width - PAD_R - labelW) / (x0(b) - x0(a));
    const tx = labelW - k * x0(a);
    svg.call(zoom.transform, zoomIdentity.translate(tx, 0).scale(k));
  }

  /** Mantiene el cursor a la vista cuando cambia la fecha desde fuera. */
  function ensureVisible(t: number): void {
    const [a, b] = x.domain() as [number, number];
    if (t >= a && t <= b) return;
    const span = b - a;
    showWindow(t - span / 2, t + span / 2);
  }

  // --- Tooltip --------------------------------------------------------------
  function showTip(ev: PointerEvent, html: string): void {
    tip.innerHTML = html;
    tip.hidden = false;
    moveTip(ev);
  }
  function moveTip(ev: PointerEvent): void {
    const rect = body.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const w = tip.offsetWidth;
    tip.style.left = `${Math.min(rect.width - w - 4, Math.max(4, px + 12))}px`;
    tip.style.top = `${Math.max(4, py - tip.offsetHeight - 10)}px`;
  }
  function hideTip(): void {
    tip.hidden = true;
  }
  const span = (a: number, b: number) => {
    const da = formatDate(fromDayIndex(Math.floor(a)));
    const db = formatDate(fromDayIndex(Math.floor(b - 1e-6)));
    return da === db ? da : `${da} – ${db}`;
  };
  function segmentTip(s: Segment): string {
    const c = chars.get(s.characterId)!;
    const where =
      s.kind === 'stay'
        ? `En ${escapeHtml(placeName.get(s.placeId) ?? s.placeId)}`
        : `Hacia ${escapeHtml(placeName.get(s.placeId) ?? s.placeId)}`;
    return `<strong>${escapeHtml(shortNameOf(c))}</strong> · ${where}<br><span class="tl-tip-date">${span(s.t0, s.t1)}</span>${
      s.zone ? `<br><span class="tl-tip-zone">${escapeHtml(s.zone.name)}</span>` : ''
    }${s.inferred ? '<br><em>Inferido</em>' : ''}`;
  }
  function meetTip(m: Convergence): string {
    const names = m.characterIds.map((id) => shortNameOf(chars.get(id)!)).join(', ');
    return `<strong>Encuentro en ${escapeHtml(placeName.get(m.placeId) ?? m.placeId)}</strong><br><span class="tl-tip-date">${formatDate(
      fromDayIndex(Math.floor(m.t)),
    )}</span><br>${escapeHtml(names)}`;
  }
  function eventTip(e: StoryEvent): string {
    return `<span class="tl-tip-date">${formatDate(e.date)}</span><br><strong>${escapeHtml(e.title)}</strong><br>${escapeHtml(
      placeName.get(e.placeId) ?? e.placeId,
    )}`;
  }

  // --- Ciclo de vida --------------------------------------------------------
  function updateHeader(): void {
    const { t, range } = store.get();
    dateOut.textContent = formatDate(fromDayIndex(Math.floor(t)));
    rangeBox.hidden = !range;
    if (range)
      root.querySelector('.tl-range__label')!.textContent =
        `Rango: ${span(range[0], range[1] + 1)}`;
  }

  layout();
  showWindow(focus[0], focus[1]);
  updateHeader();
  render();
  new ResizeObserver(() => {
    const keep = x.domain() as [number, number];
    layout();
    showWindow(keep[0], keep[1]);
  }).observe(body);
  store.subscribe((s, prev) => {
    if (s.t !== prev.t) ensureVisible(s.t);
    updateHeader();
    render();
  });

  return { eventTime, orderedEvents, tracks };
}
