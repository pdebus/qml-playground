import { useState } from 'react';
import { useApp } from '../../state/store';
import { SPEED_OPTIONS } from '../../state/settings';
import { Field, IconButton, Panel, Select } from '../controls/Controls';

const speedLabel = (s: number) => (s === 0 ? 'Max' : `${s} / s`);

export function ControlPanel() {
  const playing = useApp((s) => s.playing);
  const busy = useApp((s) => s.busy);
  const speed = useApp((s) => s.settings.speed);
  const epoch = useApp((s) => s.snap?.epoch ?? 0);
  const { togglePlay, step, reset, fastForward, update } = useApp.getState();

  return (
    <Panel title="Control" area="control">
      <div className="transport">
        <IconButton icon="reset" label="Reset model" onClick={reset} />
        <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause training' : 'Start training'} onClick={togglePlay} variant="primary" />
        <IconButton icon="step" label="Train a single epoch" onClick={step} />
        <div className="epoch">
          <span className="epoch-label">Epoch</span>
          <span className="epoch-value" aria-live="polite">
            {epoch}
          </span>
        </div>
      </div>
      <div className="row">
        <Field label="Speed" info="Training epochs per second while playing. 'Max' trains as fast as your device allows.">
          <Select
            label="Training speed"
            value={speed}
            options={SPEED_OPTIONS.map((s) => ({ value: s, label: speedLabel(s) }))}
            onChange={(v) => update({ speed: v })}
          />
        </Field>
        <Field label="Fast-forward">
          <div className="button-row">
            {[100, 1000].map((n) => (
              <button key={n} type="button" className="btn" onClick={() => fastForward(n)} disabled={busy}>
                +{n}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <EpochScrubber />
      <ShareButtons />
    </Panel>
  );
}

function EpochScrubber() {
  const snap = useApp((s) => s.snap);
  const { seek, resumeFrom, goLive } = useApp.getState();
  if (!snap) return null;
  const { epoch, latestEpoch, firstEpoch } = snap;
  const viewing = epoch !== latestEpoch;
  return (
    <div className="scrubber">
      <div className="field-label">
        Replay
        <span className="muted">
          {viewing ? `viewing epoch ${epoch} of ${latestEpoch}` : latestEpoch > firstEpoch ? 'drag to replay training' : ''}
        </span>
      </div>
      <input
        type="range"
        aria-label="Replay epoch"
        min={firstEpoch}
        max={Math.max(latestEpoch, firstEpoch + 1)}
        value={epoch}
        disabled={latestEpoch === firstEpoch}
        onChange={(e) => seek(Number(e.target.value))}
        style={{ ['--fill' as string]: `${((epoch - firstEpoch) / Math.max(1, latestEpoch - firstEpoch)) * 100}%` }}
      />
      {viewing && (
        <div className="button-row">
          <button type="button" className="btn" onClick={() => resumeFrom(epoch)} title="Discard later epochs and continue training from here">
            Resume from here
          </button>
          <button type="button" className="btn" onClick={goLive}>
            Back to latest
          </button>
        </div>
      )}
    </div>
  );
}

function ShareButtons() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (withParams: boolean) => {
    const url = useApp.getState().shareUrl(withParams);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(withParams ? 'Link with trained model copied' : 'Link copied');
    } catch {
      window.prompt('Copy this link:', url);
    }
    setTimeout(() => setCopied(null), 2000);
  };
  return (
    <div className="share">
      <div className="button-row">
        <button type="button" className="btn" onClick={() => copy(false)} title="Link to the current settings">
          Share settings
        </button>
        <button type="button" className="btn" onClick={() => copy(true)} title="Link that also restores the parameters shown right now">
          Share trained model
        </button>
      </div>
      <div className="field-hint" aria-live="polite">
        {copied ?? ' '}
      </div>
    </div>
  );
}
