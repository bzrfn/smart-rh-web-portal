import React from 'react';
import { jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import Contratos from '../modules/contratos';
import Nomina from '../modules/nomina';
import Usuarios from '../modules/usuarios/Usuarios';
import Soporte from '../modules/soporte/Soporte';
import SmartRhModal from '../components/SmartRhModal';
import FeedbackHost from '../components/FeedbackHost';
import { AuthProvider } from '../app/auth/AuthContext';
import { api } from '../services/api';
import { feedback, assertSaved } from '../services/feedback';

const pending = { invitation_id: 'a'.repeat(64), invite_email: 'pending@example.invalid', nombre: 'Persona', apellido: 'Pendiente', account_type: 'empleado', created_at: '2026-01-01T00:00:00.000Z', expires_at: '2026-01-01T00:30:00.000Z', delivery_failed_at: null, dias_vacaciones_disponibles: 12 };
const user = { id: 2, nombre: 'Cuenta', apellido: 'Aceptada', correo: 'active@example.invalid', role: 'empleado', activo: 1, dias_vacaciones_disponibles: 12 };
const ticket = { _id: 'ticket-1', titulo: 'Incidente de prueba', descripcion: 'Falta un registro', estado: 'abierto', prioridad: 'media', categoria: 'asistencia', usuario_id: 2, createdAt: '2026-11-08T01:00:00.000Z' };
function mount(component: React.ReactNode) {
  localStorage.setItem('rrhh_auth', JSON.stringify({ token: 'test-only', user: { id: 1, role: 'admin', nombre: 'Admin' } }));
  return render(<AuthProvider>{component}<FeedbackHost /></AuthProvider>);
}
function mockDirectory(invitation: any = pending) {
  return jest.spyOn(api, 'get').mockImplementation(async (url: any) => ({ data: String(url) === '/users' ? { ok: true, users: [user] } : String(url) === '/auth/invitations' ? { ok: true, invitations: [invitation] } : { ok: true, permisos: {} } }));
}
async function openResend() {
  fireEvent.click(screen.getByRole('button', { name: 'Gestionar usuarios' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Reenviar invitación' }));
  return screen.getByRole('dialog', { name: 'Reenviar invitación' });
}
afterEach(() => { cleanup(); jest.restoreAllMocks(); feedback.clear(); localStorage.clear(); });
it('busca por correo e incluye solamente las invitaciones pendientes en reenvío', async () => {
  mockDirectory(); mount(<Usuarios />); await screen.findByText('Usuarios, permisos y vacaciones');
  fireEvent.click(screen.getByRole('button', { name: 'Gestionar usuarios' }));
  await screen.findByRole('button', { name: 'Reenviar invitación' });
  const input = screen.getByPlaceholderText('Nombre, correo, teléfono o dirección...');
  fireEvent.change(input, { target: { value: 'active@example.invalid' } });
  expect(screen.queryByRole('button', { name: 'Reenviar invitación' })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'pending@example.invalid' } });
  expect(screen.getAllByRole('button', { name: 'Reenviar invitación' })).toHaveLength(1);
});
it('cierra el reenvío y confirma destinatario solo después de la respuesta del servidor', async () => {
  mockDirectory(); let finish: any;
  const post = jest.spyOn(api, 'post').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  mount(<Usuarios />); const dialog = await openResend();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reenviar invitación' }));
  expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
  expect(within(dialog).getByRole('button', { name: 'Cerrar ventana' })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reenviando…' }));
  expect(post).toHaveBeenCalledTimes(1);
  expect(post.mock.calls[0][0]).toBe(`/auth/invitations/${pending.invitation_id}/resend`);
  expect(post.mock.calls[0][1]).toEqual({ tipo_cuenta: 'empleado' });
  await act(async () => finish({ data: { ok: true, expiresInMinutes: 30 } }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('status')).toHaveTextContent('Invitación reenviada a pending@example.invalid');
});
it('mantiene la ventana y el destinatario si falla el envío', async () => {
  mockDirectory(); jest.spyOn(api, 'post').mockRejectedValue({ response: { data: { message: 'SMTP temporalmente no disponible' } } });
  mount(<Usuarios />); const dialog = await openResend();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reenviar invitación' }));
  await within(dialog).findByText('SMTP temporalmente no disponible');
  expect(dialog).toHaveTextContent(pending.invite_email);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('no asigna administrador por defecto a invitaciones antiguas sin rol guardado', async () => {
  mockDirectory({ ...pending, account_type: null }); mount(<Usuarios />); const dialog = await openResend();
  expect(within(dialog).getByRole('combobox')).toHaveValue('');
  expect(within(dialog).getByRole('button', { name: 'Reenviar invitación' })).toBeDisabled();
  fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'empleado' } });
  expect(within(dialog).getByRole('button', { name: 'Reenviar invitación' })).toBeEnabled();
});
it('no afirma éxito para una respuesta ok:false aunque tenga HTTP 200', async () => {
  const original = api.defaults.adapter;
  api.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { ok: false, message: 'No persistido' } });
  try { await expect(api.post('/test')).rejects.toThrow('No persistido'); }
  finally { api.defaults.adapter = original; }
  expect(() => assertSaved({ message: 'sin confirmación' }, 'No confirmado')).toThrow('sin confirmación');
});
function mockSupport() { jest.spyOn(api, 'get').mockImplementation(async (url: any) => ({ data: String(url).includes('resumen') ? { resumen: { total: 1, abiertos: 1, en_revision: 0, resueltos: 0, cerrados: 0, alta_prioridad: 0 } } : { tickets: [ticket] } })); }
it('guardar soporte cierra el detalle y una recarga no vuelve a abrirlo', async () => {
  mockSupport(); jest.spyOn(api, 'patch').mockResolvedValue({ data: { ok: true } }); mount(<Soporte />);
  fireEvent.click(await screen.findByRole('button', { name: /Incidente de prueba/ }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Revisado y resuelto' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('status')).toHaveTextContent('Ticket actualizado correctamente');
  await screen.findByRole('button', { name: /Incidente de prueba/ });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('error de soporte conserva la respuesta escrita y el detalle abierto', async () => {
  mockSupport(); jest.spyOn(api, 'patch').mockResolvedValue({ data: { ok: false, message: 'No se guardó' } }); mount(<Soporte />);
  fireEvent.click(await screen.findByRole('button', { name: /Incidente de prueba/ }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Conservar esta respuesta' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
  await within(dialog).findByText('No se guardó');
  expect(within(dialog).getByRole('textbox')).toHaveValue('Conservar esta respuesta');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('bloquea Escape durante guardado y devuelve el foco al cerrar', () => {
  const close = jest.fn(); const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const view = render(<SmartRhModal open busy onClose={close} title="Prueba"><input aria-label="Campo" /></SmartRhModal>);
  fireEvent.keyDown(window, { key: 'Escape' }); expect(close).not.toHaveBeenCalled();
  view.rerender(<SmartRhModal open onClose={close} title="Prueba"><input aria-label="Campo" /></SmartRhModal>);
  fireEvent.keyDown(window, { key: 'Escape' }); expect(close).toHaveBeenCalledTimes(1);
  view.unmount(); expect(document.activeElement).toBe(trigger); expect(document.body.style.overflow).not.toBe('hidden'); trigger.remove();
});

for (const [name, Component, buttonName] of [['contratos', Contratos, 'Registrar contrato'], ['nomina', Nomina, 'Registrar nómina']] as const) {
  it(`${name}: cierra el formulario al guardar y lo conserva ante un rechazo`, async () => {
    jest.spyOn(api, 'get').mockImplementation(async (url: any) => ({ data: { ok: true, users: [user], contratos: [], nominas: [] } }));
    const post = jest.spyOn(api, 'post').mockResolvedValueOnce({ data: { ok: false, message: 'Validación rechazada' } }).mockResolvedValueOnce({ data: { ok: true } });
    mount(<Component />);
    const button = await screen.findByRole('button', { name: buttonName });
    const form = button.closest('form')!;
    const salary = form.querySelector<HTMLInputElement>('input[placeholder="12,000.00"]')!;
    fireEvent.change(salary, { target: { value: '12500' } });
    fireEvent.submit(form);
    await screen.findAllByText('Validación rechazada');
    expect(salary).toHaveValue('12,500');
    expect(form).toBeInTheDocument();
    fireEvent.submit(form);
    await waitFor(() => expect(form).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('correctamente');
  });
}
