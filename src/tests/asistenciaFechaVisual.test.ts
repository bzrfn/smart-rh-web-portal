// @ts-nocheck

import fs from 'fs';
import path from 'path';


const asistenciaSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      'src/modules/asistencia/Asistencia.tsx'
    ),
    'utf8'
  );


const aprobacionesSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      'src/modules/asistencia/Aprobaciones.tsx'
    ),
    'utf8'
  );


const dateHelperSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      'src/modules/asistencia/asistenciaDate.ts'
    ),
    'utf8'
  );


describe(
  'Cambio #3 - fecha visual de asistencia',
  () => {

    test(
      'historial general no renderiza directamente la fecha cruda del API',
      () => {
        expect(
          asistenciaSource
        ).not.toMatch(
          /<td>\s*\{\s*item\.fecha\s*\}\s*<\/td>/
        );

        expect(
          asistenciaSource
        ).toMatch(
          /formatAttendanceDate\s*\(\s*item\.fecha\s*\)/
        );
      }
    );


    test(
      'aprobaciones no renderiza directamente la fecha cruda del API',
      () => {
        expect(
          aprobacionesSource
        ).not.toMatch(
          /\{\s*a\.fecha\s*\}/
        );

        expect(
          aprobacionesSource
        ).toMatch(
          /formatAttendanceDate\s*\(\s*a\.fecha\s*\)/
        );
      }
    );


    test(
      'ambas vistas utilizan el mismo contrato de formato para fecha de asistencia',
      () => {
        expect(
          asistenciaSource
        ).toContain(
          'formatAttendanceDate'
        );

        expect(
          aprobacionesSource
        ).toContain(
          'formatAttendanceDate'
        );
      }
    );

    test(
      'trata fecha como calendario y evita conversion de zona horaria',
      () => {
        expect(
          dateHelperSource
        ).toContain(
          'formatAttendanceDate'
        );

        expect(
          dateHelperSource
        ).toContain(
          'normalized.match'
        );

        expect(
          dateHelperSource
        ).toContain(
          '${day}/${month}/${year}'
        );

        expect(
          dateHelperSource
        ).not.toContain(
          'new Date('
        );
      }
    );

  }
);
