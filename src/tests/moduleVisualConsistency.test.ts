// @ts-ignore -- Jest runs in Node; the web tsconfig does not declare Node types.
import fs from 'node:fs';

describe('SMART RH module visual consistency', () => {
  const styles = fs.readFileSync('src/app/styles.css', 'utf8');
  const terminalStyles = fs.readFileSync(
    'src/modules/terminal/terminalExperience.css',
    'utf8'
  );
  const terminal = fs.readFileSync(
    'src/modules/terminal/TerminalAttendance.tsx',
    'utf8'
  );

  test('support follows the shared light and dark surfaces', () => {
    expect(styles).toContain('.support-hero {');
    expect(styles).toContain(':root[data-theme=\'dark\'] .support-hero');
    expect(styles).toMatch(
      /\.support-hero\s*\{[\s\S]*?var\(--card\)\s*!important;/
    );
  });

  test('shared modules use readable theme tokens', () => {
    expect(styles).toContain('SMART RH v18 · MODULE EXPERIENCE SYSTEM');
    expect(styles).toMatch(
      /\.module-title\s*\{[\s\S]*?color:\s*var\(--text\)\s*!important;/
    );
    expect(styles).toMatch(
      /\.module-subtitle\s*\{[\s\S]*?color:\s*var\(--text-muted\)\s*!important;/
    );
  });

  test('destination isolates local light and dark themes', () => {
    expect(terminalStyles).toContain(
      '.terminal-theme-light.terminal-destination-page'
    );
    expect(terminalStyles).toContain(
      '.terminal-theme-dark.terminal-destination-page'
    );
    expect(terminalStyles).toContain(
      '.terminal-destination-card-primary *'
    );
  });

  test('QR exposes a visible 20-second progress indicator', () => {
    expect(terminal).toContain('const QR_CYCLE_MS =\n  20_000;');
    expect(terminal).toContain('terminal-qr-progress');
    expect(terminal).toContain('exactamente 20 segundos');
  });
});
