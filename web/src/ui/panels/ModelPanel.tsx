import { useMemo } from 'react';
import { useApp } from '../../state/store';
import { layerGridColumns, layerGridFigure, LAYER_ROW_HEIGHT } from '../../viz/stateSpace';
import { usePlot } from '../../viz/plotly';
import { CircuitView } from '../circuit/CircuitView';
import { Panel } from '../controls/Controls';
import { useResolvedTheme, useStateSpaceSpec, useThrottled, useWidth } from '../hooks';

/** Full-width circuit pane: the interpretable model view. */
export function CircuitPanel() {
  const theme = useResolvedTheme();
  const info = useApp((s) => s.info);
  const snap = useThrottled(
    useApp((s) => s.snap),
    120,
  );
  const qubits = info?.numQubits ?? 1;

  return (
    <Panel
      title="Circuit"
      area="circuit"
      info={
        <>
          Data re-uploading circuit: every layer applies Rot(φ, θ, ω) = RZ(ω)·RY(θ)·RZ(φ) on each qubit, with each angle
          set to w·x + b for one input feature{qubits === 2 ? ', followed by a CNOT that can entangle the qubits' : ''}.
          Re-uploading the data in every layer makes the model more expressive, like depth in a neural network.
        </>
      }
    >
      {info ? <CircuitView info={info} snap={snap} theme={theme} /> : <div className="circuit-placeholder" />}
    </Panel>
  );
}

/** States of the test samples after every layer, on the Bloch sphere or in the Q-simplex. */
export function LayerStatesPanel() {
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
      title="Layer states"
      area="layers"
      info={
        qubits === 1
          ? 'Bloch sphere: each dot is one test sample after the given layer; colors are the true classes. The last layer is shown under Results.'
          : 'Q-simplex: position = basis-state probabilities, marker size = entanglement (tangle). Bell states lie on the bold edges. The last layer is shown under Results.'
      }
    >
      <div ref={wrapRef} className="layer-grid-wrap">
        {spec && spec.numLayers > 1 ? (
          <div ref={layersRef} className="chart" style={{ height: rows * LAYER_ROW_HEIGHT }} />
        ) : (
          <p className="muted center">With a single layer, the final state is shown under Results.</p>
        )}
      </div>
    </Panel>
  );
}
