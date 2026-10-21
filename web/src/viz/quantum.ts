/** Geometric representations of quantum states (port of `app/utils/qstate_representations.py`). */

/** Bloch vector (x, y, z) of a pure single-qubit state [re0, im0, re1, im1]. */
export function blochVector(s: ArrayLike<number>, o = 0): [number, number, number] {
  const ar = s[o], ai = s[o + 1], br = s[o + 2], bi = s[o + 3];
  return [2 * (ar * br + ai * bi), 2 * (ar * bi - ai * br), ar * ar + ai * ai - br * br - bi * bi];
}

/** Tangle (squared concurrence) of a pure two-qubit state: (2|a00·a11 − a01·a10|)². */
export function tangle(s: ArrayLike<number>, o = 0): number {
  const re = s[o] * s[o + 6] - s[o + 1] * s[o + 7] - (s[o + 2] * s[o + 4] - s[o + 3] * s[o + 5]);
  const im = s[o] * s[o + 7] + s[o + 1] * s[o + 6] - (s[o + 2] * s[o + 5] + s[o + 3] * s[o + 4]);
  return 4 * (re * re + im * im);
}

/**
 * Converts states (sample-major, `layers` states of `stateSize` floats per sample) into 4 visual floats each:
 * one qubit → Bloch (x, y, z, 0); two qubits → Q-simplex (p01, p10, p00, tangle).
 */
export function visualCoordinates(
  states: Float64Array,
  numSamples: number,
  layers: number,
  numQubits: 1 | 2,
): Float32Array {
  const ss = 2 << numQubits;
  const out = new Float32Array(numSamples * layers * 4);
  for (let i = 0; i < numSamples * layers; i++) {
    const so = i * ss;
    if (numQubits === 1) {
      const [x, y, z] = blochVector(states, so);
      out[4 * i] = x;
      out[4 * i + 1] = y;
      out[4 * i + 2] = z;
    } else {
      const p = (k: number) => states[so + 2 * k] ** 2 + states[so + 2 * k + 1] ** 2;
      out[4 * i] = p(1);
      out[4 * i + 1] = p(2);
      out[4 * i + 2] = p(0);
      out[4 * i + 3] = tangle(states, so);
    }
  }
  return out;
}
