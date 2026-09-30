// @ts-nocheck

import fs from 'fs';
import path from 'path';


function readSource(
  relativePath: string
): string {
  return fs.readFileSync(
    path.resolve(
      process.cwd(),
      relativePath
    ),
    'utf8'
  );
}


describe(
  'Incapacidades — portal administrativo SMART RH',
  () => {
    const auth =
      readSource(
        'src/app/auth/AuthContext.tsx'
      );

    const navigation =
      readSource(
        'src/navigation/index.tsx'
      );

    const shell =
      readSource(
        'src/app/layout/AppShell.tsx'
      );

    const dashboard =
      readSource(
        'src/modules/dashboard/Dashboard.tsx'
      );

    const moduleSource =
      readSource(
        'src/modules/incapacidades/index.tsx'
      );


    test(
      'el portal continúa siendo exclusivo para administradores',
      () => {
        expect(
          auth
        ).toContain(
          "role !== 'admin'"
        );

        expect(
          navigation
        ).toContain(
          '{isAdmin ? ('
        );

        expect(
          navigation
        ).toContain(
          '<Route path="/portal" element={<AppShell />}>'
        );
      }
    );


    test(
      'el módulo está registrado dentro de /portal',
      () => {
        expect(
          navigation
        ).toContain(
          "import Incapacidades from '../modules/incapacidades'"
        );

        expect(
          navigation
        ).toContain(
          '<Route path="incapacidades" element={<Incapacidades />} />'
        );

        expect(
          navigation
        ).toContain(
          '/portal/incapacidades'
        );
      }
    );


    test(
      'la navegación marca incapacidades como admin-only',
      () => {
        const index =
          shell.indexOf(
            "path: '/portal/incapacidades'"
          );

        expect(
          index
        ).toBeGreaterThanOrEqual(
          0
        );

        const block =
          shell.slice(
            index,
            index + 300
          );

        expect(
          block
        ).toContain(
          "label: 'Incapacidades'"
        );

        expect(
          block
        ).toContain(
          'adminOnly: true'
        );
      }
    );


    test(
      'el dashboard muestra incapacidades solo a administradores',
      () => {
        const index =
          dashboard.indexOf(
            "path: '/incapacidades'"
          );

        expect(
          index
        ).toBeGreaterThanOrEqual(
          0
        );

        const block =
          dashboard.slice(
            index,
            index + 420
          );

        expect(
          block
        ).toContain(
          "title: 'Incapacidades'"
        );

        expect(
          block
        ).toContain(
          'adminOnly: true'
        );

        expect(
          dashboard
        ).toContain(
          '{isAdmin && <Link to="/incapacidades">Incapacidades</Link>}'
        );
      }
    );


    test(
      'consume listado y detalle administrativo',
      () => {
        expect(
          moduleSource
        ).toContain(
          "'/incapacidades'"
        );

        expect(
          moduleSource
        ).toContain(
          '`/incapacidades/${item.id}`'
        );
      }
    );


    test(
      'ejecuta revisión administrativa por endpoint oficial',
      () => {
        expect(
          moduleSource
        ).toContain(
          '/revision'
        );

        expect(
          moduleSource
        ).toContain(
          "'aprobada'"
        );

        expect(
          moduleSource
        ).toContain(
          "'rechazada'"
        );

        expect(
          moduleSource
        ).toContain(
          'observaciones_admin'
        );
      }
    );


    test(
      'abre comprobante mediante recurso protegido',
      () => {
        expect(
          moduleSource
        ).toContain(
          'openProtectedResource'
        );

        expect(
          moduleSource
        ).toContain(
          'comprobante_key'
        );

        expect(
          moduleSource
        ).toContain(
          '/uploads/'
        );
      }
    );


    test(
      'muestra trazabilidad de la resolución',
      () => {
        expect(
          moduleSource
        ).toContain(
          'revisado_por_admin_id'
        );

        expect(
          moduleSource
        ).toContain(
          'revisado_at'
        );

        expect(
          moduleSource
        ).toContain(
          'admin_nombre'
        );

        expect(
          moduleSource
        ).toContain(
          'admin_apellido'
        );
      }
    );
  }
);
