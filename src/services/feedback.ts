export type FeedbackItem = { id: number; kind: 'success' | 'error' | 'info'; message: string };
let items: FeedbackItem[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
function publish(kind: FeedbackItem['kind'], message: string) {
  if (!message.trim()) return;
  const last = items.at(-1);
  if (last?.kind === kind && last.message === message) return;
  items = [...items, { id: ++nextId, kind, message }].slice(-3); emit();
}
export const feedback = {
  success: (message: string) => publish('success', message),
  error: (message: string) => publish('error', message),
  info: (message: string) => publish('info', message),
  dismiss(id: number) { items = items.filter(item => item.id !== id); emit(); },
  clear() { items = []; emit(); },
};
export function subscribeFeedback(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const getFeedback = () => items;
export function assertSaved(data: any, fallback = 'No se pudo confirmar el guardado.') {
  if (data?.ok !== true) throw new Error(data?.message || fallback);
}
export function mutationError(error: any, fallback: string) {
  if (['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(error?.code)) return 'No se pudo confirmar el resultado. Revisa el listado antes de volver a enviar para evitar duplicados.';
  return error?.response?.data?.message || error?.message || fallback;
}
