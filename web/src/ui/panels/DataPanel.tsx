import { useMemo } from 'react';
import { useApp } from '../../state/store';
import { BATCH, MC_RUNS, SIGMA } from '../../state/settings';
import { datasetsFor } from '../../data/datasets';
import { dataFigure, regressionDataFigure } from '../../viz/charts';
import { usePlot } from '../../viz/plotly';
import { Field, Panel, Segmented, Select, Slider } from '../controls/Controls';
import { useResolvedTheme } from '../hooks';

export function DataPanel() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const info = useApp((st) => st.info);
  const theme = useResolvedTheme();
  const regression = s.task === 'regression';

  const figure = useMemo(() => {
    if (!info) return null;
    if (info.regression) {
      const r = info.regression;
      return regressionDataFigure(theme, r.gridX, r.gridYTrue, r.gridYNoisy, r.trainMask);
    }
    return dataFigure(theme, info.testX, info.testY, info.numClasses);
  }, [info, theme]);
  const ref = usePlot(figure);

  const datasets = Object.entries(datasetsFor(s.task)).map(([value, label]) => ({ value, label }));

  return (
    <Panel title="Data & Uncertainty" area="data">
      <Field
        label="Task"
        info="Classification: 2-D points with class labels. Regression: fit a 1-D Fourier series with the expectation value ⟨Z⟩ of the first qubit."
      >
        <Segmented
          label="Task type"
          value={s.task}
          options={[
            { value: 'classification', label: 'Classification' },
            { value: 'regression', label: 'Regression' },
          ]}
          onChange={(v) => update({ task: v })}
        />
      </Field>
      <Field label="Data set">
        <Select label="Data set" value={s.dataset as string} options={datasets} onChange={(v) => update({ dataset: v as typeof s.dataset })} />
      </Field>
      <div
        ref={ref}
        className="chart chart-square"
        role="img"
        aria-label={regression ? 'Ground-truth function and noisy training samples' : 'Test data colored by class'}
      />
      {regression && <div className="field-hint">Training samples leave gaps at x ≈ 0 and x &gt; 0.8 to probe generalization.</div>}
      <Field label="Batch size" info="Samples per Adam step. An epoch is one pass over the shuffled training set.">
        <Slider label="Batch size" value={s.batchSize} min={BATCH.min} max={BATCH.max} onChange={(v) => update({ batchSize: v })} />
      </Field>

      <h3 className="subheading">Uncertainty quantification</h3>
      <Field
        label="Gaussian noise σ"
        info="Monte Carlo estimate of predictive uncertainty: every inference run adds N(0, σ²) noise to all weights and biases. The band in the regression fit shows ±2 standard deviations."
        hint={regression ? undefined : 'Applies to regression tasks.'}
      >
        <Slider
          label="Gaussian noise sigma"
          value={s.noiseSigma}
          min={SIGMA.min}
          max={SIGMA.max}
          step={SIGMA.step}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update({ noiseSigma: v })}
          disabled={!regression}
        />
      </Field>
      <Field label="MC runs (inference)">
        <Slider label="Monte Carlo runs" value={s.mcRuns} min={MC_RUNS.min} max={MC_RUNS.max} onChange={(v) => update({ mcRuns: v })} disabled={!regression} />
      </Field>
    </Panel>
  );
}
