// @ts-ignore -- Jest corre en Node; el tsconfig Web no declara tipos Node.
import fs from 'node:fs';


describe(
  'Cambio #1 - pulido final Terminal QR',
  () => {
    const terminal =
      fs.readFileSync(
        'src/modules/terminal/TerminalAttendance.tsx',
        'utf8'
      );

    const selector =
      fs.readFileSync(
        'src/modules/terminal/AdminDestination.tsx',
        'utf8'
      );

    const theme =
      fs.readFileSync(
        'src/modules/terminal/terminalTheme.ts',
        'utf8'
      );

    const css =
      fs.readFileSync(
        'src/modules/terminal/terminalExperience.css',
        'utf8'
      );

    const normalizedTerminal =
      terminal.replace(
        /\s+/g,
        ' '
      );

    test(
      'QR usa ciclo máximo de 10 segundos',
      () => {
        expect(
          normalizedTerminal
        ).toContain(
          'const QR_CYCLE_MS = 10_000;'
        );

        expect(
          normalizedTerminal
        ).toContain(
          'Date.now() + QR_CYCLE_MS'
        );
      }
    );

    test(
      'QR ya no renueva cinco segundos antes',
      () => {
        expect(
          normalizedTerminal
        ).toContain(
          'Math.max( 0, qrExpiresAt - Date.now()'
        );

        expect(
          normalizedTerminal
        ).not.toContain(
          'qrExpiresAt - Date.now() - 5000'
        );

        expect(
          terminal
        ).toContain(
          'Ciclo de 10 segundos · cambia al llegar a 00:00'
        );
      }
    );

    test(
      'selector tiene modo claro y oscuro',
      () => {
        expect(
          selector
        ).toContain(
          'useTerminalTheme'
        );

        expect(
          selector
        ).toContain(
          'Modo claro'
        );

        expect(
          selector
        ).toContain(
          'Modo oscuro'
        );
      }
    );

    test(
      'terminal tiene modo claro y oscuro',
      () => {
        expect(
          terminal
        ).toContain(
          'useTerminalTheme'
        );

        expect(
          terminal
        ).toContain(
          'Modo claro'
        );

        expect(
          terminal
        ).toContain(
          'Modo oscuro'
        );
      }
    );

    test(
      'preferencia visual es persistente y respeta sistema',
      () => {
        expect(
          theme
        ).toContain(
          'smarth-terminal-theme'
        );

        expect(
          theme
        ).toContain(
          'prefers-color-scheme: dark'
        );
      }
    );

    test(
      'dark mode mantiene QR blanco y estilos armonizados',
      () => {
        expect(
          css
        ).toContain(
          '.terminal-theme-dark'
        );

        expect(
          css
        ).toContain(
          '.terminal-theme-toggle'
        );

        expect(
          css
        ).toContain(
          '.terminal-theme-dark .terminal-qr-frame'
        );
      }
    );
  }
);
