import { useMemo } from 'react';
import { useApp } from '../../state/store';
import type { ClassificationDataset } from '../../data/datasets';
import { residualsFigure, resultsFigure } from '../../viz/charts';
import { finalStateFigure } from '../../viz/stateSpace';
import { usePlot } from '../../viz/plotly';
import { Panel } from '../controls/Controls';
import { useResolvedTheme, useStateSpaceSpec, useThrottled } from '../hooks';

export function ResultsPanel() {
  const theme = useResolvedTheme();
  const info = useApp((s) => s.info);
  const snap = useThrottled(
    useApp((s) => s.snap),
    50,
  );
  const spec = useStateSpaceSpec();

  const finalFig = useMemo(() => (spec ? finalStateFigure(theme, spec, snap?.layerVis ?? null) : null), [spec, theme, snap]);
  const finalRef = usePlot(finalFig);

  const testFig = useMemo(() => {
    if (!info) return null;
    if (info.regression) return residualsFigure(theme, info.testX, info.testY, snap?.predictions ?? null);
    return resultsFigure(theme, info.dataset as ClassificationDataset, info.testX, info.testY, snap?.predictions ?? null, info.numClasses);
  }, [info, theme, snap]);
  const testRef = usePlot(testFig);

  const regression = info?.task === 'regression';
  const qubits = info?.numQubits ?? 1;

  return (
    <Panel title="Results" area="results">
      <h3 className="subheading">
        Final state
        <span className="muted"> · {qubits === 1 ? 'Bloch sphere' : 'Q-simplex'}</span>
      </h3>
      <div ref={finalRef} className="chart chart-final" />
      <h3 className="subheading">{regression ? 'Test residuals' : 'Test predictions'}</h3>
      <div ref={testRef} className="chart chart-results" />
    </Panel>
  );
}
