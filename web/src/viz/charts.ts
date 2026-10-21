import { wavyLower, wavyUpper, type ClassificationDataset } from '../data/datasets';
import type { Figure, Layout, Trace } from './plotly';
import { BUGN, CLASS_COLORS, baseLayout, type PlotTheme } from './theme';

const HIDDEN = { showticklabels: false, showgrid: false, zeroline: false, range: [-1, 1], fixedrange: true };
const SQUARE = (t: PlotTheme) => ({
  ...baseLayout(t),
  xaxis: { ...HIDDEN, constrain: 'domain' },
  yaxis: { ...HIDDEN, scaleanchor: 'x', constrain: 'domain' },
});

function axisFrame(t: PlotTheme, xref = 'x', yref = 'y') {
  return { type: 'rect', xref, yref, x0: -1, y0: -1, x1: 1, y1: 1, line: { color: t.grid, width: 1 }, layer: 'below' };
}

function split(x: Float64Array, labels: ArrayLike<number>, numClasses: number) {
  const out = Array.from({ length: numClasses }, () => ({ x: [] as number[], y: [] as number[] }));
  for (let i = 0; i < labels.length; i++) {
    const c = labels[i];
    if (c >= 0 && c < numClasses) {
      out[c].x.push(x[2 * i]);
      out[c].y.push(x[2 * i + 1]);
    }
  }
  return out;
}

/** Classification data set (`make_data_plot`): test points colored by class. */
export function dataFigure(t: PlotTheme, x: Float64Array, labels: Float64Array, numClasses: number): Figure {
  return {
    data: split(x, labels, numClasses).map((p, c) => ({
      type: 'scatter',
      mode: 'markers',
      ...p,
      marker: { color: CLASS_COLORS[c], size: 5 },
      name: `Class ${c}`,
      hovertemplate: `Class ${c}<br>(%{x:.2f}, %{y:.2f})<extra></extra>`,
    })),
    layout: { ...SQUARE(t), shapes: [axisFrame(t)] },
  };
}

/** Regression data set (`make_regression_data_plot`). */
export function regressionDataFigure(
  t: PlotTheme,
  x: Float64Array,
  yTrue: Float64Array,
  yNoisy: Float64Array,
  mask: Uint8Array,
): Figure {
  const tx: number[] = [], ty: number[] = [];
  mask.forEach((m, i) => {
    if (m) {
      tx.push(x[i]);
      ty.push(yNoisy[i]);
    }
  });
  return {
    data: [
      { type: 'scatter', mode: 'lines', x: Array.from(x), y: Array.from(yTrue), name: 'Ground truth', line: { color: CLASS_COLORS[0] } },
      { type: 'scatter', mode: 'markers', x: tx, y: ty, name: 'Train samples', marker: { size: 4, color: CLASS_COLORS[1] } },
    ],
    layout: regressionAxes(t),
  };
}

function regressionAxes(t: PlotTheme): Layout {
  return {
    ...baseLayout(t),
    margin: { l: 28, r: 4, t: 4, b: 20 },
    xaxis: { range: [-1, 1], gridcolor: t.grid, zerolinecolor: t.grid, fixedrange: true },
    yaxis: { gridcolor: t.grid, zerolinecolor: t.grid, fixedrange: true },
  };
}

function linspace(n: number): number[] {
  return Array.from({ length: n }, (_, i) => -1 + (2 * i) / (n - 1));
}

/** Decision boundary (`make_decision_boundary_plot`): score of class 0 on a grid plus the test points. */
export function decisionFigure(
  t: PlotTheme,
  grid: Float32Array | null,
  gridSize: number,
  x: Float64Array,
  labels: Float64Array,
  numClasses: number,
): Figure {
  const axis = linspace(gridSize);
  const z: number[][] = [];
  for (let r = 0; r < gridSize; r++) z.push(grid ? Array.from(grid.subarray(r * gridSize, (r + 1) * gridSize)) : axis.map(() => 0.5));
  return {
    data: [
      {
        type: 'contour',
        x: axis,
        y: axis,
        z,
        zmin: 0,
        zmax: 1,
        showscale: false,
        contours: { coloring: 'heatmap', showlines: false },
        line: { smoothing: 0.5 },
        colorscale: [
          [0, '#ff9f1c'],
          [0.5, t.contourMid],
          [1, '#1f5fbf'],
        ],
        hovertemplate: 'score(class 0)=%{z:.2f}<extra></extra>',
      },
      ...split(x, labels, numClasses).map((p, c) => ({
        type: 'scatter',
        mode: 'markers',
        ...p,
        marker: { color: CLASS_COLORS[c], size: 4, line: { width: 1, color: '#ffffff' } },
        hoverinfo: 'skip',
      })),
    ],
    layout: SQUARE(t),
  };
}

/** True class boundaries drawn on the result plots. */
function boundaryShapes(dataset: ClassificationDataset, t: PlotTheme, xref: string, yref: string) {
  const shapes: Record<string, unknown>[] = [];
  const line = { color: t.line, width: 1 };
  const circle = (cx: number, cy: number, r: number) =>
    shapes.push({ type: 'circle', xref, yref, x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r, line });
  const path = (xs: number[], ys: number[]) =>
    shapes.push({
      type: 'path',
      xref,
      yref,
      path: xs.map((xv, i) => `${i ? 'L' : 'M'}${xv},${ys[i]}`).join(' '),
      line,
    });
  switch (dataset) {
    case 'circle':
      circle(0, 0, Math.sqrt(2 / Math.PI));
      break;
    case '3_circles':
      circle(-1, 1, 1);
      circle(1, 0, Math.sqrt(6 / Math.PI - 1));
      circle(-0.5, -0.5, 0.5);
      break;
    case 'square': {
      const p = 0.5 * Math.SQRT2;
      path([-p, p, p, -p, -p], [-p, -p, p, p, -p]);
      break;
    }
    case '4_squares':
      path([0, 0], [-1, 1]);
      path([-1, 1], [0, 0]);
      break;
    case 'crown':
    case 'tricrown':
      circle(0, 0, Math.sqrt(0.8));
      circle(0, 0, Math.sqrt(0.8 - 2 / Math.PI));
      break;
    case 'wavy_lines': {
      const xs = Array.from({ length: 60 }, (_, i) => -1 + (2 * i) / 59);
      const clip = (v: number) => Math.max(-1, Math.min(1, v));
      path(xs, xs.map((v) => clip(wavyUpper(v))));
      path(xs, xs.map((v) => clip(wavyLower(v))));
      break;
    }
  }
  return shapes;
}

/**
 * Classification results (`make_result_plot`): left, test points colored by predicted class; right,
 * correct (green) vs. wrong (red) predictions. Both show the true class boundaries.
 */
export function resultsFigure(
  t: PlotTheme,
  dataset: ClassificationDataset,
  x: Float64Array,
  labels: Float64Array,
  predictions: Float32Array | null,
  numClasses: number,
): Figure {
  const data: Trace[] = [];
  if (predictions) {
    split(x, predictions, numClasses).forEach((p, c) =>
      data.push({ type: 'scatter', mode: 'markers', ...p, marker: { color: CLASS_COLORS[c], size: 4 }, hoverinfo: 'skip' }),
    );
    const wrong = { x: [] as number[], y: [] as number[] };
    const right = { x: [] as number[], y: [] as number[] };
    for (let i = 0; i < labels.length; i++) {
      const target = predictions[i] === labels[i] ? right : wrong;
      target.x.push(x[2 * i]);
      target.y.push(x[2 * i + 1]);
    }
    data.push(
      { type: 'scatter', mode: 'markers', xaxis: 'x2', yaxis: 'y2', ...wrong, marker: { color: t.wrong, size: 4 }, hoverinfo: 'skip' },
      { type: 'scatter', mode: 'markers', xaxis: 'x2', yaxis: 'y2', ...right, marker: { color: t.right, size: 4 }, hoverinfo: 'skip' },
    );
  }
  return {
    data,
    layout: {
      ...baseLayout(t),
      margin: { l: 0, r: 0, t: 18, b: 0 },
      xaxis: { ...HIDDEN, domain: [0, 0.48] },
      yaxis: { ...HIDDEN },
      xaxis2: { ...HIDDEN, domain: [0.52, 1] },
      yaxis2: { ...HIDDEN, anchor: 'x2' },
      shapes: [
        axisFrame(t),
        axisFrame(t, 'x2', 'y2'),
        ...boundaryShapes(dataset, t, 'x', 'y'),
        ...boundaryShapes(dataset, t, 'x2', 'y2'),
      ],
      annotations: [
        { text: 'Predicted class', x: 0.24, y: 1, xref: 'paper', yref: 'paper', yanchor: 'bottom', showarrow: false, font: { size: 11, color: t.muted } },
        { text: 'Correct / wrong', x: 0.76, y: 1, xref: 'paper', yref: 'paper', yanchor: 'bottom', showarrow: false, font: { size: 11, color: t.muted } },
      ],
    },
  };
}

/** Regression fit (`make_regression_decision_plot`): truth, MC mean, ±2σ band, training samples. */
export function regressionFitFigure(
  t: PlotTheme,
  denseX: Float64Array,
  denseY: Float64Array,
  curve: { mean: Float32Array; std: Float32Array } | null,
  trainX: Float64Array,
  trainY: Float64Array,
): Figure {
  const xs = Array.from(denseX);
  const mean = curve ? Array.from(curve.mean) : [];
  const lower = curve ? mean.map((m, i) => m - 2 * curve.std[i]) : [];
  const upper = curve ? mean.map((m, i) => m + 2 * curve.std[i]) : [];
  return {
    data: [
      { type: 'scatter', mode: 'lines', x: xs, y: Array.from(denseY), name: 'Ground truth', line: { dash: 'dash', color: t.muted } },
      { type: 'scatter', mode: 'lines', x: curve ? xs : [], y: lower, line: { width: 0 }, hoverinfo: 'skip' },
      {
        type: 'scatter',
        mode: 'lines',
        x: curve ? xs : [],
        y: upper,
        fill: 'tonexty',
        fillcolor: 'rgba(31,119,180,0.22)',
        line: { width: 0 },
        name: '±2σ',
        hoverinfo: 'skip',
      },
      { type: 'scatter', mode: 'lines', x: curve ? xs : [], y: mean, name: 'Prediction', line: { color: CLASS_COLORS[0], width: 2 } },
      {
        type: 'scatter',
        mode: 'markers',
        x: Array.from(trainX),
        y: Array.from(trainY),
        name: 'Train samples',
        marker: { size: 5, color: CLASS_COLORS[1], symbol: 'circle-open' },
      },
    ],
    layout: regressionAxes(t),
  };
}

/** Regression residuals on the test grid (`make_regression_results_plot`). */
export function residualsFigure(t: PlotTheme, x: Float64Array, y: Float64Array, predictions: Float32Array | null): Figure {
  return {
    data: [
      {
        type: 'scatter',
        mode: 'markers',
        x: predictions ? Array.from(x) : [],
        y: predictions ? Array.from(predictions, (p, i) => p - y[i]) : [],
        marker: { size: 4, color: t.wrong },
        hovertemplate: 'x=%{x:.2f}<br>residual=%{y:.3f}<extra></extra>',
      },
    ],
    layout: {
      ...regressionAxes(t),
      yaxis: { range: [-2, 2], gridcolor: t.grid, zerolinecolor: t.muted, fixedrange: true },
      annotations: [
        { text: 'Residuals (test)', x: 0.02, y: 0.98, xref: 'paper', yref: 'paper', xanchor: 'left', yanchor: 'top', showarrow: false, font: { size: 11, color: t.muted } },
      ],
    },
  };
}

export interface MetricsSeries {
  base: number;
  loss: number[];
  train: number[];
  test: number[];
}

/** Learning curves (`make_performance_plot`), with an optional marker at the displayed epoch. */
export function metricsFigure(t: PlotTheme, m: MetricsSeries, regression: boolean, viewEpoch: number | null): Figure {
  const x = m.loss.map((_, i) => m.base + i);
  const data: Trace[] = regression
    ? [
        { type: 'scatter', mode: 'lines', x, y: m.train, name: 'Train MSE', line: { color: CLASS_COLORS[1] } },
        { type: 'scatter', mode: 'lines', x, y: m.test, name: 'Test MSE', line: { color: CLASS_COLORS[2] } },
      ]
    : [
        { type: 'scatter', mode: 'lines', x, y: m.loss, name: 'Loss', line: { color: CLASS_COLORS[0] } },
        { type: 'scatter', mode: 'lines', x, y: m.train, name: 'Acc Train', line: { color: CLASS_COLORS[1] } },
        { type: 'scatter', mode: 'lines', x, y: m.test, name: 'Acc Test', line: { color: CLASS_COLORS[2] } },
      ];
  return {
    data,
    layout: {
      ...baseLayout(t),
      showlegend: true,
      legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: 10 } },
      margin: { l: 30, r: 6, t: 4, b: 22 },
      xaxis: { gridcolor: t.grid, zeroline: false, rangemode: 'tozero', title: { text: '' } },
      yaxis: { gridcolor: t.grid, zeroline: false, rangemode: 'tozero' },
      hovermode: 'x unified',
      shapes:
        viewEpoch === null
          ? []
          : [{ type: 'line', xref: 'x', yref: 'paper', x0: viewEpoch, x1: viewEpoch, y0: 0, y1: 1, line: { color: t.accent, width: 2, dash: 'dot' } }],
    },
  };
}

const TWO_PI = 2 * Math.PI;
const mod2pi = (v: number) => ((v % TWO_PI) + TWO_PI) % TWO_PI;

/** Per-gate summary of the parameters (`compute_combined_metric`): ‖W mod 2π‖ + (‖B‖ mod 2π). */
export function gateMetrics(theta: ArrayLike<number>, numLayers: number, numQubits: number) {
  const P = numLayers * numQubits * 3;
  const out: { combined: number; delta: number; bias: number }[] = [];
  for (let g = 0; g < numLayers * numQubits; g++) {
    let dw = 0, nb = 0;
    for (let j = 0; j < 3; j++) {
      dw += mod2pi(theta[3 * g + j]) ** 2;
      nb += theta[P + 3 * g + j] ** 2;
    }
    const delta = Math.sqrt(dw);
    const bias = mod2pi(Math.sqrt(nb));
    out.push({ combined: delta + bias, delta, bias });
  }
  return out;
}

/** Circuit diagram (`make_quantum_classifier_plot`) with gates colored by their parameter metric. */
export function circuitFigure(t: PlotTheme, numQubits: 1 | 2, numLayers: number, theta: ArrayLike<number> | null): Figure {
  const xs = 1.35;
  const ys = numQubits === 1 ? [0] : [0.75, 0];
  const metrics = theta ? gateMetrics(theta, numLayers, numQubits) : null;
  const vmin = metrics ? Math.min(...metrics.map((m) => m.combined)) : 0;
  const vmax = metrics ? Math.max(...metrics.map((m) => m.combined)) : 1;
  const data: Trace[] = [];
  const shapes: Record<string, unknown>[] = [];
  const xEnd = numLayers * xs + 1;

  for (const y of ys) data.push({ type: 'scatter', mode: 'lines', x: [0, xEnd], y: [y, y], line: { color: t.line, width: 2 }, hoverinfo: 'skip' });

  const hover = { x: [] as number[], y: [] as number[], text: [] as string[] };
  for (let i = 1; i <= numLayers; i++) {
    const xg = i * xs;
    ys.forEach((y, q) => {
      let color = t.accent;
      if (metrics) {
        const m = metrics[(i - 1) * numQubits + q];
        const norm = (m.combined - vmin) / (vmax - vmin + 1e-8);
        color = BUGN[Math.min(BUGN.length - 1, Math.max(0, Math.floor(norm * (BUGN.length - 1))))];
        hover.x.push(xg);
        hover.y.push(y);
        hover.text.push(
          `Layer ${i}, Q${q + 1}<br>Combined metric: ${m.combined.toFixed(2)}<br>Δ_total: ${m.delta.toFixed(2)}<br>Bias phase: ${m.bias.toFixed(2)} rad`,
        );
      }
      const s = 0.2;
      shapes.push({ type: 'rect', x0: xg - s, y0: y - s, x1: xg + s, y1: y + s, line: { color: t.line }, fillcolor: color });
    });
    // The simulation applies CNOT(Q1 → Q2) after every layer, including the last.
    if (numQubits === 2) {
      const xc = xg + 0.5;
      const [cy, ty] = ys;
      const r = 0.06;
      shapes.push(
        { type: 'line', x0: xc, y0: cy, x1: xc, y1: ty - 2 * r, line: { color: t.line } },
        { type: 'circle', x0: xc - r, y0: cy - r, x1: xc + r, y1: cy + r, line: { color: t.line }, fillcolor: t.line },
        { type: 'circle', x0: xc - 2 * r, y0: ty - 2 * r, x1: xc + 2 * r, y1: ty + 2 * r, line: { color: t.line } },
        { type: 'line', x0: xc - 2 * r, y0: ty, x1: xc + 2 * r, y1: ty, line: { color: t.line } },
      );
    }
    data.push({ type: 'scatter', mode: 'text', x: [xg], y: [Math.min(...ys) - 0.42], text: [`L${i}`], hoverinfo: 'skip', textfont: { color: t.muted } });
  }
  ys.forEach((y, q) =>
    data.push({ type: 'scatter', mode: 'text', x: [-0.4], y: [y], text: [`Q${q + 1}`], hoverinfo: 'skip', textfont: { color: t.text } }),
  );
  if (metrics) data.push({ type: 'scatter', mode: 'markers', ...hover, marker: { size: 20, opacity: 0 }, hoverinfo: 'text' });

  return {
    data,
    layout: {
      ...baseLayout(t),
      shapes,
      xaxis: { visible: false, range: [-1, numLayers * xs + 1.6], fixedrange: true },
      yaxis: { visible: false, range: numQubits === 1 ? [-0.8, 0.5] : [-0.8, 1.15], fixedrange: true },
    },
  };
}
