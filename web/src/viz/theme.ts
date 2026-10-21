export type ResolvedTheme = 'light' | 'dark';

/** Colors used inside Plotly figures (which cannot read CSS variables). Keep in sync with tokens.css. */
export interface PlotTheme {
  name: ResolvedTheme;
  text: string;
  muted: string;
  grid: string;
  line: string;
  accent: string;
  accentStrong: string;
  sceneBg: string;
  contourMid: string;
  wrong: string;
  right: string;
}

export const PLOT_THEMES: Record<ResolvedTheme, PlotTheme> = {
  light: {
    name: 'light',
    text: '#1d2a26',
    muted: '#6b7a75',
    grid: '#e3e9e7',
    line: '#1d2a26',
    accent: '#179c7d',
    accentStrong: '#006247',
    sceneBg: 'rgba(0,0,0,0)',
    contourMid: '#ffffff',
    wrong: '#d62728',
    right: '#2ca02c',
  },
  dark: {
    name: 'dark',
    text: '#e3ebe8',
    muted: '#93a39e',
    grid: '#2c3835',
    line: '#c9d6d2',
    accent: '#2bc49f',
    accentStrong: '#7fe0c6',
    sceneBg: 'rgba(0,0,0,0)',
    contourMid: '#1b2422',
    wrong: '#ff6b6b',
    right: '#4cd47a',
  },
};

/** Plotly's qualitative D3 palette (class colors in the reference app). */
export const CLASS_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];

/** Plotly's sequential BuGn scale (circuit gate coloring in the reference app). */
export const BUGN = [
  'rgb(247,252,253)',
  'rgb(229,245,249)',
  'rgb(204,236,230)',
  'rgb(153,216,201)',
  'rgb(102,194,164)',
  'rgb(65,174,118)',
  'rgb(35,139,69)',
  'rgb(0,109,44)',
  'rgb(0,68,27)',
];

export function baseLayout(t: PlotTheme): Record<string, unknown> {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, system-ui, sans-serif', color: t.text, size: 11 },
    margin: { l: 0, r: 0, t: 0, b: 0 },
    showlegend: false,
    autosize: true,
    hoverlabel: { font: { family: 'Inter, system-ui, sans-serif' } },
  };
}
