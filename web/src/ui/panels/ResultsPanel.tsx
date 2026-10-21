import { useMemo } from 'react';
import { useApp } from '../../state/store';
import { GRID_SIZES } from '../../state/settings';
import type { ClassificationDataset } from '../../data/datasets';
import { decisionFigure, regressionFitFigure, residualsFigure, resultsFigure } from '../../viz/charts';
import { finalStateFigure } from '../../viz/stateSpace';
import { usePlot } from '../../viz/plotly';
import { Field, Panel, Select } from '../controls/Controls';
import { useResolvedTheme, useStateSpaceSpec, useThrottled } from '../hooks';

export function ResultsPanel() {
  const theme = useResolvedTheme();
  const info = useApp((s) => s.info);
  const snap = useThrottled(
    useApp((s) => s.snap),
    50,
  );
  const gridSize = useApp((s) => s.settings.gridSize);
  const update = useApp((s) => s.update);
  const spec = useStateSpaceSpec();

  const finalFig = useMemo(() => (spec ? finalStateFigure(theme, spec, snap?.layerVis ?? null) : null), [spec, theme, snap]);
  const finalRef = usePlot(finalFig);

  const secondFig = useMemo(() => {
    if (!info) return null;
    if (info.regression) {
      const r = info.regression;
      return regressionFitFigure(theme, r.denseX, r.denseY, snap?.curve ?? null, info.trainX, info.trainY);
    }
    return decisionFigure(theme, snap?.decision ?? null, snap?.gridSize ?? gridSize, info.testX, info.testY, info.numClasses);
  }, [info, theme, snap, gridSize]);
  const secondRef = usePlot(secondFig);

  const thirdFig = useMemo(() => {
    if (!info) return null;
    if (info.regression) return residualsFigure(theme, info.testX, info.testY, snap?.predictions ?? null);
    return resultsFigure(theme, info.dataset as ClassificationDataset, info.testX, info.testY, snap?.predictions ?? null, info.numClasses);
  }, [info, theme, snap]);
  const thirdRef = usePlot(thirdFig);

  const regression = info?.task === 'regression';
  const qubits = info?.numQubits ?? 1;

  return (
    <Panel title="Results" area="results">
      <h3 className="subheading">
        Final state
        <span className="muted"> · {qubits === 1 ? 'Bloch sphere' : 'Q-simplex'}</span>
      </h3>
      <div ref={finalRef} className="chart chart-final" />
      <h3 className="subheading">{regression ? 'Fit with uncertainty' : 'Decision boundary'}</h3>
      <div ref={secondRef} className={`chart ${regression ? 'chart-wide' : 'chart-square'}`} />
      {!regression && (
        <div className="row legend-row">
          <span className="muted small">
            Color = score of class 0 ({qubits === 1 ? 'fidelity with Ψ0' : 'probability of |00⟩'})
          </span>
          <Field label="Resolution">
            <Select
              label="Decision grid resolution"
              value={gridSize}
              options={GRID_SIZES.map((g) => ({ value: g, label: `${g}×${g}` }))}
              onChange={(v) => update({ gridSize: v })}
            />
          </Field>
        </div>
      )}
      <div ref={thirdRef} className="chart chart-results" />
    </Panel>
  );
}
