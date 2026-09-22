// @ts-nocheck

import fs from 'fs';
import path from 'path';


describe(
  'Cambio #3 - colores semanticos de acciones administrativas',
  () => {

    const component =
      fs.readFileSync(
        path.join(
          process.cwd(),
          'src/modules/asistencia/Aprobaciones.tsx'
        ),
        'utf8'
      );

    const styles =
      fs.readFileSync(
        path.join(
          process.cwd(),
          'src/app/styles.css'
        ),
        'utf8'
      );


    test(
      'Justificar tiene clase visual propia',
      () => {
        expect(
          component
        ).toContain(
          'action-btn-justify'
        );
      }
    );


    test(
      'Corregir tiene clase visual propia',
      () => {
        expect(
          component
        ).toContain(
          'action-btn-correct'
        );
      }
    );


    test(
      'Historial tiene clase visual propia',
      () => {
        expect(
          component
        ).toContain(
          'action-btn-history'
        );
      }
    );


    test(
      'los tres colores existen en estilos',
      () => {
        expect(
          styles
        ).toContain(
          '.action-btn-justify'
        );

        expect(
          styles
        ).toContain(
          '.action-btn-correct'
        );

        expect(
          styles
        ).toContain(
          '.action-btn-history'
        );
      }
    );


    test(
      'los tres botones tienen variantes dark',
      () => {
        expect(
          styles
        ).toMatch(
          /data-theme='dark'[\s\S]*action-btn-justify/
        );

        expect(
          styles
        ).toMatch(
          /data-theme='dark'[\s\S]*action-btn-correct/
        );

        expect(
          styles
        ).toMatch(
          /data-theme='dark'[\s\S]*action-btn-history/
        );
      }
    );
  }
);
