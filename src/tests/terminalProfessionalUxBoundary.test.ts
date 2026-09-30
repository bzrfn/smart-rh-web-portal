// @ts-ignore -- Jest corre en Node; el tsconfig Web no declara tipos Node.
import fs from 'node:fs';

describe(
  'Cambio #1.1 - UX profesional de terminal QR',
  () => {
    const destinationFile =
      'src/modules/terminal/AdminDestination.tsx';

    const memoryFile =
      'src/services/terminalSessionMemory.ts';

    const cssFile =
      'src/modules/terminal/terminalExperience.css';

    const destination =
      fs.existsSync(
        destinationFile
      )
        ? fs.readFileSync(
            destinationFile,
            'utf8'
          )
        : '';

    const memory =
      fs.existsSync(
        memoryFile
      )
        ? fs.readFileSync(
            memoryFile,
            'utf8'
          )
        : '';

    const css =
      fs.existsSync(
        cssFile
      )
        ? fs.readFileSync(
            cssFile,
            'utf8'
          )
        : '';

    const verify =
      fs.readFileSync(
        'src/modules/dashboard/VerifyLoginCode.tsx',
        'utf8'
      );

    const nav =
      fs.readFileSync(
        'src/navigation/index.tsx',
        'utf8'
      );

    const terminal =
      fs.readFileSync(
        'src/modules/terminal/TerminalAttendance.tsx',
        'utf8'
      );

    const approval =
      fs.readFileSync(
        'src/modules/terminal/TerminalApproval.tsx',
        'utf8'
      );

    test(
      'existe selector de destino post-login',
      () => {
        expect(
          destination.length
        ).toBeGreaterThan(
          100
        );

        expect(
          destination
        ).toContain(
          'Portal administrativo'
        );

        expect(
          destination
        ).toContain(
          'Terminal QR de asistencia'
        );
      }
    );

    test(
      'selector se limita al administrador autorizado',
      () => {
        expect(
          destination
        ).toContain(
          'brandonbernal413@gmail.com'
        );
      }
    );

    test(
      'selector obtiene sesión terminal dedicada',
      () => {
        expect(
          destination
        ).toContain(
          '/auth/terminal-access/admin-session'
        );
      }
    );

    test(
      'sesión terminal se conserva solo en memoria',
      () => {
        expect(
          memory
        ).toContain(
          'terminalSessionMemory'
        );

        expect(
          memory
        ).not.toContain(
          'localStorage'
        );

        expect(
          memory
        ).not.toContain(
          'sessionStorage'
        );
      }
    );

    test(
      '2FA dirige al selector',
      () => {
        expect(
          verify
        ).toContain(
          '/admin/destino'
        );
      }
    );

    test(
      'navegación registra selector',
      () => {
        expect(
          nav
        ).toContain(
          'AdminDestination'
        );

        expect(
          nav
        ).toContain(
          'path="/admin/destino"'
        );
      }
    );

    test(
      'terminal muestra fecha y hora',
      () => {
        expect(
          terminal
        ).toContain(
          'Fecha'
        );

        expect(
          terminal
        ).toContain(
          'Hora'
        );
      }
    );

    test(
      'terminal tiene vigencia y renovación',
      () => {
        expect(
          terminal
        ).toContain(
          'Vigencia del QR'
        );

        expect(
          terminal
        ).toContain(
          'Renovación automática'
        );

        expect(
          terminal
        ).toContain(
          'Renovar QR'
        );
      }
    );

    test(
      'terminal mantiene autorización independiente',
      () => {
        expect(
          terminal
        ).toContain(
          '/auth/terminal-access/request'
        );

        expect(
          terminal
        ).toContain(
          '/auth/terminal-access/session'
        );
      }
    );

    test(
      'aprobación carga challengeId desde URL',
      () => {
        expect(
          approval
        ).toContain(
          'useSearchParams'
        );

        expect(
          approval
        ).toContain(
          'challengeId'
        );
      }
    );

    test(
      'diseño terminal es responsive y profesional',
      () => {
        expect(
          css
        ).toContain(
          '.terminal-experience'
        );

        expect(
          css
        ).toContain(
          '.terminal-qr-frame'
        );

        expect(
          css
        ).toContain(
          '@media'
        );
      }
    );
  }
);
