// @ts-nocheck

import {
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';


const source =
  readFileSync(
    resolve(
      process.cwd(),
      'src/modules/asistencia/Aprobaciones.tsx'
    ),
    'utf8'
  );


describe(
  'Cambio #3 - portal administra asistencias pendientes de revision',
  () => {

    test(
      'incluye captura de motivo administrativo',
      () => {

        expect(
          source
        ).toMatch(
          /motivo/i
        );


        expect(
          source
        ).toMatch(
          /textarea/
        );


        expect(
          source
        ).toMatch(
          /motivo\.trim\(\)/
        );
      }
    );


    test(
      'aprobar puede enviar motivo al backend',
      () => {

        expect(
          source
        ).toContain(
          '/approve'
        );


        expect(
          source
        ).toMatch(
          /api\.patch\([^;]*\/approve[^;]*motivo/s
        );
      }
    );


    test(
      'rechazar puede enviar motivo al backend',
      () => {

        expect(
          source
        ).toContain(
          '/reject'
        );


        expect(
          source
        ).toMatch(
          /api\.patch\([^;]*\/reject[^;]*motivo/s
        );
      }
    );


    test(
      'implementa accion Justificar',
      () => {

        expect(
          source
        ).toContain(
          '/justify'
        );


        expect(
          source
        ).toMatch(
          />\s*Justificar\s*</
        );


        expect(
          source
        ).toMatch(
          /api\.patch\([^;]*\/justify[^;]*motivo/s
        );
      }
    );


    test(
      'implementa accion Corregir con entrada salida y motivo',
      () => {

        expect(
          source
        ).toContain(
          '/correct'
        );


        expect(
          source
        ).toMatch(
          />\s*Corregir\s*</
        );


        expect(
          source
        ).toMatch(
          /hora_entrada/
        );


        expect(
          source
        ).toMatch(
          /hora_salida/
        );


        expect(
          source
        ).toMatch(
          /api\.patch\([^;]*\/correct[^;]*motivo/s
        );
      }
    );


    test(
      'consulta historial durable de revisiones',
      () => {

        expect(
          source
        ).toContain(
          '/revisiones'
        );


        expect(
          source
        ).toMatch(
          /api\.get\([^;]*\/revisiones/s
        );


        expect(
          source
        ).toMatch(
          /Historial de revisiones/
        );
      }
    );


    test(
      'historial muestra accion motivo actor y cambio de estado',
      () => {

        expect(
          source
        ).toMatch(
          /accion/
        );


        expect(
          source
        ).toMatch(
          /motivo/
        );


        expect(
          source
        ).toMatch(
          /estado_anterior/
        );


        expect(
          source
        ).toMatch(
          /estado_nuevo/
        );


        expect(
          source
        ).toMatch(
          /admin_(nombre|correo)|administrador/i
        );


        expect(
          source
        ).toMatch(
          /created_at|fecha.*revision/i
        );
      }
    );


    test(
      'acciones especiales se asocian solo al estado pendiente de revision',
      () => {

        const revisionIndex =
          source.indexOf(
            "a.estado === 'INVALIDA_PENDIENTE_REVISION'"
          );


        const justifyIndex =
          source.indexOf(
            'Justificar'
          );


        const correctIndex =
          source.indexOf(
            'Corregir'
          );


        expect(
          revisionIndex
        ).toBeGreaterThanOrEqual(
          0
        );


        expect(
          justifyIndex
        ).toBeGreaterThan(
          revisionIndex
        );


        expect(
          correctIndex
        ).toBeGreaterThan(
          revisionIndex
        );
      }
    );
  }
);
