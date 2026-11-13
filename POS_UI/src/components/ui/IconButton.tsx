import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title' | 'aria-label'> & {
  label: string;
  icon: React.ReactNode;
};

export function IconButton({ label, icon, className = '', disabled, onClick, onDoubleClick, ...props }: IconButtonProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const trigger = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const start = useRef<{x: number; y: number} | null>(null);
  const held = useRef(false);
  const suppressDoubleUntil = useRef(0);
  const id = useId();
  const cancelTimer = () => { clearTimeout(timer.current); start.current = null; };
  useLayoutEffect(() => {
    const dismiss = () => { if (start.current) held.current = true; cancelTimer(); setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !tooltip.current?.contains(event.target as Node)) dismiss();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    document.addEventListener('pointerdown', onOutside, true);
    return () => {
      clearTimeout(timer.current);
      clearTimeout(closeTimer.current);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      document.removeEventListener('pointerdown', onOutside, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !trigger.current || !tooltip.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const tip = tooltip.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(anchor.left + (anchor.width - tip.width) / 2, innerWidth - tip.width - 8));
    const top = anchor.top >= tip.height + 16 ? anchor.top - tip.height - 8 : anchor.bottom + 8;
    setPosition({left, top: Math.max(8, Math.min(top, innerHeight - tip.height - 8))});
  }, [open, label]);
  const show = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const hideLater = () => { closeTimer.current = setTimeout(() => setOpen(false), 150); };
  return <>
    <span ref={trigger} className="icon-action-wrap" role={disabled ? 'group' : undefined} aria-label={disabled ? label : undefined}
      tabIndex={disabled ? 0 : undefined} aria-describedby={disabled && open ? id : undefined}
      onMouseEnter={show} onMouseLeave={hideLater} onFocus={show} onBlur={() => setOpen(false)}
      onPointerDown={e => {
        if (e.pointerType !== 'touch') { suppressDoubleUntil.current = 0; return; }
        held.current = false;
        start.current = {x:e.clientX, y:e.clientY};
        timer.current = setTimeout(() => { held.current = true; show(); }, 500);
      }}
      onPointerMove={e => { if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) { held.current = true; cancelTimer(); } }}
      onPointerUp={cancelTimer} onPointerCancel={() => { held.current = false; cancelTimer(); }}>
      <button {...props} disabled={disabled} type="button" className={`icon-btn icon-action ${className}`} aria-label={label}
        aria-describedby={!disabled && open ? id : undefined}
        onClick={e => { if (held.current) { e.preventDefault(); e.stopPropagation(); held.current = false; suppressDoubleUntil.current = e.timeStamp + 500; } else onClick?.(e); }}
        onDoubleClick={e => { if (e.timeStamp <= suppressDoubleUntil.current) { e.preventDefault(); e.stopPropagation(); suppressDoubleUntil.current = 0; } else onDoubleClick?.(e); }}>
        <span aria-hidden="true" className="icon-action-glyph">{icon}</span>
      </button>
    </span>
    {open && createPortal(<span ref={tooltip} id={id} role="tooltip" className="icon-action-tooltip" style={position}
      onMouseEnter={show} onMouseLeave={hideLater}>{label}</span>, document.body)}
  </>;
}
