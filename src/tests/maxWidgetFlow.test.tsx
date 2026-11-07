import React from 'react';
import { jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AsistenteSmartRh from '../modules/chatbot/AsistenteSmartRh';
import { AuthProvider } from '../app/auth/AuthContext';
import { api } from '../services/api';

const reply = (intent = 'ticket_borrador_listo') => ({ data: { ok: true, respuesta: {
  respuesta: intent === 'ticket_creado' ? 'Creé el ticket con folio 6ac3e3c9b0f9047825cd714a. Estado: abierto.' : 'Borrador preparado. Confirma su creación.',
  intent, categoria: 'Soporte', titulo: 'Ticket', pasos: [], acciones: [], sugerencias: [],
  puede_crear_ticket: intent === 'ticket_borrador_listo', requiere_escalamiento: true,
}, ...(intent === 'ticket_creado' ? { ticket: { _id: '6ac3e3c9b0f9047825cd714a', estado: 'abierto' } } : {}) } });
function mount(id = 1) {
  localStorage.setItem('rrhh_auth', JSON.stringify({ token: 'test-only', user: { id, role: 'admin', nombre: `Admin${id}` } }));
  return render(<MemoryRouter><AuthProvider><AsistenteSmartRh /></AuthProvider></MemoryRouter>);
}
async function open() { fireEvent.keyDown(screen.getByRole('button', { name: /Abrir Max/ }), { key: 'Enter' }); await screen.findByRole('textbox', { name: 'Mensaje para Max' }); }
function send(text: string) { fireEvent.change(screen.getByRole('textbox', { name: 'Mensaje para Max' }), { target: { value: text } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje a Max' })); }
describe('Max: conversación en el portal', () => {
  beforeEach(() => { localStorage.clear(); HTMLElement.prototype.scrollTo = jest.fn(); jest.spyOn(api, 'get').mockResolvedValue({ data: { sugerencias: [] } }); });
  afterEach(() => { cleanup(); jest.restoreAllMocks(); });
  it('envía sesión y mensaje identificados y crea desde el botón con confirmación real', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValueOnce(reply()).mockResolvedValueOnce(reply('ticket_creado'));
    mount(); await open(); send('Generar un ticket');
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar creación del ticket' }));
    await screen.findByText(/Creé el ticket con folio/);
    expect(post).toHaveBeenCalledTimes(2);
    const first = post.mock.calls[0][1] as any, second = post.mock.calls[1][1] as any;
    expect(first.conversacion_id).toBe(second.conversacion_id);
    expect(first.solicitud_id).not.toBe(second.solicitud_id);
    expect(second.crear_ticket).toBe(true);
    expect(screen.queryByRole('button', { name: 'Confirmar creación del ticket' })).not.toBeInTheDocument();
  });
  it('no muestra éxito cuando falta el folio y conserva el mismo identificador al reintentar', async () => {
    const invalid = reply('ticket_creado'); delete (invalid.data as any).ticket;
    const post = jest.spyOn(api, 'post').mockResolvedValueOnce(invalid).mockResolvedValueOnce(reply());
    mount(); await open(); send('Generar un ticket');
    await screen.findByText(/No pude verificar el folio y estado/);
    expect(screen.queryByText(/^Creé el ticket con folio/)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Mensaje para Max' })).toHaveValue('Generar un ticket');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje a Max' }));
    await screen.findByText('Borrador preparado. Confirma su creación.');
    expect((post.mock.calls[0][1] as any).solicitud_id).toBe((post.mock.calls[1][1] as any).solicitud_id);
  });
  it('bloquea un segundo envío mientras procesa el primero', async () => {
    let resolve: any;
    const post = jest.spyOn(api, 'post').mockImplementation(() => new Promise(r => { resolve = r; }));
    mount(); await open(); send('Generar un ticket');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje a Max' }));
    expect(post).toHaveBeenCalledTimes(1);
    resolve(reply()); await screen.findByText('Borrador preparado. Confirma su creación.');
  });
  it('no carga las conversaciones de otro administrador en el mismo navegador', async () => {
    jest.spyOn(api, 'post').mockResolvedValue(reply());
    const first = mount(1); await open(); send('INCIDENTE PRIVADO ADMIN UNO');
    await screen.findByText('Borrador preparado. Confirma su creación.'); first.unmount();
    mount(2); await open();
    await waitFor(() => expect(screen.queryByText('INCIDENTE PRIVADO ADMIN UNO')).not.toBeInTheDocument());
    expect(localStorage.getItem('smart-rh:max:portal-sessions:v2:1:admin')).toContain('INCIDENTE PRIVADO ADMIN UNO');
  });
});
