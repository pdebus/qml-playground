import { wavyLower, wavyUpper, type ClassificationDataset } from '../data/datasets';
import type { Figure, Layout, Trace } from './plotly';
import { CLASS_COLORS, baseLayout, type PlotTheme } from './theme';

const HIDDEN = { showticklabels: false, showgrid: false, zeroline: false, range: [-1, 1], fixedrange: true };

function axisFrame(t: PlotTheme, xref = 'x', yref = 'y') {
  return { type: 'rect', xref, yref, x0: -1, y0: -1, x1: 1, y1: 1, line: { color: t.grid, width: 1 }, layer: 'below' };
}

/** Points grouped by label; `customdata` is the sample index. */
function split(x: Float64Array, labels: ArrayLike<number>, numClasses: number) {
  const out = Array.from({ length: numClasses }, () => ({ x: [] as number[], y: [] as number[], customdata: [] as number[] }));
  for (let i = 0; i < labels.length; i++) {
    const c = labels[i];
    if (c >= 0 && c < numClasses) {
      out[c].x.push(x[2 * i]);
      out[c].y.push(x[2 * i + 1]);
      out[c].customdata.push(i);
    }
  }
  return out;
}

/** Ring around the followed sample (always emitted, empty without one, to keep trace indices stable). */
function ringTrace(t: PlotTheme, x: number[], y: number[], axes: Trace = {}): Trace {
  return {
    type: 'scatter',
    mode: 'markers',
    x,
    y,
    ...axes,
    marker: { size: 13, color: 'rgba(0,0,0,0)', line: { color: t.text, width: 2 } },
    hoverinfo: 'skip',
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
  highlight: number | null = null,
): Figure {
  const data: Trace[] = [];
  // hoverinfo 'none' (not 'skip') keeps hover events for following a sample, without a label.
  if (predictions) {
    split(x, predictions, numClasses).forEach((p, c) =>
      data.push({ type: 'scatter', mode: 'markers', ...p, marker: { color: CLASS_COLORS[c], size: 4 }, hoverinfo: 'none' }),
    );
    const wrong = { x: [] as number[], y: [] as number[], customdata: [] as number[] };
    const right = { x: [] as number[], y: [] as number[], customdata: [] as number[] };
    for (let i = 0; i < labels.length; i++) {
      const target = predictions[i] === labels[i] ? right : wrong;
      target.x.push(x[2 * i]);
      target.y.push(x[2 * i + 1]);
      target.customdata.push(i);
    }
    data.push(
      { type: 'scatter', mode: 'markers', xaxis: 'x2', yaxis: 'y2', ...wrong, marker: { color: t.wrong, size: 4 }, hoverinfo: 'none' },
      { type: 'scatter', mode: 'markers', xaxis: 'x2', yaxis: 'y2', ...right, marker: { color: t.right, size: 4 }, hoverinfo: 'none' },
    );
  }
  const hx = highlight === null ? [] : [x[2 * highlight]];
  const hy = highlight === null ? [] : [x[2 * highlight + 1]];
  data.push(ringTrace(t, hx, hy), ringTrace(t, hx, hy, { xaxis: 'x2', yaxis: 'y2' }));
  return {
    data,
    layout: {
      ...baseLayout(t),
      hovermode: 'closest',
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
  highlight: { x: number; y: number } | null = null,
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
      {
        type: 'scatter',
        mode: 'lines',
        x: curve ? xs : [],
        y: mean,
        name: 'Prediction',
        line: { color: CLASS_COLORS[0], width: 2 },
        hovertemplate: 'x = %{x:.2f}<br>⟨Z⟩ = %{y:.3f}<extra>Model output</extra>',
      },
      {
        type: 'scatter',
        mode: 'markers',
        x: Array.from(trainX),
        y: Array.from(trainY),
        name: 'Train samples',
        marker: { size: 5, color: CLASS_COLORS[1], symbol: 'circle-open' },
      },
      ringTrace(t, highlight ? [highlight.x] : [], highlight ? [highlight.y] : []),
    ],
    layout: regressionAxes(t),
  };
}

/** Fourier spectrum |c_k| of the model output and the target, k = 0 … kMax (grouped bars). */
export function spectrumFigure(t: PlotTheme, target: number[], model: number[] | null): Figure {
  const k = target.map((_, i) => i);
  return {
    data: [
      {
        type: 'bar',
        x: k,
        y: target,
        name: 'Target',
        marker: { color: t.muted },
        hovertemplate: 'k = %{x}<br>|c_k| = %{y:.3f}<extra>Target</extra>',
      },
      {
        type: 'bar',
        x: model ? k : [],
        y: model ?? [],
        name: 'Model',
        marker: { color: CLASS_COLORS[0] },
        hovertemplate: 'k = %{x}<br>|c_k| = %{y:.3f}<extra>Model</extra>',
      },
    ],
    layout: {
      ...baseLayout(t),
      barmode: 'group',
      bargap: 0.25,
      showlegend: true,
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1, yanchor: 'top', font: { size: 10 } },
      margin: { l: 30, r: 4, t: 4, b: 30 },
      xaxis: { dtick: 1, fixedrange: true, title: { text: 'frequency k (in t = πx)', font: { size: 10, color: t.muted } } },
      yaxis: { gridcolor: t.grid, zeroline: false, rangemode: 'tozero', fixedrange: true },
    },
  };
}

/** Regression residuals on the test grid (`make_regression_results_plot`). */
export function residualsFigure(
  t: PlotTheme,
  x: Float64Array,
  y: Float64Array,
  predictions: Float32Array | null,
  highlight: number | null = null,
): Figure {
  const on = predictions !== null && highlight !== null;
  return {
    data: [
      {
        type: 'scatter',
        mode: 'markers',
        x: predictions ? Array.from(x) : [],
        y: predictions ? Array.from(predictions, (p, i) => p - y[i]) : [],
        customdata: predictions ? Array.from(x, (_, i) => i) : [],
        marker: { size: 4, color: t.wrong },
        hovertemplate: 'x=%{x:.2f}<br>residual=%{y:.3f}<extra></extra>',
      },
      ringTrace(t, on ? [x[highlight]] : [], on ? [predictions[highlight] - y[highlight]] : []),
    ],
    layout: {
      ...regressionAxes(t),
      hovermode: 'closest',
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

