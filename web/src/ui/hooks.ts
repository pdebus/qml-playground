import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state/store';
import { PLOT_THEMES, type PlotTheme, type ResolvedTheme } from '../viz/theme';
import type { StateSpaceSpec } from '../viz/stateSpace';

/** Returns `value`, updated at most every `ms` milliseconds (trailing edge included). */
export function useThrottled<T>(value: T, ms: number): T {
  const [out, setOut] = useState(value);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const now = performance.now();
    const wait = ms - (now - last.current);
    clearTimeout(timer.current);
    if (wait <= 0) {
      last.current = now;
      setOut(value);
    } else {
      timer.current = setTimeout(() => {
        last.current = performance.now();
        setOut(value);
      }, wait);
    }
    return () => clearTimeout(timer.current);
  }, [value, ms]);
  return out;
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Resolves the theme mode, applies it to <html data-theme>, and returns the matching plot colors. */
export function useResolvedTheme(): PlotTheme {
  const mode = useApp((s) => s.themeMode);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const resolved = mode === 'system' ? system : mode;
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);
  return PLOT_THEMES[resolved];
}

/** Test-sample grouping and targets for the state-space plots of the current configuration. */
export function useStateSpaceSpec(): StateSpaceSpec | null {
  const info = useApp((s) => s.info);
  return useMemo(() => {
    if (!info) return null;
    const n = info.testY.length;
    let groups: Int32Array[];
    let groupColors: number[];
    if (info.task === 'regression') {
      groups = [Int32Array.from({ length: n }, (_, i) => i)];
      groupColors = [1];
    } else {
      const buckets: number[][] = Array.from({ length: info.numClasses }, () => []);
      info.testY.forEach((c, i) => buckets[c].push(i));
      groups = buckets.map((b) => Int32Array.from(b));
      groupColors = buckets.map((_, c) => c);
    }
    return {
      numQubits: info.numQubits,
      numLayers: info.numLayers,
      groups,
      groupColors,
      targetsBloch: info.task === 'classification' && info.numQubits === 1 ? info.targetsBloch : [],
      numClasses: info.task === 'classification' ? info.numClasses : 0,
    };
  }, [info]);
}

/** Width of an element, tracked with a ResizeObserver. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
