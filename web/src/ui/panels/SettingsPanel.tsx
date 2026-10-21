import { useApp } from '../../state/store';
import { LAYERS, LR_OPTIONS, REG_STRENGTH_OPTIONS, REG_TYPES } from '../../state/settings';
import { Field, IconButton, Panel, Segmented, Select, Slider } from '../controls/Controls';

export function SettingsPanel() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);

  return (
    <Panel title="Settings" area="settings">
      <div className="settings-grid">
        <Field
          label="Number of qubits"
          info="One qubit: states live on the Bloch sphere. Two qubits: the circuit can create entanglement, shown in the Q-simplex."
        >
          <Segmented
            label="Number of qubits"
            value={s.numQubits}
            options={[
              { value: 1, label: 'Single qubit' },
              { value: 2, label: 'Two qubits' },
            ]}
            onChange={(v) => update({ numQubits: v })}
          />
        </Field>
        <Field label="Learning rate" info="Step size of the Adam optimizer.">
          <Select label="Learning rate" value={s.lr} options={LR_OPTIONS.map((v) => ({ value: v, label: String(v) }))} onChange={(v) => update({ lr: v })} />
        </Field>
        <Field
          label="Regularization"
          info="Adds a penalty on the circuit parameters to the loss: L1 = λ·Σ|θ| pushes parameters to zero, L2 = λ·Σθ² keeps them small and smooths the learned function."
        >
          <Select label="Regularization type" value={s.regType} options={REG_TYPES} onChange={(v) => update({ regType: v })} />
        </Field>
        <Field label="Strength λ">
          <Select
            label="Regularization strength"
            value={s.regStrength}
            disabled={s.regType === 'none'}
            options={REG_STRENGTH_OPTIONS.map((v) => ({ value: v, label: String(v) }))}
            onChange={(v) => update({ regStrength: v })}
          />
        </Field>
      </div>
      <div className="row row-wide">
        <Field
          label="Layers"
          info="Each layer re-uploads the input data through trainable rotations Rot(w·x + b). More layers make the model more expressive, like depth in a neural network."
        >
          <Slider label="Number of layers" value={s.numLayers} min={LAYERS.min} max={LAYERS.max} onChange={(v) => update({ numLayers: v })} />
        </Field>
        <Field label="Seed" info="Controls parameter initialization, data noise and shuffling. The same seed reproduces the same training run.">
          <div className="seed">
            <input
              className="input"
              type="number"
              min={0}
              aria-label="Random seed"
              value={s.seed}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isInteger(v) && v >= 0 && v < 2 ** 32) update({ seed: v });
              }}
            />
            <IconButton icon="dice" label="New random seed" onClick={() => update({ seed: Math.floor(Math.random() * 100000) })} />
          </div>
        </Field>
      </div>
    </Panel>
  );
}
