import { createTaskData, fourierCurve, type TaskData } from '../data/datasets';
import { Rng } from '../data/rng';
import { QuantumModel, type TrainOptions } from '../model/qmodel';
import type { Settings } from '../state/settings';
import { blochVector, visualCoordinates } from '../viz/quantum';
import type { DataInfo, MetricsChunk, RestoreState, Snapshot } from './protocol';

/** Maximum number of epochs kept for replay (parameters + optimizer state per epoch). */
export const MAX_HISTORY = 5000;
const DENSE_POINTS = 400;

interface HistoryEntry {
  epoch: number;
  theta: Float32Array;
  m: Float32Array;
  v: Float32Array;
  t: number;
}

/**
 * Owns the model, data and training history. Runs in the Web Worker but has no worker dependencies,
 * so it can be unit-tested directly.
 */
export class Trainer {
  readonly configId: number;
  readonly data: TaskData;
  readonly model: QuantumModel;
  settings: Settings;

  private rng: Rng;
  private mcRng: Rng;
  private history: HistoryEntry[] = [];
  private metrics = { loss: [] as number[], train: [] as number[], test: [] as number[] };
  /** First metrics index not yet sent to the main thread. */
  private unsentFrom = 0;
  /** Epoch currently displayed; null while following the latest epoch. */
  viewEpoch: number | null = null;
  private dense?: { x: Float64Array; y: Float64Array };
  private lastCurve?: { key: string; curve: { mean: Float32Array; std: Float32Array } };

  constructor(configId: number, settings: Settings, restore?: RestoreState) {
    this.configId = configId;
    this.settings = settings;
    this.data = createTaskData(settings.task, settings.dataset, settings.seed);
    this.model = new QuantumModel({
      task: settings.task,
      dataset: settings.dataset,
      numQubits: settings.numQubits,
      numLayers: settings.numLayers,
    });
    this.model.init(settings.seed);
    this.rng = new Rng(settings.seed ^ 0x9e3779b9);
    this.mcRng = new Rng(settings.seed ^ 0x85ebca6b);
    if (restore && restore.theta.length === this.model.theta.length) {
      this.model.setParams(restore.theta);
      this.model.epoch = Math.max(0, Math.floor(restore.epoch));
    }
    this.metricsStart = this.model.epoch;
    if (settings.task === 'regression') {
      const [x, y] = fourierCurve(settings.dataset, DENSE_POINTS);
      this.dense = { x, y };
    }
    this.record();
  }

  get latestEpoch(): number {
    return this.model.epoch;
  }

  get firstEpoch(): number {
    return this.history.length ? this.history[0].epoch : this.model.epoch;
  }

  /** Metrics entry i belongs to epoch metricsStart + i (the epoch the trainer was created with). */
  private metricsStart = 0;

  get trainOptions(): TrainOptions {
    const { lr, batchSize, regType, regStrength } = this.settings;
    return { lr, batchSize, regType, regStrength };
  }

  dataInfo(): DataInfo {
    const { task, dataset, numQubits, numLayers } = this.settings;
    const reg = this.data.regression;
    return {
      configId: this.configId,
      task,
      dataset,
      numQubits,
      numLayers,
      numClasses: this.model.numClasses,
      trainX: this.data.train.x,
      trainY: this.data.train.y,
      testX: this.data.test.x,
      testY: this.data.test.y,
      targetsBloch: this.model.targets.map((t) => blochVector(t)),
      regression:
        reg && this.dense
          ? {
              gridX: reg.x,
              gridYTrue: reg.yTrue,
              gridYNoisy: reg.yNoisy,
              trainMask: reg.trainMask,
              denseX: this.dense.x,
              denseY: this.dense.y,
            }
          : undefined,
    };
  }

  /** Evaluates the current parameters and appends metrics + history for the current epoch. */
  private record(): void {
    const train = this.model.evaluate(this.data.train);
    const test = this.model.evaluate(this.data.test);
    const isReg = this.settings.task === 'regression';
    this.metrics.loss.push(train.loss);
    this.metrics.train.push(isReg ? train.loss : train.accuracy);
    this.metrics.test.push(isReg ? test.loss : test.accuracy);
    const a = this.model.adam;
    this.history.push({
      epoch: this.model.epoch,
      theta: Float32Array.from(this.model.theta),
      m: Float32Array.from(a.m),
      v: Float32Array.from(a.v),
      t: a.t,
    });
    if (this.history.length > MAX_HISTORY) this.history.shift();
  }

  stepEpoch(): void {
    if (this.viewEpoch !== null) this.resumeFrom(this.viewEpoch);
    this.model.trainEpoch(this.data.train, this.trainOptions, this.rng);
    this.record();
  }

  private entry(epoch: number): HistoryEntry | undefined {
    const i = epoch - this.firstEpoch;
    return this.history[i];
  }

  seek(epoch: number): void {
    const clamped = Math.min(this.latestEpoch, Math.max(this.firstEpoch, Math.round(epoch)));
    this.viewEpoch = clamped === this.latestEpoch ? null : clamped;
  }

  /** Truncates history and metrics after `epoch` and restores the model + optimizer state at that epoch. */
  resumeFrom(epoch: number): void {
    const e = this.entry(Math.min(this.latestEpoch, Math.max(this.firstEpoch, Math.round(epoch))));
    this.viewEpoch = null;
    if (!e || e.epoch === this.latestEpoch) return;
    this.model.setParams(e.theta);
    this.model.adam.m.set(e.m);
    this.model.adam.v.set(e.v);
    this.model.adam.t = e.t;
    this.model.epoch = e.epoch;
    this.history.length = e.epoch - this.firstEpoch + 1;
    const keep = e.epoch - this.metricsStart + 1;
    this.metrics.loss.length = keep;
    this.metrics.train.length = keep;
    this.metrics.test.length = keep;
    this.unsentFrom = Math.min(this.unsentFrom, keep);
  }

  private takeMetrics(): MetricsChunk {
    const from = this.unsentFrom;
    this.unsentFrom = this.metrics.loss.length;
    return {
      base: this.metricsStart,
      from: this.metricsStart + from,
      loss: this.metrics.loss.slice(from),
      train: this.metrics.train.slice(from),
      test: this.metrics.test.slice(from),
    };
  }

  /** Re-send the complete metrics history with the next snapshot. */
  resendMetrics(): void {
    this.unsentFrom = 0;
  }

  /**
   * Builds a snapshot for the displayed epoch. While viewing history the model parameters are temporarily
   * swapped for the recorded ones.
   */
  snapshot(options: { mc: boolean } = { mc: true }): Snapshot {
    const { model, settings } = this;
    const viewing = this.viewEpoch !== null ? this.entry(this.viewEpoch) : undefined;
    const saved = viewing ? model.theta.slice() : undefined;
    if (viewing) model.setParams(viewing.theta);

    const test = model.evaluate(this.data.test);
    const layerVis = visualCoordinates(test.states, this.data.test.n, settings.numLayers, settings.numQubits);
    let decision: Float32Array | undefined;
    let curve: Snapshot['curve'];
    if (settings.task === 'classification') {
      decision = Float32Array.from(model.decisionGrid(settings.gridSize));
    } else if (this.dense) {
      // MC sampling is the most expensive part of a snapshot; callers may skip it and reuse the last curve.
      const key = `${viewing?.epoch ?? model.epoch}|${settings.noiseSigma}|${settings.mcRuns}`;
      const cheap = settings.noiseSigma <= 0 || settings.mcRuns <= 1;
      if (this.lastCurve?.key !== key && (cheap || options.mc || !this.lastCurve)) {
        const { mean, std } = model.predictMc(this.dense.x, settings.noiseSigma, settings.mcRuns, this.mcRng);
        this.lastCurve = { key, curve: { mean: Float32Array.from(mean), std: Float32Array.from(std) } };
      }
      curve = this.lastCurve!.curve;
    }
    const theta = Float32Array.from(model.theta);
    if (saved) model.setParams(saved);

    return {
      configId: this.configId,
      epoch: viewing?.epoch ?? model.epoch,
      latestEpoch: this.latestEpoch,
      firstEpoch: this.firstEpoch,
      metrics: this.takeMetrics(),
      layerVis,
      predictions: Float32Array.from(test.predictions),
      decision,
      gridSize: settings.gridSize,
      curve,
      theta,
    };
  }
}
