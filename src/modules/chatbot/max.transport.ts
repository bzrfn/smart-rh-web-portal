export function maxHistoryStorageKey(userId: number, role: string) {
  return `smart-rh:max:portal-sessions:v2:${userId}:${role}`;
}

export function verifiedMaxResponse(data: any) {
  if (!data?.ok || typeof data?.respuesta?.respuesta !== 'string' || !data.respuesta.respuesta.trim()) {
    throw new Error('Max no devolvió una respuesta verificable. Reintenta el mensaje.');
  }
  if (['ticket_creado', 'ticket_consultado', 'ticket_existente'].includes(data.respuesta.intent) &&
      (!/^[a-f\d]{24}$/i.test(String(data.ticket?._id || '')) || !['abierto', 'en_revision', 'resuelto', 'cerrado'].includes(data.ticket?.estado))) {
    throw new Error('No pude verificar el folio y estado del ticket. Consulta Soporte antes de repetir la creación.');
  }
  return data.respuesta;
}
