import { useMemo } from 'react';
import { useApp } from '../../state/store';
import { circuitFigure } from '../../viz/charts';
import { layerGridColumns, layerGridFigure, LAYER_ROW_HEIGHT } from '../../viz/stateSpace';
import { usePlot } from '../../viz/plotly';
import { Panel } from '../controls/Controls';
import { useResolvedTheme, useStateSpaceSpec, useThrottled, useWidth } from '../hooks';

export function ModelPanel() {
  const theme = useResolvedTheme();
  const info = useApp((s) => s.info);
  const snap = useThrottled(
    useApp((s) => s.snap),
    120,
  );
  const spec = useStateSpaceSpec();
  const [wrapRef, width] = useWidth<HTMLDivElement>();

  const circuit = useMemo(
    () => (info ? circuitFigure(theme, info.numQubits, info.numLayers, snap?.theta ?? null) : null),
    [info, theme, snap],
  );
  const circuitRef = usePlot(circuit);

  const cols = spec ? layerGridColumns(spec.numLayers, width) : 2;
  const layers = useMemo(() => (spec ? layerGridFigure(theme, spec, snap?.layerVis ?? null, cols) : null), [spec, theme, snap, cols]);
  const layersRef = usePlot(layers);
  const rows = spec ? Math.ceil((spec.numLayers - 1) / cols) : 0;
  const qubits = info?.numQubits ?? 1;

  return (
    <Panel
      title="Model"
      area="model"
      info={
        <>
          Data re-uploading circuit: every layer applies Rot(φ, θ, ω) = RZ(ω)RY(θ)RZ(φ) per qubit with angles w·x + b
          {qubits === 2 ? ', followed by a CNOT that can entangle the qubits' : ''}. Gate colors summarize the trained
          parameters (hover for details). Below: the test states after every layer.
        </>
      }
    >
      <div ref={circuitRef} className={`chart chart-circuit q${qubits}`} />
      <div ref={wrapRef} className="layer-grid-wrap">
        {spec && spec.numLayers > 1 ? (
          <div ref={layersRef} className="chart" style={{ height: rows * LAYER_ROW_HEIGHT }} />
        ) : (
          <p className="muted center">With a single layer, the final state is shown under Results.</p>
        )}
      </div>
      <p className="legend-note muted">
        {qubits === 1
          ? 'Bloch sphere: each dot is one test sample; colors are the true classes.'
          : 'Q-simplex: position = basis-state probabilities, marker size = entanglement (tangle). Bell states lie on the bold edges.'}
      </p>
    </Panel>
  );
}
