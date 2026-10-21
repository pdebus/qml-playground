import Plotly from 'plotly.js/lib/core';
import scatter from 'plotly.js/lib/scatter';
import scatter3d from 'plotly.js/lib/scatter3d';
import surface from 'plotly.js/lib/surface';
import mesh3d from 'plotly.js/lib/mesh3d';
import cone from 'plotly.js/lib/cone';
import { useEffect, useState } from 'react';

// Partial bundle: only the trace types the playground uses.
Plotly.register([scatter, scatter3d, surface, mesh3d, cone]);

export type Trace = Record<string, unknown>;
export type Layout = Record<string, unknown>;
export interface Figure {
  data: Trace[];
  layout: Layout;
}

const CONFIG = { displayModeBar: false, responsive: false, displaylogo: false };

/**
 * Renders `figure` into the returned div with `Plotly.react`, which diffs against the previous figure and
 * only redraws what changed. A constant `layout.uirevision` keeps user interaction (e.g. 3D camera)
 * across updates. The plot is resized with its container.
 */
export function usePlot(figure: Figure | null): (el: HTMLDivElement | null) => void {
  // A callback ref, so plots in conditionally rendered elements are created and purged (releasing their
  // WebGL contexts) with the element.
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (el && figure) void Plotly.react(el, figure.data, figure.layout, CONFIG);
  }, [el, figure]);

  useEffect(() => {
    if (!el) return;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (el.querySelector('.plot-container')) Plotly.Plots.resize(el);
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      Plotly.purge(el);
    };
  }, [el]);

  return setEl;
}
