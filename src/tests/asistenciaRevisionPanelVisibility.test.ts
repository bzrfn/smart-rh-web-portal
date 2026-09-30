// @ts-nocheck

import fs from 'fs';
import path from 'path';


describe(
  'Cambio #3 - modal administrativo de asistencia',
  () => {

    const source =
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
      'mantiene referencia y foco accesible',
      () => {
        expect(
          source
        ).toContain(
          'reviewPanelRef'
        );

        expect(
          source
        ).toContain(
          'useRef'
        );

        expect(
          source
        ).toContain(
          '.focus('
        );
      }
    );


    test(
      'ya no desplaza la pagina hacia un panel inferior',
      () => {
        expect(
          source
        ).not.toContain(
          'scrollIntoView'
        );
      }
    );


    test(
      'la revision se presenta como dialogo modal',
      () => {
        expect(
          source
        ).toContain(
          'asistencia-review-modal-backdrop'
        );

        expect(
          source
        ).toContain(
          'asistencia-review-modal'
        );

        expect(
          source
        ).toContain(
          'role="dialog"'
        );

        expect(
          source
        ).toContain(
          'aria-modal="true"'
        );
      }
    );


    test(
      'incluye boton X para cerrar',
      () => {
        expect(
          source
        ).toContain(
          'asistencia-review-modal-close'
        );

        expect(
          source
        ).toContain(
          'aria-label="Cerrar"'
        );
      }
    );


    test(
      'el modal se puede cerrar haciendo clic en el fondo',
      () => {
        expect(
          source
        ).toMatch(
          /event\.target\s*===\s*event\.currentTarget/
        );

        expect(
          source
        ).toContain(
          'closeReviewPanel();'
        );
      }
    );


    test(
      'el modal posee estilos flotantes reales',
      () => {
        expect(
          styles
        ).toContain(
          '.asistencia-review-modal-backdrop'
        );

        expect(
          styles
        ).toContain(
          'position: fixed'
        );

        expect(
          styles
        ).toContain(
          '.asistencia-review-modal-close'
        );
      }
    );
  }
);
