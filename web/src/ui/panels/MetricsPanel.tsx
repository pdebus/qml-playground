import { useMemo } from 'react';
import { useApp } from '../../state/store';
import { metricsFigure } from '../../viz/charts';
import { usePlot } from '../../viz/plotly';
import { Panel } from '../controls/Controls';
import { useResolvedTheme, useThrottled } from '../hooks';

const fmt = (v: number | undefined, digits = 3) => (v === undefined || Number.isNaN(v) ? '–' : v.toFixed(digits));

export function MetricsPanel() {
  const theme = useResolvedTheme();
  const metrics = useThrottled(
    useApp((s) => s.metrics),
    100,
  );
  const task = useApp((s) => s.settings.task);
  const snap = useApp((s) => s.snap);
  const viewEpoch = snap && snap.epoch !== snap.latestEpoch ? snap.epoch : null;
  const regression = task === 'regression';
  const figure = useMemo(() => metricsFigure(theme, metrics, regression, viewEpoch), [theme, metrics, regression, viewEpoch]);
  const ref = usePlot(figure);

  const i = snap ? snap.epoch - metrics.base : -1;
  const at = (a: number[]) => (i >= 0 && i < a.length ? a[i] : undefined);

  return (
    <Panel
      title="Metrics"
      area="metrics"
      info={regression ? 'Mean squared error between ⟨Z⟩ and the targets.' : 'Training loss and classification accuracy on the training and test sets.'}
    >
      <div ref={ref} className="chart chart-metrics" />
      <dl className="stats">
        {regression ? (
          <>
            <div>
              <dt>Train MSE</dt>
              <dd>{fmt(at(metrics.train), 4)}</dd>
            </div>
            <div>
              <dt>Test MSE</dt>
              <dd>{fmt(at(metrics.test), 4)}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Loss</dt>
              <dd>{fmt(at(metrics.loss))}</dd>
            </div>
            <div>
              <dt>Train acc</dt>
              <dd>{fmt(at(metrics.train))}</dd>
            </div>
            <div>
              <dt>Test acc</dt>
              <dd>{fmt(at(metrics.test))}</dd>
            </div>
          </>
        )}
      </dl>
    </Panel>
  );
}
