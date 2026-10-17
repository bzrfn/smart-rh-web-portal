// @ts-ignore -- Jest runs in Node; the web tsconfig does not declare Node types.
import fs from 'node:fs';

describe('SMART RH daily operation redesign', () => {
  const read = (path: string) => fs.readFileSync(path, 'utf8');
  const styles = read('src/app/styles.css');
  const terminal = read('src/modules/terminal/TerminalAttendance.tsx');
  const terminalStyles = read('src/modules/terminal/terminalExperience.css');
  const calendar = read('src/modules/calendario/CalendarioLaboral.tsx');
  const attendance = read('src/modules/asistencia/Aprobaciones.tsx');
  const attendanceHistory = read('src/modules/asistencia/Asistencia.tsx');
  const vacations = read('src/modules/vacaciones/index.tsx');
  const disabilities = read('src/modules/incapacidades/index.tsx');

  test('QR fullscreen is isolated and constrained to the viewport', () => {
    expect(terminal).toContain("document.querySelector('.terminal-experience')");
    expect(terminal).toContain('terminalSurface.requestFullscreen()');
    expect(terminalStyles).toContain('.terminal-experience:fullscreen');
    expect(terminalStyles).toContain('height: 100dvh !important;');
    expect(terminalStyles).toContain('grid-template-rows: 66px 74px minmax(0, 1fr)');
    expect(terminalStyles).toContain('.terminal-experience:fullscreen .terminal-footer');
  });

  test('calendar paginates the agenda without changing event actions', () => {
    expect(calendar).toContain('const AGENDA_PAGE_SIZE = 4;');
    expect(calendar).toContain('const agendaItems = useMemo');
    expect(calendar).toContain('Páginas de agenda');
    expect(calendar).toContain('setSelectedEvent(item)');
    expect(styles).toContain('height: 630px !important;');
    expect(styles).toContain('grid-template-rows: repeat(4, minmax(0, 1fr))');
  });

  test('daily modules use the same operational surface language', () => {
    expect(attendance).toContain('attendance-review-table-wrapper');
    expect(vacations).toContain('vacation-table-wrapper');
    expect(disabilities).toContain('incapacity-table-wrapper');
    expect(styles).toContain('SMART RH · OPERACIÓN DIARIA v2');
    expect(styles).toContain('.operation-table tbody td');
  });

  test('vacations provide status filters while keeping approve and reject actions', () => {
    expect(vacations).toContain("type VacationFilter = 'todas'");
    expect(vacations).toContain("api.patch(`/vacaciones/${id}/approve`)");
    expect(vacations).toContain("api.patch(`/vacaciones/${id}/reject`)");
  });

  test('daily operation tables prioritize people and case context instead of internal ids', () => {
    [attendance, attendanceHistory, vacations, disabilities].forEach((source) => {
      expect(source).not.toContain('<th>ID</th>');
      expect(source).toContain('operation-person-avatar');
    });
    expect(styles).toContain('.operation-person');
    expect(styles).toContain('content: attr(data-label)');
  });

  test('incapacities use the same segmented status navigation as vacations', () => {
    expect(disabilities).toContain('className="operation-filter-tabs"');
    expect(disabilities).toContain("['todos', 'pendiente', 'aprobada', 'rechazada']");
    expect(disabilities).not.toContain('className="operation-select-field"');
  });
});
