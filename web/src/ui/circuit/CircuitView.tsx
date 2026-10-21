import { useMemo, useState, type MouseEvent } from 'react';
import { Circuit } from '../../sim/circuit';
import type { DataInfo, Snapshot, UnitMaps } from '../../worker/protocol';
import type { PlotTheme } from '../../viz/theme';
import {
  NEGATIVE,
  POSITIVE,
  UNIT_MODES,
  blochValue,
  classAt,
  cssColor,
  divergingColor,
  isDiverging,
  outputValue,
  renderCurve,
  renderGrid,
  sequentialColor,
  tangleValue,
  unitPalette,
  type UnitMode,
} from '../../viz/unitMaps';
import { InfoTip, Segmented } from '../controls/Controls';

const SUB_GATES = ['RZ', 'RY', 'RZ'] as const;
const ANGLE_NAMES = ['φ', 'θ', 'ω'] as const;
const FEATURE_NAMES = ['x₁', 'x₂'];
const TAU = 2 * Math.PI;

interface Geometry {
  gateW: number;
  gateH: number;
  pitch: number;
  dialR: number;
  labels: boolean;
  tile: number;
  colW: number;
  busY: (bottom: boolean, f: number) => number;
  wireY: (q: number) => number;
  height: number;
  gateX: (l: number, j: number) => number;
  entX: (l: number) => number;
  tileX: (l: number) => number;
}

function geometry(numQubits: 1 | 2, numFeatures: number, compact: boolean): Geometry {
  const gateW = compact ? 30 : 42;
  const gateH = compact ? 30 : 50;
  const pitch = gateW + (compact ? 4 : 6);
  const tile = compact ? 40 : 48;
  const entW = numQubits === 2 ? 30 : 10;
  const colW = 3 * pitch + entW + tile + 20;
  const busGap = 12;
  const busBlock = 12 + numFeatures * busGap;
  const wire0 = busBlock + gateH / 2 + 14;
  const wireGap = Math.max(110, gateH + tile + 30);
  const wireY = (q: number) => wire0 + q * wireGap;
  const lastWire = wireY(numQubits - 1);
  const busY = (bottom: boolean, f: number) => (bottom ? lastWire + gateH / 2 + 14 + f * busGap : 12 + f * busGap);
  const height = numQubits === 2 ? busY(true, numFeatures - 1) + 12 : lastWire + gateH / 2 + 14;
  return {
    gateW,
    gateH,
    pitch,
    dialR: compact ? 9 : 11,
    labels: !compact,
    tile,
    colW,
    busY,
    wireY,
    height,
    gateX: (l, j) => 14 + l * colW + j * pitch,
    entX: (l) => 14 + l * colW + 3 * pitch + entW / 2 - 4,
    tileX: (l) => 14 + l * colW + 3 * pitch + entW + 6,
  };
}

/** Classical (double-line) wire carrying an input feature. */
function Bus({ d }: { d: string }) {
  return (
    <g fill="none">
      <path d={d} className="bus-outer" />
      <path d={d} className="bus-inner" />
    </g>
  );
}

/** Point at angle `a` (0 = up, clockwise) on a circle. */
const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;

function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
}

const fmt = (v: number, d = 2) => (Math.abs(v) < 0.005 ? '0' : v.toFixed(d));
const wrapAngle = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/**
 * The angle dial of one sub-gate: the needle is the bias b, the wedge is the range of angles w·x + b that
 * the data sweeps for x ∈ [-1, 1]. A full disc plus a badge means more than one full turn.
 */
function Dial({ cx, cy, r, w, b }: { cx: number; cy: number; r: number; w: number; b: number }) {
  const span = Math.abs(w);
  const turns = span / Math.PI; // 2|w| / 2π
  const color = w >= 0 ? POSITIVE : NEGATIVE;
  const [nx, ny] = polar(cx, cy, r, b);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth={1} />
      {turns >= 1 ? (
        <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.35} />
      ) : (
        span > 1e-3 && <path d={wedgePath(cx, cy, r, b - span, b + span)} fill={color} fillOpacity={0.4} />
      )}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={1.6} fill="var(--text)" />
      {turns >= 1 && (
        <text x={cx + r - 1} y={cy - r + 3} className="dial-badge" textAnchor="middle">
          ×{turns.toFixed(turns < 10 ? 1 : 0)}
        </text>
      )}
    </g>
  );
}

interface HoverState {
  kind: 'unit' | 'tangle' | 'output' | 'input';
  l: number;
  q: number;
  /** Grid point index under the cursor. */
  p: number;
  /** Position relative to the wrapper. */
  left: number;
  top: number;
  image: string;
}

export function CircuitView({ info, snap, theme }: { info: DataInfo; snap: Snapshot | null; theme: PlotTheme }) {
  const [mode, setMode] = useState<UnitMode>('z');
  // Compact by default for deep circuits until the user chooses.
  const [compactChoice, setCompact] = useState<boolean | null>(null);
  const compact = compactChoice ?? info.numLayers > 8;
  const [hover, setHover] = useState<HoverState | null>(null);

  const regression = info.task === 'regression';
  const Q = info.numQubits;
  const L = info.numLayers;
  const F = regression ? 1 : 2;
  const featIdx = useMemo(() => new Circuit(Q, L, F).featIdx, [Q, L, F]);
  const g = geometry(Q, F, compact);
  const units = snap?.units ?? null;
  const theta = snap?.theta ?? null;
  const P = L * Q * 3;
  const pal = useMemo(() => unitPalette(theme), [theme]);
  const effectiveMode: UnitMode = mode === 'score' && regression ? 'z' : mode;
  const modeInfo = UNIT_MODES.find((m) => m.value === effectiveMode)!;

  const images = useMemo(() => renderUnitImages(units, info, effectiveMode, pal, theme), [units, info, effectiveMode, pal, theme]);
  const inputImages = useMemo(() => renderInputImages(regression, pal, theme), [regression, pal, theme]);

  const width = 14 + L * g.colW + g.tile + 30;
  const leftW = 92;

  const onTileMove = (e: MouseEvent<SVGImageElement>, kind: HoverState['kind'], l: number, q: number, image: string) => {
    if (!units) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = Math.min(0.999, Math.max(0, (e.clientX - rect.left) / rect.width));
    const fy = Math.min(0.999, Math.max(0, (e.clientY - rect.top) / rect.height));
    const n = units.size;
    const p = regression ? Math.floor(fx * n) : Math.floor((1 - fy) * n) * n + Math.floor(fx * n);
    const wrap = (e.currentTarget.closest('.circuit') as HTMLElement).getBoundingClientRect();
    const cardW = 176;
    // Open to the right of the tile, or to the left when there is no room.
    const right = rect.right - wrap.left + 8;
    const left = right + cardW > wrap.width ? rect.left - wrap.left - cardW - 8 : right;
    setHover({ kind, l, q, p, left: Math.max(0, left), top: rect.top - wrap.top, image });
  };

  const tileProps = (kind: HoverState['kind'], l: number, q: number, image: string) => ({
    onMouseMove: (e: MouseEvent<SVGImageElement>) => onTileMove(e, kind, l, q, image),
    onMouseLeave: () => setHover(null),
  });

  return (
    <div className="circuit">
      <div className="circuit-toolbar">
        <div className="field-label">
          Unit maps
          <InfoTip>
            Like the neurons in TensorFlow Playground, each tile shows one quantity over the whole input space after a
            layer. {modeInfo.description} The tile between the wires shows the entanglement (tangle) of the two qubits.
          </InfoTip>
        </div>
        <Segmented
          label="Unit map quantity"
          value={effectiveMode}
          options={UNIT_MODES.filter((m) => !(regression && m.value === 'score')).map((m) => ({ value: m.value, label: m.label }))}
          onChange={setMode}
        />
        <Legend mode={effectiveMode} pal={pal} numClasses={info.numClasses} />
        <label className="toggle">
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact
        </label>
      </div>

      <div className="circuit-scroll">
        {/* Inputs: sticky so they stay visible while scrolling through many layers. */}
        <svg className="circuit-inputs" width={leftW} height={g.height} role="img" aria-label="Input features">
          {Array.from({ length: F }, (_, f) => {
            const size = 34;
            const y = g.height / 2 - (F * (size + 16)) / 2 + f * (size + 16);
            const xv = leftW - 34 + f * 8;
            return (
              <g key={f}>
                {/* Feeder from the input node to its bus line(s). */}
                <Bus d={`M${6 + size},${y + size / 2} H${xv} V${g.busY(false, f)} H${leftW}`} />
                {Q === 2 && <Bus d={`M${xv},${y + size / 2} V${g.busY(true, f)} H${leftW}`} />}
                <image
                  href={inputImages[f]}
                  x={6}
                  y={y}
                  width={size}
                  height={size}
                  className="unit-tile"
                  preserveAspectRatio="none"
                  {...tileProps('input', 0, f, inputImages[f])}
                />
                <rect x={6} y={y} width={size} height={size} className="unit-frame" pointerEvents="none" />
                <text x={6 + size / 2} y={y + size + 12} textAnchor="middle" className="circuit-label strong">
                  {regression ? 'x' : FEATURE_NAMES[f]}
                </text>
              </g>
            );
          })}
          {Array.from({ length: Q }, (_, q) => (
            <g key={q}>
              <text x={leftW - 4} y={g.wireY(q) - 8} textAnchor="end" className="circuit-label strong">
                Q{q + 1}
              </text>
              <text x={leftW - 4} y={g.wireY(q) + 14} textAnchor="end" className="circuit-label">
                |0⟩
              </text>
              <line x1={leftW - 22} x2={leftW} y1={g.wireY(q)} y2={g.wireY(q)} className="wire" />
            </g>
          ))}
        </svg>

        <svg className="circuit-main" width={width} height={g.height} role="img" aria-label="Data re-uploading circuit">
          {/* Classical data buses */}
          {Array.from({ length: F }, (_, f) => {
            const end = 14 + L * g.colW - 10;
            return (
              <g key={f}>
                <Bus d={`M0,${g.busY(false, f)} H${end}`} />
                {Q === 2 && <Bus d={`M0,${g.busY(true, f)} H${end}`} />}
              </g>
            );
          })}
          {/* Qubit wires */}
          {Array.from({ length: Q }, (_, q) => (
            <line key={q} x1={0} x2={width - g.tile - 24} y1={g.wireY(q)} y2={g.wireY(q)} className="wire" />
          ))}

          {Array.from({ length: L }, (_, l) => (
            <g key={l}>
              <text x={g.gateX(l, 0) + (3 * g.pitch) / 2 - 3} y={g.height - 2} textAnchor="middle" className="circuit-label">
                {Q === 1 ? `Layer ${l + 1}` : ''}
              </text>
              {Array.from({ length: Q }, (_, q) =>
                SUB_GATES.map((name, j) => {
                  const k = (l * Q + q) * 3 + j;
                  const w = theta ? theta[k] : 0;
                  const b = theta ? theta[P + k] : 0;
                  const f = featIdx[k];
                  const x = g.gateX(l, j);
                  const cy = g.wireY(q);
                  const top = cy - g.gateH / 2;
                  const bottom = top + g.gateH;
                  const fromBottom = Q === 2 && q === 1;
                  const busY = g.busY(fromBottom, f);
                  const strength = Math.min(1, Math.abs(w) / Math.PI);
                  const lo = wrapAngle(b - Math.abs(w));
                  const hi = wrapAngle(b + Math.abs(w));
                  const title =
                    `Layer ${l + 1}, Q${q + 1}: ${name}(${ANGLE_NAMES[j]}), ${ANGLE_NAMES[j]} = w·${regression ? 'x' : FEATURE_NAMES[f]} + b\n` +
                    `w = ${fmt(w)}, b = ${fmt(b)} rad\n` +
                    (Math.abs(w) >= Math.PI
                      ? `The data sweeps ${(Math.abs(w) / Math.PI).toFixed(1)} full turns (high-frequency encoding).`
                      : `The data sweeps the angle from ${fmt(lo)} to ${fmt(hi)} rad.`);
                  return (
                    <g key={`${q}-${j}`}>
                      <line
                        x1={x + g.gateW / 2}
                        x2={x + g.gateW / 2}
                        y1={busY}
                        y2={fromBottom ? bottom : top}
                        stroke={w >= 0 ? POSITIVE : NEGATIVE}
                        strokeWidth={1 + 3.5 * strength}
                        strokeOpacity={0.25 + 0.75 * strength}
                      />
                      <circle cx={x + g.gateW / 2} cy={busY} r={1.5 + strength * 1.5} fill={w >= 0 ? POSITIVE : NEGATIVE} />
                      <g className="gate">
                        <title>{title}</title>
                        <rect x={x} y={top} width={g.gateW} height={g.gateH} rx={6} className="gate-box" />
                        {g.labels && (
                          <text x={x + g.gateW / 2} y={top + 11} textAnchor="middle" className="gate-name">
                            {name}
                          </text>
                        )}
                        <Dial cx={x + g.gateW / 2} cy={g.labels ? cy + 1 : cy} r={g.dialR} w={w} b={b} />
                        {g.labels && (
                          <text x={x + g.gateW / 2} y={bottom - 4} textAnchor="middle" className="gate-feature">
                            {regression ? 'x' : FEATURE_NAMES[f]}
                          </text>
                        )}
                      </g>
                    </g>
                  );
                }),
              )}

              {Q === 2 && (
                <g className="cnot">
                  <title>CNOT: flips Q2 when Q1 is |1⟩. This is the only gate that can entangle the qubits.</title>
                  <line x1={g.entX(l)} x2={g.entX(l)} y1={g.wireY(0)} y2={g.wireY(1) + 9} className="wire" />
                  <circle cx={g.entX(l)} cy={g.wireY(0)} r={4.5} fill="var(--text)" />
                  <circle cx={g.entX(l)} cy={g.wireY(1)} r={9} fill="var(--surface)" className="wire" />
                  <line x1={g.entX(l) - 9} x2={g.entX(l) + 9} y1={g.wireY(1)} y2={g.wireY(1)} className="wire" />
                </g>
              )}

              {Array.from({ length: Q }, (_, q) => {
                const img = images?.unit[l * Q + q];
                const y = g.wireY(q) - g.tile / 2;
                return img ? (
                  <g key={`u${q}`}>
                    <image
                      href={img}
                      x={g.tileX(l)}
                      y={y}
                      width={g.tile}
                      height={g.tile}
                      preserveAspectRatio="none"
                      className="unit-tile"
                      {...tileProps('unit', l, q, img)}
                    />
                    <rect x={g.tileX(l)} y={y} width={g.tile} height={g.tile} className="unit-frame" pointerEvents="none" />
                  </g>
                ) : null;
              })}
              {Q === 2 && images?.tangle[l] && (
                <g>
                  <image
                    href={images.tangle[l]}
                    x={g.tileX(l) + 6}
                    y={(g.wireY(0) + g.wireY(1)) / 2 - (g.tile - 12) / 2}
                    width={g.tile - 12}
                    height={g.tile - 12}
                    preserveAspectRatio="none"
                    className="unit-tile"
                    {...tileProps('tangle', l, 0, images.tangle[l])}
                  />
                  <rect
                    x={g.tileX(l) + 6}
                    y={(g.wireY(0) + g.wireY(1)) / 2 - (g.tile - 12) / 2}
                    width={g.tile - 12}
                    height={g.tile - 12}
                    className="unit-frame dashed"
                    pointerEvents="none"
                  />
                </g>
              )}
              {Q === 2 && (
                <text x={g.gateX(l, 0) + (3 * g.pitch) / 2 - 3} y={(g.wireY(0) + g.wireY(1)) / 2 + 4} textAnchor="middle" className="circuit-label">
                  Layer {l + 1}
                </text>
              )}
            </g>
          ))}

          {/* Output node */}
          {images?.output && (
            <g>
              <text x={width - g.tile / 2 - 16} y={g.wireY(0) - g.tile / 2 - 14} textAnchor="middle" className="circuit-label strong">
                Output
              </text>
              <image
                href={images.output}
                x={width - g.tile - 16}
                y={g.wireY(0) - g.tile / 2}
                width={g.tile}
                height={g.tile}
                preserveAspectRatio="none"
                className="unit-tile"
                {...tileProps('output', L - 1, 0, images.output)}
              />
              <rect x={width - g.tile - 16} y={g.wireY(0) - g.tile / 2} width={g.tile} height={g.tile} className="unit-frame strong" pointerEvents="none" />
            </g>
          )}
        </svg>
      </div>
      {hover && units && <HoverCard hover={hover} units={units} info={info} mode={effectiveMode} />}

      <p className="legend-note muted">
        Each <b>dial</b> shows a rotation angle: the needle is the bias b, and the shaded wedge is the range w·x + b that
        the data sweeps (<span style={{ color: POSITIVE }}>blue</span> for w &gt; 0, <span style={{ color: NEGATIVE }}>orange</span> for w &lt; 0; ×n = full turns).
        The width of a data tap shows |w|, i.e. how strongly that feature is uploaded.
      </p>
    </div>
  );
}

function Legend({ mode, pal, numClasses }: { mode: UnitMode; pal: ReturnType<typeof unitPalette>; numClasses: number }) {
  if (mode === 'score') {
    return (
      <div className="unit-legend" aria-label="Class colors">
        {pal.classes.slice(0, numClasses).map((c, i) => (
          <span key={i} className="unit-legend-chip">
            <i style={{ background: cssColor(c) }} /> {i}
          </span>
        ))}
      </div>
    );
  }
  const div = isDiverging(mode);
  const stops = div ? [-1, -0.5, 0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const gradient = stops.map((v) => cssColor(div ? divergingColor(pal, v) : sequentialColor(pal, v)));
  return (
    <div className="unit-legend">
      <span>{div ? '−1' : mode === 'purity' ? '0.5' : '0'}</span>
      <i className="unit-legend-bar" style={{ background: `linear-gradient(to right, ${gradient.join(',')})` }} />
      <span>1</span>
    </div>
  );
}

function HoverCard({ hover, units, info, mode }: { hover: HoverState; units: UnitMaps; info: DataInfo; mode: UnitMode }) {
  const regression = info.task === 'regression';
  const n = units.size;
  const px = regression ? -1 + (2 * hover.p) / (n - 1) : -1 + (2 * (hover.p % n)) / (n - 1);
  const py = regression ? 0 : -1 + (2 * Math.floor(hover.p / n)) / (n - 1);
  const where = regression ? `x = ${px.toFixed(2)}` : `x₁ = ${px.toFixed(2)}, x₂ = ${py.toFixed(2)}`;
  let title = '';
  let value = '';
  if (hover.kind === 'input') {
    title = regression ? 'Input x' : `Input ${FEATURE_NAMES[hover.q]}`;
    value = regression ? where : `${FEATURE_NAMES[hover.q]} = ${(hover.q === 0 ? px : py).toFixed(2)}`;
  } else if (hover.kind === 'tangle') {
    title = `Entanglement after layer ${hover.l + 1}`;
    value = `tangle = ${tangleValue(units, hover.l, hover.p).toFixed(3)}`;
  } else if (hover.kind === 'output' || mode === 'score') {
    title = hover.kind === 'output' ? 'Model output' : `Q${hover.q + 1} after layer ${hover.l + 1}: prediction if measured here`;
    if (regression) {
      value = `⟨Z⟩ = ${outputValue(units, hover.l, hover.p).toFixed(3)}`;
    } else {
      const { cls, confidence } = classAt(units, info.numClasses, hover.l, hover.p);
      value = `class ${cls} (confidence ${(confidence * 100).toFixed(0)}%)`;
    }
  } else {
    const label = UNIT_MODES.find((m) => m.value === mode)!.label;
    title = `Q${hover.q + 1} after layer ${hover.l + 1}`;
    value = `${label} = ${blochValue(units, info.numQubits, hover.l, hover.q, hover.p, mode as 'x' | 'y' | 'z' | 'purity').toFixed(3)}`;
  }
  return (
    <div className="unit-hover" style={{ left: hover.left, top: hover.top }} role="tooltip">
      <div className="unit-hover-title">{title}</div>
      <img src={hover.image} alt="" width={150} height={150} />
      <div>{value}</div>
      {hover.kind !== 'input' && <div className="muted">{where}</div>}
    </div>
  );
}

interface UnitImages {
  unit: string[];
  tangle: string[];
  output: string;
}

function renderUnitImages(
  units: UnitMaps | null,
  info: DataInfo,
  mode: UnitMode,
  pal: ReturnType<typeof unitPalette>,
  theme: PlotTheme,
): UnitImages | null {
  if (!units) return null;
  const Q = info.numQubits;
  const L = info.numLayers;
  const regression = info.task === 'regression';
  const C = info.numClasses;
  const render = (value: (p: number) => number, diverging: boolean) =>
    regression
      ? renderCurve(value, units.points, pal, diverging, theme.text)
      : renderGrid(units.size, (p) => (diverging ? divergingColor(pal, value(p)) : sequentialColor(pal, value(p))));
  const classMap = (l: number) =>
    renderGrid(units.size, (p) => {
      const { cls, confidence } = classAt(units, C, l, p);
      const c = pal.classes[cls];
      return [0, 1, 2].map((i) => pal.neutral[i] + (c[i] - pal.neutral[i]) * (0.15 + 0.85 * confidence)) as [number, number, number];
    });

  const unit: string[] = [];
  for (let l = 0; l < L; l++) {
    for (let q = 0; q < Q; q++) {
      if (mode === 'score') unit.push(classMap(l));
      else if (mode === 'purity') unit.push(render((p) => 2 * blochValue(units, Q, l, q, p, 'purity') - 1, false));
      else unit.push(render((p) => blochValue(units, Q, l, q, p, mode), true));
    }
  }
  const tangle = Q === 2 ? Array.from({ length: L }, (_, l) => render((p) => tangleValue(units, l, p), false)) : [];
  const output = regression ? render((p) => outputValue(units, L - 1, p), true) : classMap(L - 1);
  return { unit, tangle, output };
}

function renderInputImages(regression: boolean, pal: ReturnType<typeof unitPalette>, theme: PlotTheme): string[] {
  const n = 24;
  if (regression) return [renderCurve((p) => -1 + (2 * p) / 63, 64, pal, true, theme.text)];
  return [
    renderGrid(n, (p) => divergingColor(pal, -1 + (2 * (p % n)) / (n - 1))),
    renderGrid(n, (p) => divergingColor(pal, -1 + (2 * Math.floor(p / n)) / (n - 1))),
  ];
}
