// @ts-ignore -- Jest runs in Node; the web tsconfig does not declare Node types.
import fs from 'node:fs';

describe('SMART RH calendar and QR viewport boundary', () => {
  const styles = fs.readFileSync('src/app/styles.css', 'utf8');
  const terminalStyles = fs.readFileSync(
    'src/modules/terminal/terminalExperience.css',
    'utf8'
  );
  const terminal = fs.readFileSync(
    'src/modules/terminal/TerminalAttendance.tsx',
    'utf8'
  );

  test('calendar agenda reserves a visible row for pagination', () => {
    expect(styles).toContain(
      'grid-template-rows: auto minmax(0, 1fr) auto !important;'
    );
    expect(styles).toContain('.calendar-page .calendar-agenda-pagination');
    expect(styles).toContain('min-height: 44px !important;');
  });

  test('monthly summary cards use a compact visual hierarchy', () => {
    expect(styles).toContain('.calendar-page .calendar-summary-card');
    expect(styles).toContain('min-height: 88px !important;');
    expect(styles).toContain('grid-template-columns: 46px minmax(0, 1fr) !important;');
  });

  test('active QR terminal is constrained to the visible viewport', () => {
    expect(terminal).toContain("'terminal-experience-active'");
    expect(terminalStyles).toContain('.terminal-experience-active');
    expect(terminalStyles).toContain('height: 100dvh !important;');
    expect(terminalStyles).toContain(
      'grid-template-rows: auto auto minmax(0, 1fr) auto !important;'
    );
    expect(terminalStyles).toContain(
      '.terminal-experience-active:fullscreen .terminal-active-layout'
    );
  });
});
