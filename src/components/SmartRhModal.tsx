import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

type SmartRhModalProps = {
  open: boolean; onClose: () => void; eyebrow?: string; title: string;
  description?: string; children: ReactNode; size?: 'compact' | 'medium' | 'wide'; busy?: boolean;
};
let scrollLocks = 0;
let previousOverflow = '';
export default function SmartRhModal({ open, onClose, eyebrow, title, description, children,
  size = 'medium', busy = false }: SmartRhModalProps) {
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const loading = useRef(busy); loading.current = busy;
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (scrollLocks++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]') || []);
    const first = focusable().find(element => !element.classList.contains('smart-modal-close')) || panel.current;
    if (window.matchMedia?.('(pointer: coarse)').matches) panel.current?.focus(); else first?.focus();
    const keydown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[data-smart-rh-modal]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (event.key === 'Escape') { event.stopPropagation(); if (!loading.current) close.current(); }
      if (event.key === 'Tab') {
        const elements = focusable(); const first = elements[0]; const last = elements.at(-1);
        if (!first) { event.preventDefault(); panel.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
      if (--scrollLocks === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="smart-modal-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}><section ref={panel} data-smart-rh-modal className={`smart-modal smart-modal-${size}`} role="dialog" aria-modal="true"
    aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} aria-busy={busy} tabIndex={-1}>
    <header className="smart-modal-header"><div>{eyebrow && <p className="module-eyebrow">{eyebrow}</p>}
      <h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div>
      <button type="button" className="smart-modal-close" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}>×</button>
    </header><div className="smart-modal-body">{children}</div>
  </section></div>,document.body);
}
