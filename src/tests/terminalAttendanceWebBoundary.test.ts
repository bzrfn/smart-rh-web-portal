// @ts-nocheck
import fs from 'node:fs';

const read =
  (file: string) =>
    fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8')
      : '';

const navigationFile =
  'src/navigation/index.tsx';

const appShellFile =
  'src/app/layout/AppShell.tsx';

const terminalPageFile =
  'src/modules/terminal/TerminalAttendance.tsx';

const terminalApiFile =
  'src/services/terminalApi.ts';

const legacyQrPageFile =
  'src/modules/asistencia/QrAsistencia.tsx';

const legacyQrGeneratorFile =
  'src/modules/asistencia/QrGenerator.tsx';

describe(
  'Cambio #1 - terminal web de asistencia separado',
  () => {
    test(
      'retira el generador QR antiguo del portal administrativo',
      () => {
        expect(
          fs.existsSync(
            legacyQrPageFile
          )
        ).toBe(
          false
        );

        expect(
          fs.existsSync(
            legacyQrGeneratorFile
          )
        ).toBe(
          false
        );

        expect(
          read(
            navigationFile
          )
        ).not.toMatch(
          /QrAsistencia|qr-asistencia/
        );

        expect(
          read(
            appShellFile
          )
        ).not.toContain(
          '/portal/qr-asistencia'
        );
      }
    );

    test(
      'crea una pagina dedicada TerminalAttendance',
      () => {
        expect(
          fs.existsSync(
            terminalPageFile
          )
        ).toBe(
          true
        );
      }
    );

    test(
      'crea un cliente HTTP exclusivo del terminal',
      () => {
        expect(
          fs.existsSync(
            terminalApiFile
          )
        ).toBe(
          true
        );

        const terminalApi =
          read(
            terminalApiFile
          );

        expect(
          terminalApi
        ).toMatch(
          /axios\.create/
        );

        expect(
          terminalApi
        ).not.toMatch(
          /from\s+['"].*services\/api['"]/
        );
      }
    );

    test(
      'el cliente terminal no reutiliza la sesion administrativa persistida',
      () => {
        const terminalApi =
          read(
            terminalApiFile
          );

        expect(
          terminalApi
        ).not.toMatch(
          /rrhh_auth/
        );

        expect(
          terminalApi
        ).not.toMatch(
          /localStorage\.getItem/
        );

        expect(
          terminalApi
        ).not.toMatch(
          /sessionStorage\.getItem/
        );
      }
    );

    test(
      'expone /terminal fuera de /portal',
      () => {
        const navigation =
          read(
            navigationFile
          );

        expect(
          navigation
        ).toMatch(
          /TerminalAttendance/
        );

        expect(
          navigation
        ).toMatch(
          /path=["']\/terminal["']/
        );

        expect(
          navigation
        ).toMatch(
          /<TerminalAttendance\s*\/>/
        );
      }
    );

    test(
      'la pagina terminal usa el lifecycle terminal-access',
      () => {
        const terminalPage =
          read(
            terminalPageFile
          );

        expect(
          terminalPage
        ).toContain(
          '/auth/terminal-access/request'
        );

        expect(
          terminalPage
        ).toContain(
          '/auth/terminal-access/status'
        );

        expect(
          terminalPage
        ).toContain(
          '/auth/terminal-access/session'
        );
      }
    );

    test(
      'la pagina terminal no usa AuthContext ni adminAccessToken',
      () => {
        const terminalPage =
          read(
            terminalPageFile
          );

        expect(
          terminalPage
        ).not.toMatch(
          /useAuth|AuthContext/
        );

        expect(
          terminalPage
        ).not.toMatch(
          /adminAccessToken/
        );

        expect(
          terminalPage
        ).not.toMatch(
          /rrhh_auth/
        );
      }
    );

    test(
      'el terminal solicita el QR desde GET /terminal/qr',
      () => {
        const terminalPage =
          read(
            terminalPageFile
          );

        expect(
          terminalPage
        ).toContain(
          '/terminal/qr'
        );

        expect(
          terminalPage
        ).not.toContain(
          '/asistencia/qr'
        );
      }
    );

    test(
      'la sesion terminal usa Bearer propio para solicitar QR',
      () => {
        const terminalPage =
          read(
            terminalPageFile
          );

        expect(
          terminalPage
        ).toMatch(
          /Authorization/
        );

        expect(
          terminalPage
        ).toMatch(
          /Bearer/
        );
      }
    );

    test(
      'sessionProof y token terminal no se persisten en storage del navegador',
      () => {
        const terminalPage =
          read(
            terminalPageFile
          );

        const executable =
          terminalPage
            .replace(
              /\/\*[\s\S]*?\*\//g,
              ''
            )
            .replace(
              /(^|[^:])\/\/.*$/gm,
              '$1'
            );

        expect(
          executable
        ).not.toMatch(
          /\blocalStorage\b/
        );

        expect(
          executable
        ).not.toMatch(
          /\bsessionStorage\b/
        );
      }
    );
  }
);
