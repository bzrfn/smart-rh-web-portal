import { maxHistoryStorageKey, verifiedMaxResponse } from '../modules/chatbot/max.transport';

describe('Max: identidad del historial y confirmaciones verificadas', () => {
  it('separa el historial por usuario y rol', () => {
    expect(maxHistoryStorageKey(1, 'admin')).not.toBe(maxHistoryStorageKey(2, 'admin'));
    expect(maxHistoryStorageKey(1, 'admin')).not.toBe(maxHistoryStorageKey(1, 'empleado'));
  });
  it.each(['ticket_creado', 'ticket_consultado', 'ticket_existente'])('rechaza %s sin folio y estado', intent => {
    expect(() => verifiedMaxResponse({ ok: true, respuesta: { intent, respuesta: 'Listo' } })).toThrow('folio');
  });
  it('rechaza estados inválidos y respuestas sin datos', () => {
    expect(() => verifiedMaxResponse({ ok: true, respuesta: { intent: 'ticket_creado', respuesta: 'Listo' }, ticket: { _id: '6ac3e3c9b0f9047825cd714a', estado: 'inventado' } })).toThrow();
    expect(() => verifiedMaxResponse({ ok: true })).toThrow();
    expect(() => verifiedMaxResponse({ ok: false, respuesta: { respuesta: 'Creado' } })).toThrow();
  });
  it('acepta una confirmación respaldada por el resultado del servidor', () => {
    const respuesta = { intent: 'ticket_creado', respuesta: 'Creé el ticket con folio 6ac3e3c9b0f9047825cd714a. Estado: abierto.' };
    expect(verifiedMaxResponse({ ok: true, respuesta, ticket: { _id: '6ac3e3c9b0f9047825cd714a', estado: 'abierto' } })).toBe(respuesta);
  });
});
