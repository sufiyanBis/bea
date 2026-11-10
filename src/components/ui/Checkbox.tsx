import { Check, Minus } from 'lucide-react';
import { ReactNode } from 'react';

export type TriState = 'on' | 'off' | 'mixed';

interface Props {
  checked: boolean | TriState;
  onChange: (next: boolean) => void;
  children?: ReactNode;
  className?: string;
  tourKey?: string;
  disabled?: boolean;
  /** accessible name when the checkbox has no visible text */
  ariaLabel?: string;
}

/** Custom checkbox supporting tri-state. Whole label is the click target. */
export function Checkbox({ checked, onChange, children, className = '', tourKey, disabled, ariaLabel }: Props) {
  const state: TriState = checked === true ? 'on' : checked === false ? 'off' : checked;
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-default' : ''} ${className}`} data-tour={tourKey}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={state === 'on'}
        disabled={disabled}
        aria-label={ariaLabel ?? (children ? undefined : 'Select')}
        ref={(el) => { if (el) el.indeterminate = state === 'mixed'; }}
        onChange={() => onChange(state !== 'on')}
      />
      <span
        aria-hidden
        className={`w-[16px] h-[16px] shrink-0 rounded-[2px] border flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
          state === 'off' ? 'bg-white border-[#9a9a9a]' : 'bg-primary border-primary text-white'
        }`}
      >
        {state === 'on' && <Check size={12} strokeWidth={3} />}
        {state === 'mixed' && <Minus size={12} strokeWidth={3} />}
      </span>
      {children !== undefined && <span className="min-w-0">{children}</span>}
    </label>
  );
}
