import { describe, expect, it } from 'vitest';
import { Trainer } from '../src/worker/trainer';
import { DEFAULT_SETTINGS, type Settings } from '../src/state/settings';

const settings: Settings = { ...DEFAULT_SETTINGS, numQubits: 2, numLayers: 3, speed: 0 };

describe('Trainer', () => {
  it('streams metrics incrementally, starting with epoch 0', () => {
    const t = new Trainer(1, settings);
    const s0 = t.snapshot();
    expect(s0.epoch).toBe(0);
    expect(s0.metrics).toMatchObject({ base: 0, from: 0 });
    expect(s0.metrics.loss).toHaveLength(1);
    t.stepEpoch();
    t.stepEpoch();
    const s1 = t.snapshot();
    expect(s1.metrics.from).toBe(1);
    expect(s1.metrics.loss).toHaveLength(2);
    expect(s1.latestEpoch).toBe(2);
    expect(s1.layerVis).toHaveLength(300 * 3 * 4);
    expect(s1.decision).toHaveLength(settings.gridSize ** 2);
  });

  it('seek shows historic parameters without changing the latest state', () => {
    const t = new Trainer(1, settings);
    const theta0 = t.snapshot().theta;
    for (let i = 0; i < 5; i++) t.stepEpoch();
    const latest = t.snapshot().theta;
    t.seek(0);
    const past = t.snapshot();
    expect(past.epoch).toBe(0);
    expect(Array.from(past.theta)).toEqual(Array.from(theta0));
    t.seek(5);
    expect(Array.from(t.snapshot().theta)).toEqual(Array.from(latest));
  });

  it('resumeFrom truncates history and reproduces the same continuation', () => {
    const a = new Trainer(1, settings);
    for (let i = 0; i < 4; i++) a.stepEpoch();
    a.snapshot();
    a.resumeFrom(2);
    const snap = a.snapshot();
    expect(snap.latestEpoch).toBe(2);
    expect(snap.metrics.from).toBe(3); // nothing new after truncation
    a.stepEpoch();
    const after = a.snapshot();
    expect(after.metrics.from).toBe(3);
    expect(after.latestEpoch).toBe(3);
  });

  it('restores shared parameters', () => {
    const a = new Trainer(1, settings);
    for (let i = 0; i < 3; i++) a.stepEpoch();
    const theta = a.snapshot().theta;
    const b = new Trainer(2, settings, { theta, epoch: 3 });
    const s = b.snapshot();
    expect(s.epoch).toBe(3);
    expect(s.metrics.base).toBe(3);
    expect(Array.from(s.theta)).toEqual(Array.from(theta));
  });

  it('regression snapshots include the MC curve', () => {
    const t = new Trainer(1, { ...settings, task: 'regression', dataset: 'fourier_2', noiseSigma: 0.1, mcRuns: 5 });
    const s = t.snapshot();
    expect(s.curve?.mean).toHaveLength(400);
    expect(Math.max(...s.curve!.std)).toBeGreaterThan(0);
    expect(s.decision).toBeUndefined();
  });
});
