// @ts-nocheck

import {
  readFileSync,
} from 'node:fs';

import {
  join,
} from 'node:path';


function source(
  relativePath: string
): string {
  return readFileSync(
    join(
      process.cwd(),
      relativePath
    ),
    'utf8'
  );
}


describe(
  'Admin central approval web boundary',
  () => {

    test(
      'landing y navigation conservan gate administrativo',
      () => {
        const landing =
          source(
            'src/modules/landing/LandingPage.tsx'
          );

        const navigation =
          source(
            'src/navigation/index.tsx'
          );

        expect(
          landing
        ).toContain(
          '/admin/acceso'
        );

        expect(
          navigation
        ).toContain(
          'path="/admin/acceso"'
        );

        expect(
          navigation
        ).toContain(
          'path="/admin/login"'
        );
      }
    );


    test(
      'solicitud inicial no pide ni envia correo',
      () => {
        const access =
          source(
            'src/modules/dashboard/AdminAccess.tsx'
          );

        expect(
          access
        ).toContain(
          "'/auth/admin-access/request'"
        );

        expect(
          access
        ).toContain(
          "'/auth/admin-access/verify'"
        );

        expect(
          access
        ).not.toContain(
          'setCorreo'
        );

        expect(
          access
        ).not.toContain(
          'placeholder="admin@empresa.com"'
        );

        expect(
          access
        ).not.toContain(
          'brandonbernal413@gmail.com'
        );
      }
    );


    test(
      'preautorizacion solo transporta token temporal',
      () => {
        const access =
          source(
            'src/modules/dashboard/AdminAccess.tsx'
          );

        expect(
          access
        ).toContain(
          'adminAccessToken'
        );

        expect(
          access
        ).toContain(
          "navigate(\n        '/admin/login'"
        );

        expect(
          access
        ).not.toMatch(
          /(?:window\.)?localStorage\s*\.\s*(?:setItem|getItem|removeItem|clear)\s*\(/
        );

        expect(
          access
        ).not.toMatch(
          /(?:window\.)?sessionStorage\s*\.\s*(?:setItem|getItem|removeItem|clear)\s*\(/
        );

        expect(
          access
        ).not.toMatch(
          /state:\s*\{[\s\S]{0,180}correo\s*:/
        );
      }
    );


    test(
      'admin login pide credenciales de la cuenta real',
      () => {
        const login =
          source(
            'src/modules/dashboard/AdminLogin.tsx'
          );

        expect(
          login
        ).toContain(
          'setCorreo'
        );

        expect(
          login
        ).toContain(
          'Correo administrativo'
        );

        expect(
          login
        ).toContain(
          "'/auth/admin-login'"
        );

        expect(
          login
        ).toContain(
          'correo:\n              normalizedEmail'
        );

        expect(
          login
        ).toContain(
          'contrasena'
        );

        expect(
          login
        ).not.toContain(
          'state.correo'
        );
      }
    );


    test(
      'admin login usa bearer temporal y obliga 2FA',
      () => {
        const login =
          source(
            'src/modules/dashboard/AdminLogin.tsx'
          );

        expect(
          login
        ).toContain(
          '`Bearer ${adminAccessToken}`'
        );

        expect(
          login
        ).toContain(
          'data?.requires2FA'
        );

        expect(
          login
        ).toContain(
          'challengeId'
        );

        expect(
          login
        ).toContain(
          "'/verify-login-code'"
        );

        expect(
          login
        ).not.toContain(
          'setAuthToken'
        );

        expect(
          login
        ).not.toMatch(
          /(?:window\.)?localStorage\s*\.\s*(?:setItem|getItem|removeItem|clear)\s*\(/
        );

        expect(
          login
        ).not.toMatch(
          /(?:window\.)?sessionStorage\s*\.\s*(?:setItem|getItem|removeItem|clear)\s*\(/
        );
      }
    );


    test(
      'admin login directo sin token vuelve al gate',
      () => {
        const login =
          source(
            'src/modules/dashboard/AdminLogin.tsx'
          );

        expect(
          login
        ).toContain(
          'if (!adminAccessToken)'
        );

        expect(
          login
        ).toContain(
          'to="/admin/acceso"'
        );
      }
    );

  }
);
