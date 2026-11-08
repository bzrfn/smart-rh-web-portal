import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { feedback, getFeedback, subscribeFeedback, type FeedbackItem } from '../services/feedback';
import './feedback.css';
function Notice({ item }: { item: FeedbackItem }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || item.kind === 'error') return;
    const timer = window.setTimeout(() => feedback.dismiss(item.id), 8000);
    return () => window.clearTimeout(timer);
  }, [item.id, item.kind, paused]);
  return <section className={`operation-notice operation-notice-${item.kind}`}
    role={item.kind === 'error' ? 'alert' : 'status'} aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <span className="operation-notice-icon" aria-hidden="true">{item.kind === 'success' ? '✓' : item.kind === 'error' ? '!' : 'i'}</span>
    <div><strong>{item.kind === 'success' ? 'Listo' : item.kind === 'error' ? 'Revisa la operación' : 'Información'}</strong><p>{item.message}</p></div>
    <button type="button" onClick={() => feedback.dismiss(item.id)} aria-label="Cerrar notificación">×</button>
  </section>;
}
export default function FeedbackHost() {
  const items = useSyncExternalStore(subscribeFeedback, getFeedback, getFeedback);
  useEffect(() => () => feedback.clear(), []);
  return createPortal(<div className="operation-notices" aria-label="Resultados de operaciones">{items.map(item => <Notice key={item.id} item={item} />)}</div>, document.body);
}
