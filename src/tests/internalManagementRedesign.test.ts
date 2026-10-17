// @ts-ignore -- Jest runs in Node; the web tsconfig intentionally omits Node types.
import fs from 'node:fs';

const read = (relativePath: string) => fs.readFileSync(`src/${relativePath}`, 'utf8');

describe('Gestión interna visual contract', () => {
  const users = read('modules/usuarios/Usuarios.tsx');
  const support = read('modules/soporte/Soporte.tsx');
  const contracts = read('modules/contratos/index.tsx');
  const payroll = read('modules/nomina/index.tsx');
  const incapacity = read('modules/incapacidades/index.tsx');
  const modal = read('components/SmartRhModal.tsx');
  const styles = read('app/styles.css');
  const compactStyles = read('app/gestionInternaV2.css');

  test('shared modal locks background scroll and supports outside click and Escape', () => {
    expect(modal).toContain("document.body.style.overflow = 'hidden'");
    expect(modal).toContain("event.key === 'Escape'");
    expect(modal).toContain('event.target === event.currentTarget');
    expect(modal).toContain('aria-modal="true"');
  });

  test('users permissions use search and one compact bulk command instead of a card wall', () => {
    expect(users).toContain('permission-command-bar');
    expect(users).toContain('bulkPermissionTarget');
    expect(users).toContain('visiblePermisosUsers');
    expect(users).toContain('permission-user-list');
    expect(users).toContain('permission-user-card');
    expect(users).toContain('permission-user-modules');
    expect(users).not.toContain('permission-module-grid');
    expect(users).not.toContain('Página {permissionPage}');
    expect(users).not.toContain('<th>ID</th>');
  });

  test('user creation and editing use a sectioned focused modal', () => {
    expect(users).toContain('<SmartRhModal');
    expect(users).toContain('users-form-section');
    expect(users).toContain('Identidad y acceso');
    expect(users).toContain('Relación laboral');
    expect(users).toContain('Nuevo usuario');
  });

  test('support uses compact pagination and modal detail without a side panel', () => {
    expect(support).toContain('const TICKETS_PER_PAGE = 6');
    expect(support).toContain('paginatedTickets.map');
    expect(support).toContain('support-pagination');
    expect(support).toContain('support-hero-status');
    expect(support).toContain('<SmartRhModal');
    expect(support).not.toContain('>\n              Actualizar\n            </button>');
    expect(support).not.toContain('<div className="support-detail-panel">');
  });

  test('final compact stylesheet locks the intended ordering and density', () => {
    expect(compactStyles).toContain('.dashboard-page > .users-crud-card');
    expect(compactStyles).toContain('order: 1 !important');
    expect(compactStyles).toContain('.dashboard-page > .users-permissions-card');
    expect(compactStyles).toContain('min-height: 86px !important');
    expect(compactStyles).toContain(".smart-modal:has(.users-modal-form)");
  });

  test('closed operation and employee-record modules use the same modal system', () => {
    expect(contracts).toContain('<SmartRhModal');
    expect(payroll).toContain('<SmartRhModal');
    expect(incapacity).toContain('<SmartRhModal');
  });

  test('dark actions preserve the semantic tones from daily operation', () => {
    expect(styles).toContain("[data-theme='dark'] .smart-action-correct");
    expect(styles).toContain('rgba(56, 189, 248, 0.18)');
    expect(styles).toContain("[data-theme='dark'] .smart-action-danger");
    expect(styles).toContain('rgba(220, 38, 38, 0.16)');
  });
});
