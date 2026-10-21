import { useId, type ReactNode } from 'react';

export function Panel({ title, area, info, children, actions }: { title: string; area: string; info?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel" style={{ gridArea: area }} aria-label={title}>
      <header className="panel-header">
        <h2>
          {title}
          {info && <InfoTip>{info}</InfoTip>}
        </h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Small "i" button that reveals an explanation on hover or keyboard focus. */
export function InfoTip({ children }: { children: ReactNode }) {
  const id = useId();
  return (
    <span className="infotip">
      <button type="button" className="infotip-btn" aria-describedby={id} aria-label="More information">
        i
      </button>
      <span role="tooltip" id={id} className="infotip-body">
        {children}
      </span>
    </span>
  );
}

export function Field({ label, info, children, hint }: { label: string; info?: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">
        {label}
        {info && <InfoTip>{info}</InfoTip>}
      </div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <select
      className="select"
      aria-label={label}
      value={String(value)}
      disabled={disabled}
      onChange={(e) => {
        const opt = options.find((o) => String(o.value) === e.target.value);
        if (opt) onChange(opt.value);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format = String,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className="slider">
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${((value - min) / (max - min || 1)) * 100}%` }}
      />
      <output className="slider-value">{format(value)}</output>
    </div>
  );
}

const ICONS = {
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  step: 'M6 5.5v13l9-6.5zM16 5h2.5v14H16z',
  reset: 'M12 5a7 7 0 1 0 6.93 8h-2.04A5 5 0 1 1 12 7c1.38 0 2.63.56 3.54 1.46L13 11h6V5l-2.05 2.05A6.97 6.97 0 0 0 12 5z',
  forward: 'M4 6v12l8-6zM12 6v12l8-6z',
  share: 'M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z',
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-4-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z',
  moon: 'M20 15.3A8 8 0 0 1 8.7 4a8 8 0 1 0 11.3 11.3z',
  auto: 'M12 3a9 9 0 1 0 0 18V3z M12 3a9 9 0 0 1 0 18',
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d={ICONS[name]} fillRule="evenodd" />
    </svg>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary';
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`icon-btn ${variant}`} onClick={onClick} aria-label={label} title={label} disabled={disabled}>
      <Icon name={icon} size={variant === 'primary' ? 28 : 20} />
    </button>
  );
}
