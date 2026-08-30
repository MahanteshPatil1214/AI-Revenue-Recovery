import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTipProps {
  text: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  /** Render the tooltip as an inline label instead of a floating icon. */
  asLabel?: boolean;
}

/**
 * Lightweight hover explanation used across the dashboard so a reviewer can
 * immediately understand what each metric, badge or control means and why it
 * exists (and the business outcome it maps to).
 *
 * Pure React state on <Info/> keeps it simple and dependency-free; the popup is
 * absolutely positioned relative to the wrapping span.
 */
export const InfoTip: React.FC<InfoTipProps> = ({
  text,
  title,
  position = 'top',
  className = '',
  asLabel = false,
}) => {
  const [open, setOpen] = useState(false);
  const posCls =
    position === 'bottom'
      ? 'top-full mt-1.5 left-1/2 -translate-x-1/2'
      : position === 'left'
        ? 'right-full mr-2 top-1/2 -translate-y-1/2'
        : position === 'right'
          ? 'left-full ml-2 top-1/2 -translate-y-1/2'
          : 'bottom-full mb-1.5 left-1/2 -translate-x-1/2';

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {asLabel ? (
        <span className="cursor-help">{text}</span>
      ) : (
        <Info size={14} className="text-slate-400 hover:text-blue-600 cursor-help shrink-0 transition" />
      )}

      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 w-64 px-3 py-2.5 rounded-lg bg-slate-900 text-slate-50 text-[11px] leading-relaxed shadow-xl ring-1 ring-black/10 ${posCls}`}
        >
          {title && <span className="block font-bold text-slate-100 mb-0.5">{title}</span>}
          {text}
        </span>
      )}
    </span>
  );
};
