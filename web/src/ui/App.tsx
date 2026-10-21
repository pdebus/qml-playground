import { useApp, type ThemeMode } from '../state/store';
import { Icon } from './controls/Controls';
import { useResolvedTheme } from './hooks';
import { ControlPanel } from './panels/ControlPanel';
import { DataPanel } from './panels/DataPanel';
import { MetricsPanel } from './panels/MetricsPanel';
import { ModelPanel } from './panels/ModelPanel';
import { ResultsPanel } from './panels/ResultsPanel';
import { SettingsPanel } from './panels/SettingsPanel';

const REPO_URL = 'https://github.com/fraunhofer-aisec/qml-playground';
const BASE = import.meta.env.BASE_URL;

const NEXT_THEME: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON = { system: 'auto', light: 'sun', dark: 'moon' } as const;

export function App() {
  useResolvedTheme();
  const themeMode = useApp((s) => s.themeMode);
  const setThemeMode = useApp((s) => s.setThemeMode);
  const error = useApp((s) => s.error);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src={`${BASE}qmlpg-icon.svg`} alt="" width={36} height={36} />
          <div>
            <h1>QML Playground</h1>
            <p className="muted">Train and visualize data re-uploading quantum circuits, right in your browser.</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setThemeMode(NEXT_THEME[themeMode])}
            aria-label={`Theme: ${themeMode}. Switch to ${NEXT_THEME[themeMode]}`}
            title={`Theme: ${themeMode}`}
          >
            <Icon name={THEME_ICON[themeMode]} />
          </button>
          <a className="icon-btn" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Source on GitHub" title="Source on GitHub">
            <img src={`${BASE}github.svg`} alt="" width={20} height={20} className="github-logo" />
          </a>
        </div>
      </header>

      {error && (
        <div className="error" role="alert">
          Simulation error: {error}
        </div>
      )}

      <main className="grid">
        <ControlPanel />
        <SettingsPanel />
        <MetricsPanel />
        <DataPanel />
        <ModelPanel />
        <ResultsPanel />
      </main>

      <footer className="app-footer">
        <img src={`${BASE}aisec.png`} alt="Fraunhofer AISEC" className="logo" />
        <nav>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
          <a href="https://doi.ieeecomputersociety.org/10.1109/MCG.2024.3456288" target="_blank" rel="noreferrer">
            Paper (IEEE CG&amp;A)
          </a>
          <a href="https://dsi-generator.fraunhofer.de/dsi/view/en/43ea542c-d1b7-42a6-a622-79a991ab2418/full/" target="_blank" rel="noreferrer">
            Privacy Notice
          </a>
          <a href="https://dsi-generator.fraunhofer.de/impressum/impressum_view/en/9e6f7056-74b4-42ba-a5ae-32e9e95eff4d/full/" target="_blank" rel="noreferrer">
            Imprint
          </a>
        </nav>
        <span className="muted">© 2025 Pascal Debus, Fraunhofer AISEC · All computation runs locally in your browser.</span>
      </footer>
    </div>
  );
}
