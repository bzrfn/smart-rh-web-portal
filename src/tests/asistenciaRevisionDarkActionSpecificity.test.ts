// @ts-nocheck

import fs from 'fs';
import path from 'path';


describe(
  'Cambio #3 - prioridad de colores en dark mode',
  () => {

    const styles =
      fs.readFileSync(
        path.join(
          process.cwd(),
          'src/app/styles.css'
        ),
        'utf8'
      );


    test(
      'la regla neutral excluye Justificar',
      () => {
        expect(
          styles
        ).toContain(
          ':not(.action-btn-justify)'
        );
      }
    );


    test(
      'la regla neutral excluye Corregir',
      () => {
        expect(
          styles
        ).toContain(
          ':not(.action-btn-correct)'
        );
      }
    );


    test(
      'la regla neutral excluye Historial',
      () => {
        expect(
          styles
        ).toContain(
          ':not(.action-btn-history)'
        );
      }
    );


    test(
      'las variantes dark específicas siguen presentes',
      () => {
        expect(
          styles
        ).toContain(
          '.action-btn.action-btn-justify'
        );

        expect(
          styles
        ).toContain(
          '.action-btn.action-btn-correct'
        );

        expect(
          styles
        ).toContain(
          '.action-btn.action-btn-history'
        );
      }
    );
  }
);
