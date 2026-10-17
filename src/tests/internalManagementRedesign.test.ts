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
  const finalStyles = read('app/gestionInternaV3.css');
  const repairStyles = read('app/gestionInternaV4.css');

  test('shared modal locks background scroll and supports outside click and Escape', () => {
    expect(modal).toContain("document.body.style.overflow = 'hidden'");
    expect(modal).toContain("event.key === 'Escape'");
    expect(modal).toContain('event.target === event.currentTarget');
    expect(modal).toContain('aria-modal="true"');
    expect(modal).toContain('createPortal');
    expect(modal).toContain('document.body');
  });

  test('users permissions reveal results only after a focused search', () => {
    expect(users).toContain('hasPermissionQuery');
    expect(users).toContain("filteredPermisosUsers.slice(0, 5)");
    expect(users).toContain('permission-search-empty');
    expect(users).toContain('permission-bulk-disclosure');
    expect(users).toContain('bulkPermissionTarget');
    expect(users).toContain('visiblePermisosUsers');
    expect(users).toContain('permission-user-list');
    expect(users).toContain('permission-user-card');
    expect(users).toContain('permission-user-modules');
    expect(users).not.toContain('permission-module-grid');
    expect(users).not.toContain('Página {permissionPage}');
    expect(users).not.toContain('<th>ID</th>');
    expect(users).not.toContain('con_asistencia');
    expect(users).not.toContain('sin_vacaciones');
  });

  test('user creation and editing use a sectioned focused modal', () => {
    expect(users).toContain('<SmartRhModal');
    expect(users).toContain('users-form-section');
    expect(users).toContain('Identidad y acceso');
    expect(users).toContain('Relación laboral');
    expect(users).toContain('Nuevo usuario');
  });

  test('user list defaults to five records and keeps the form comfortably spaced', () => {
    expect(users).toContain('const PAGE_SIZE_OPTIONS = [5, 10, 25]');
    expect(users).toContain('useState(5)');
    expect(finalStyles).toContain('.smart-modal .users-modal-form');
    expect(finalStyles).toContain('gap: 22px !important');
    expect(users).toContain('users-password-field');
    expect(repairStyles).toContain('z-index: 2147483600 !important');
  });

  test('support combines the ticket inbox with a monthly calendar', () => {
    expect(support).toContain('const TICKETS_PER_PAGE = 4');
    expect(support).toContain('paginatedTickets.map');
    expect(support).toContain('support-calendar-workspace');
    expect(support).toContain('support-calendar-card');
    expect(support).toContain('ticketCountByDate');
    expect(support).toContain('selectedDate');
    expect(support).toContain('support-pagination');
    expect(support).toContain('support-hero-status');
    expect(support).toContain('<SmartRhModal');
    expect(support).toContain('support-filter-control');
    expect(support).toContain('support-ticket-copy');
    expect(support).not.toContain('>\n              Actualizar\n            </button>');
    expect(support).not.toContain('<div className="support-detail-panel">');
  });

  test('final compact stylesheet locks the intended ordering and density', () => {
    expect(compactStyles).toContain('.dashboard-page > .users-crud-card');
    expect(compactStyles).toContain('order: 1 !important');
    expect(compactStyles).toContain('.dashboard-page > .users-permissions-card');
    expect(compactStyles).toContain('min-height: 86px !important');
    expect(compactStyles).toContain(".smart-modal:has(.users-modal-form)");
    expect(finalStyles).toContain('.support-calendar-workspace');
    expect(finalStyles).toContain('.permission-bulk-disclosure');
    expect(repairStyles).toContain('.support-filter-submit');
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
    expect(finalStyles).toContain('rgba(56, 189, 248, 0.18)');
    expect(finalStyles).toContain('rgba(220, 38, 38, 0.16)');
    expect(finalStyles).not.toMatch(/#7c3aed|#8b5cf6|#a855f7|#9333ea/i);
  });
});
