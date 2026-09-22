// @ts-nocheck
import {
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';


const asistenciaSource =
  readFileSync(
    resolve(
      process.cwd(),
      'src/modules/asistencia/Asistencia.tsx'
    ),
    'utf8'
  );


const aprobacionesSource =
  readFileSync(
    resolve(
      process.cwd(),
      'src/modules/asistencia/Aprobaciones.tsx'
    ),
    'utf8'
  );


describe(
  'Cambio #3 - portal reconoce asistencias pendientes de revision',
  () => {

    test(
      'historial general acepta INVALIDA_PENDIENTE_REVISION',
      () => {

        expect(
          asistenciaSource
        ).toContain(
          'INVALIDA_PENDIENTE_REVISION'
        );
      }
    );


    test(
      'historial general incorpora ambos campos de duracion',
      () => {

        const minimo =
          asistenciaSource.match(
            /duracion_minima_aplicada_minutos/g
          ) || [];


        const registrada =
          asistenciaSource.match(
            /duracion_registrada_segundos/g
          ) || [];


        // Al menos tipo + uso visual.
        expect(
          minimo.length
        ).toBeGreaterThanOrEqual(
          2
        );


        expect(
          registrada.length
        ).toBeGreaterThanOrEqual(
          2
        );
      }
    );


    test(
      'resumen general separa pendientes normales de pendientes de revision',
      () => {

        expect(
          asistenciaSource
        ).toMatch(
          /pendientesRevision/
        );


        expect(
          asistenciaSource
        ).toMatch(
          /estado\s*===\s*['"]INVALIDA_PENDIENTE_REVISION['"]/
        );
      }
    );


    test(
      'historial presenta una etiqueta legible para el nuevo estado',
      () => {

        expect(
          asistenciaSource
        ).toMatch(
          /Pendiente de revisión|Pendiente de revision/
        );
      }
    );
  }
);


describe(
  'Cambio #3 - aprobaciones reconoce revision y duracion',
  () => {

    test(
      'lista administrativa acepta INVALIDA_PENDIENTE_REVISION',
      () => {

        expect(
          aprobacionesSource
        ).toContain(
          'INVALIDA_PENDIENTE_REVISION'
        );
      }
    );


    test(
      'lista administrativa incorpora ambos campos de duracion',
      () => {

        const minimo =
          aprobacionesSource.match(
            /duracion_minima_aplicada_minutos/g
          ) || [];


        const registrada =
          aprobacionesSource.match(
            /duracion_registrada_segundos/g
          ) || [];


        // Al menos tipo + uso visual.
        expect(
          minimo.length
        ).toBeGreaterThanOrEqual(
          2
        );


        expect(
          registrada.length
        ).toBeGreaterThanOrEqual(
          2
        );
      }
    );


    test(
      'lista administrativa presenta una etiqueta legible de revision',
      () => {

        expect(
          aprobacionesSource
        ).toMatch(
          /Pendiente de revisión|Pendiente de revision/
        );
      }
    );
  }
);
