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
  'Admin protected access web boundary',
  () => {
    test(
      'landing entra por preautorizacion',
      () => {
        const landing =
          source(
            'src/modules/landing/LandingPage.tsx'
          );

        expect(
          landing
        ).toContain(
          '/admin/acceso'
        );
      }
    );


    test(
      'preautorizacion consume request y verify sin persistir token',
      () => {
        const page =
          source(
            'src/modules/dashboard/AdminAccess.tsx'
          );

        expect(
          page
        ).toContain(
          "'/auth/admin-access/request'"
        );

        expect(
          page
        ).toContain(
          "'/auth/admin-access/verify'"
        );

        expect(
          page
        ).toContain(
          'adminAccessToken'
        );

        expect(
          page
        ).not.toContain(
          'localStorage'
        );

        expect(
          page
        ).not.toContain(
          'setAuthToken'
        );
      }
    );


    test(
      'login administrativo usa bearer temporal y no crea sesion',
      () => {
        const page =
          source(
            'src/modules/dashboard/AdminLogin.tsx'
          );

        expect(
          page
        ).toContain(
          "'/auth/admin-login'"
        );

        expect(
          page
        ).toContain(
          'Bearer ${adminAccessToken}'
        );

        expect(
          page
        ).not.toContain(
          'setAuthToken'
        );

        expect(
          page
        ).not.toContain(
          'localStorage'
        );

        expect(
          page
        ).toContain(
          "'/verify-login-code'"
        );
      }
    );


    test(
      'router expone las dos etapas administrativas',
      () => {
        const navigation =
          source(
            'src/navigation/index.tsx'
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
  }
);
