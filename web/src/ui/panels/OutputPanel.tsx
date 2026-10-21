import { useMemo } from 'react';
import { useApp } from '../../state/store';
import { GRID_SIZES } from '../../state/settings';
import { regressionFitFigure } from '../../viz/charts';
import { usePlot } from '../../viz/plotly';
import { CLASS_COLORS } from '../../viz/theme';
import { Panel, Select } from '../controls/Controls';
import { useFollowedSample, useResolvedTheme, useThrottled } from '../hooks';
import { DecisionMap } from '../output/DecisionMap';

/** The model's output over the input space: the end of the circuit, shown large as in TF Playground. */
export function OutputPanel() {
  const theme = useResolvedTheme();
  const info = useApp((s) => s.info);
  const snap = useThrottled(
    useApp((s) => s.snap),
    50,
  );
  const gridSize = useApp((s) => s.settings.gridSize);
  const update = useApp((s) => s.update);
  const regression = info?.task === 'regression';
  const followed = useFollowedSample(snap);
  const fx = followed && regression ? followed.x[0] : null;
  const fy = followed && regression ? followed.prediction : null;

  const fit = useMemo(() => {
    if (!info?.regression) return null;
    const r = info.regression;
    const hl = fx !== null && fy !== null && !Number.isNaN(fy) ? { x: fx, y: fy } : null;
    return regressionFitFigure(theme, r.denseX, r.denseY, snap?.curve ?? null, info.trainX, info.trainY, hl);
  }, [info, theme, snap, fx, fy]);
  const fitRef = usePlot(fit);

  return (
    <Panel
      title="Output"
      area="output"
      info={
        regression
          ? 'Model output ⟨Z⟩ of qubit 1 over x, with a ±2σ Monte Carlo uncertainty band (see Settings → Uncertainty), the ground truth and the training samples.'
          : 'Model output over the whole input space: the predicted class color, faded where the model is unsure. The line is the decision boundary (p = 0.5 for two classes). Dots are the test samples in their true class colors: hover one to follow it through the circuit, click to pin it (Esc clears).'
      }
      actions={
        !regression && (
          <div className="panel-actions">
            <Select
              label="Decision grid resolution"
              value={gridSize}
              options={GRID_SIZES.map((g) => ({ value: g, label: `${g}×${g}` }))}
              onChange={(v) => update({ gridSize: v })}
            />
          </div>
        )
      }
    >
      {info &&
        (regression ? (
          <div ref={fitRef} className="chart chart-output" />
        ) : (
          <>
            <DecisionMap
              info={info}
              scores={snap?.decision ?? null}
              n={snap?.gridSize ?? gridSize}
              theme={theme}
              followed={followed?.index ?? null}
              predictions={snap?.predictions ?? null}
            />
            <div className="unit-legend">
              {CLASS_COLORS.slice(0, info.numClasses).map((c, i) => (
                <span key={i} className="unit-legend-chip">
                  <i style={{ background: c }} /> class {i}
                </span>
              ))}
              <span className="unit-legend-chip">
                <i className="legend-line" /> decision boundary
              </span>
            </div>
          </>
        ))}
    </Panel>
  );
}
