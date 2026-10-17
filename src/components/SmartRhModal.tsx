import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

type SmartRhModalProps = {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'compact' | 'medium' | 'wide';
  busy?: boolean;
};

export default function SmartRhModal({
  open,
  onClose,
  eyebrow,
  title,
  description,
  children,
  size = 'medium',
  busy = false,
}: SmartRhModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="smart-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`smart-modal smart-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-modal-title"
      >
        <header className="smart-modal-header">
          <div>
            {eyebrow && <p className="module-eyebrow">{eyebrow}</p>}
            <h2 id="smart-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>

          <button
            type="button"
            className="smart-modal-close"
            aria-label="Cerrar ventana"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="smart-modal-body">{children}</div>
      </section>
    </div>,
    document.body
  );
}
