// @ts-nocheck
import fs from 'node:fs';

const read =
  (file: string) =>
    fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8')
      : '';

const pageFile =
  'src/modules/terminal/TerminalApproval.tsx';

const navigationFile =
  'src/navigation/index.tsx';

const dashboardFile =
  'src/modules/dashboard/Dashboard.tsx';

describe(
  'Cambio #1 - aprobacion administrativa del terminal',
  () => {
    test(
      'existe pantalla administrativa de autorizacion',
      () => {
        expect(
          fs.existsSync(
            pageFile
          )
        ).toBe(
          true
        );
      }
    );

    test(
      'usa la sesion administrativa normal y no terminalApi',
      () => {
        const page =
          read(
            pageFile
          );

        expect(
          page
        ).toMatch(
          /services\/api/
        );

        expect(
          page
        ).not.toMatch(
          /terminalApi/
        );
      }
    );

    test(
      'envia decision al endpoint protegido del backend',
      () => {
        const page =
          read(
            pageFile
          );

        expect(
          page
        ).toContain(
          '/auth/terminal-access/decision'
        );

        expect(
          page
        ).toMatch(
          /challengeId/
        );

        expect(
          page
        ).toMatch(
          /decision/
        );
      }
    );

    test(
      'permite aprobar y rechazar',
      () => {
        const page =
          read(
            pageFile
          );

        expect(
          page
        ).toContain(
          "'approve'"
        );

        expect(
          page
        ).toContain(
          "'reject'"
        );
      }
    );

    test(
      'no persiste challenge ni secretos en storage',
      () => {
        const page =
          read(
            pageFile
          )
            .replace(
              /\/\*[\s\S]*?\*\//g,
              ''
            )
            .replace(
              /(^|[^:])\/\/.*$/gm,
              '$1'
            );

        expect(
          page
        ).not.toMatch(
          /\blocalStorage\b/
        );

        expect(
          page
        ).not.toMatch(
          /\bsessionStorage\b/
        );
      }
    );

    test(
      'ruta vive dentro de /portal',
      () => {
        const nav =
          read(
            navigationFile
          );

        expect(
          nav
        ).toMatch(
          /TerminalApproval/
        );

        expect(
          nav
        ).toMatch(
          /path=["']terminal-autorizacion["']/
        );

        expect(
          nav
        ).toMatch(
          /path=["']\/portal["'][\s\S]*terminal-autorizacion/
        );
      }
    );

    test(
      'dashboard administrativo expone acceso a autorizacion',
      () => {
        const dashboard =
          read(
            dashboardFile
          );

        expect(
          dashboard
        ).toContain(
          '/portal/terminal-autorizacion'
        );

        expect(
          dashboard
        ).toMatch(
          /Autorizar Terminal/i
        );
      }
    );
  }
);
