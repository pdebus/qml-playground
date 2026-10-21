# QML Playground – web app

A fully client-side rewrite of the QML Playground. The quantum state-vector simulator, training and all
visualizations run in the browser, so the app is a static site that can be hosted on GitHub Pages.
It supports one and two qubits, classification and regression, L1/L2 regularization and Monte Carlo
uncertainty, the same as the Dash app in `../app`.

## Development

Requires Node.js 20+.

```bash
cd web
npm install
npm run dev        # http://localhost:5173/
npm test           # Vitest: PyTorch parity, gradients, trainer
npm run lint
npm run build      # static site in dist/
npm run preview    # serve dist/
```

To build for a sub-path, set `VITE_BASE`:
```bash
VITE_BASE=/qml-playground/ npm run build && VITE_BASE=/qml-playground/ npm run preview
# → http://localhost:4173/qml-playground/
```
In Git Bash on Windows, prefix with `MSYS_NO_PATHCONV=1`. Otherwise MSYS rewrites `/qml-playground/` into a Windows path.

## Deployment

`.github/workflows/pages.yml` builds, tests and deploys `web/` on every push to `main` that touches it.
The base path comes from the repository's own Pages configuration, so the same code deploys to
`pdebus.github.io/qml-playground/` and `fraunhofer-aisec.github.io/qml-playground/` without changes.
To enable deployment on a repository:

1. Go to *Settings → Pages → Build and deployment*, and set *Source* to **GitHub Actions**.
2. Optional: set the repository variable `PAGES_BASE_PATH` to override the base path, e.g. `/` for a custom
   domain. A `CNAME` file for a custom domain goes into `web/public/`.

## Architecture

```
src/sim/      complex 2×2 gates, Rot + analytic derivatives, the re-uploading circuit with adjoint backward pass
src/model/    losses (fidelity, NLL, MSE on ⟨Z⟩) with ∂ℓ/∂ψ, Adam (torch semantics), regularization, QuantumModel
src/data/     seeded RNG, dataset generators, single-qubit target states
src/worker/   Trainer (model + replay history, no DOM deps) and the Web Worker loop / message protocol
src/state/    Zustand store bridging UI and worker, settings model, URL hash encoding
src/viz/      Plotly partial bundle + figure builders (Bloch sphere, Q-simplex, circuit, decision boundary, …)
src/ui/       React panels and controls
tests/        Vitest suites; fixtures/reference.json is generated from the PyTorch app
```

- **Simulation.** States are interleaved `Float64Array`s. Every layer applies `Rot(φ,θ,ω) = RZ(ω)RY(θ)RZ(φ)` per
  qubit with angles `w·x + b`, then `CNOT(0→1)` for two qubits. Qubit 0 is the most significant bit.
  Gradients are exact. The adjoint method walks the layers backwards, computing `∂L/∂a = Re⟨g|∂U/∂a|ψ⟩` and
  `g ← U†g`. An epoch of the largest configuration (2 qubits, 15 layers, 500 samples) takes about 10 ms.
- **Real-time loop.** The worker trains at the selected speed (1–60 epochs/s, or max). After each epoch it
  evaluates train and test sets and posts snapshots at most every ~33 ms, using transferable typed arrays.
  Heavy charts throttle their own redraws. Plotly's `react` diffs figures, and a constant `uirevision`
  keeps the camera you have rotated to.
- **Replay.** Parameters and Adam state are recorded per epoch, for the last 5000 epochs. Seeking shows a past
  epoch. *Resume from here* truncates the history and continues training from that point.
- **Sharing.** Settings are kept in the URL hash. *Share trained model* also encodes the displayed parameters
  (`p`, base64url float32) and the epoch (`ep`).

## Parity with the PyTorch reference

`tools/export_fixtures.py` (repository root) runs the original `app/` modules on fixed inputs and parameters,
and records per-layer states, losses, gradients (with and without L1/L2), predictions, Adam steps, dataset
labels, targets and Fourier curves. Regenerate the fixtures after changing the Python reference:

```bash
pip install -r requirements.txt
python tools/export_fixtures.py
```

The tests compare at float32 precision, because the reference runs in complex64.

### Intentional differences (bug fixes)

| Reference behavior | Web app |
|---|---|
| A new Adam optimizer is created every epoch, which resets its moment estimates | Optimizer state persists; it is reset only when the model is reset |
| Regression noise uses unseeded `np.random`, so the data changes on every reload | Seeded and reproducible |
| A batch size larger than the training set (e.g. 128 on the ~80 regression samples) trains nothing | The batch is clamped to the data set size |
| The circuit diagram shows CZ symbols and no entangler after the last layer | Shows the CNOT that is actually applied after every layer |
| The live "predicted class" panel is colored by the true labels | Colored by the predictions |
| 15×15 decision grid with autoscaled colors | Configurable grid (default 40×40) with a fixed [0, 1] color scale |

Random draws (initialization, data points, shuffling) come from a seeded PRNG rather than torch's, so
individual runs differ numerically from the Dash app while following the same distributions.
