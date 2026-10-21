import { useMemo } from 'react';
import { useApp } from '../../state/store';
import { layerGridColumns, layerGridFigure, LAYER_ROW_HEIGHT } from '../../viz/stateSpace';
import { usePlot } from '../../viz/plotly';
import { CircuitView } from '../circuit/CircuitView';
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
          Data re-uploading circuit: every layer applies Rot(φ, θ, ω) = RZ(ω)·RY(θ)·RZ(φ) on each qubit, with each angle
          set to w·x + b for one input feature{qubits === 2 ? ', followed by a CNOT that can entangle the qubits' : ''}.
          Re-uploading the data in every layer makes the model more expressive, like depth in a neural network.
        </>
      }
    >
      {info ? <CircuitView info={info} snap={snap} theme={theme} /> : <div className="circuit-placeholder" />}
      <h3 className="subheading">
        Test states after each layer
        <span className="muted"> · {qubits === 1 ? 'Bloch sphere' : 'Q-simplex'}</span>
      </h3>
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
