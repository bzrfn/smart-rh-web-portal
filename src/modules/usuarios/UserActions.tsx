import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SmartRhIcon from '../../components/SmartRhIcon';

type Action = { label: string; run: () => void; danger?: boolean; disabled?: boolean; hint?: string };
export default function UserActions({ email, actions, disabled }: { email: string; actions: Action[]; disabled: boolean }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const id = useId();
  function close(restore = false) { setPosition(null); if (restore) trigger.current?.focus(); }
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    function outside(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close();
    }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { event.preventDefault(); close(true); } }
    function moved(event: Event) { if (!menu.current?.contains(event.target as Node)) close(); }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    window.addEventListener('resize', moved); window.addEventListener('scroll', moved, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', moved); window.removeEventListener('scroll', moved, true); };
  }, [position]);
  useEffect(() => { if (disabled) close(); }, [disabled]);
  return <>
    <button ref={trigger} type="button" className="users-action-trigger" aria-label={`Acciones de ${email}`} aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? id : undefined} disabled={disabled}
      onClick={() => { if (position) return close(); const rect = trigger.current!.getBoundingClientRect(); setPosition({ left: Math.max(12, Math.min(rect.right - 264, window.innerWidth - 276)), top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - actions.length * 74 - 24)) }); }}>
      Acciones <SmartRhIcon name="chevronDown" />
    </button>
    {position && createPortal(<div id={id} ref={menu} role="menu" aria-label={`Acciones de ${email}`} className="users-action-menu" style={position} onKeyDown={event => {
      const items = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) { event.preventDefault(); items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }
      if (event.key === 'Tab') close();
    }}>{actions.map(action => <button key={action.label} type="button" role="menuitem" disabled={action.disabled} className={action.danger ? 'users-action-destructive' : ''} onClick={() => { trigger.current?.focus(); close(); action.run(); }}>
      <strong>{action.label}</strong>{action.hint && <span>{action.hint}</span>}
    </button>)}</div>, document.body)}
  </>;
}
