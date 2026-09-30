// @ts-nocheck

import fs from 'fs';
import path from 'path';


describe(
  'Cambio #3 - justificacion administrativa estructurada',
  () => {

    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          'src/modules/asistencia/Aprobaciones.tsx'
        ),
        'utf8'
      );


    test(
      'define un catalogo cerrado de motivos de justificacion',
      () => {
        expect(
          source
        ).toContain(
          'JUSTIFICATION_REASONS'
        );

        const expectedReasons = [
          'Permiso autorizado',
          'Comisión o actividad laboral externa',
          'Emergencia médica',
          'Emergencia personal o familiar',
          'Incidencia de transporte',
          'Falla de QR o sistema',
          'Error de registro de asistencia',
          'Salida autorizada por supervisor',
          'Capacitación o reunión externa',
          'Otro',
        ];

        for (
          const reason
          of expectedReasons
        ) {
          expect(
            source
          ).toContain(
            reason
          );
        }
      }
    );


    test(
      'mantiene estado independiente para motivo categoria detalle y otro',
      () => {
        expect(
          source
        ).toContain(
          'justificacionMotivo'
        );

        expect(
          source
        ).toContain(
          'justificacionDetalle'
        );

        expect(
          source
        ).toContain(
          'justificacionOtro'
        );
      }
    );


    test(
      'Justificar muestra selector de motivo',
      () => {
        expect(
          source
        ).toContain(
          'Motivo de justificación'
        );

        expect(
          source
        ).toMatch(
          /reviewAction\s*===\s*['"]justify['"][\s\S]*<select/
        );
      }
    );


    test(
      'incluye breve explicacion administrativa',
      () => {
        expect(
          source
        ).toContain(
          'Breve explicación'
        );

        expect(
          source
        ).toContain(
          'Describe brevemente'
        );
      }
    );


    test(
      'Otro habilita campo para especificar el motivo',
      () => {
        expect(
          source
        ).toContain(
          'Especifica el motivo'
        );

        expect(
          source
        ).toMatch(
          /justificacionMotivo\s*===\s*['"]Otro['"]/
        );
      }
    );


    test(
      'valida motivo antes de guardar',
      () => {
        expect(
          source
        ).toContain(
          'Selecciona un motivo de justificación.'
        );
      }
    );


    test(
      'valida breve explicacion antes de guardar',
      () => {
        expect(
          source
        ).toContain(
          'Ingresa una breve explicación.'
        );
      }
    );


    test(
      'Otro requiere especificacion',
      () => {
        expect(
          source
        ).toContain(
          'Especifica el motivo seleccionado como Otro.'
        );
      }
    );


    test(
      'construye un motivo estandarizado para conservar contrato backend',
      () => {
        expect(
          source
        ).toContain(
          'buildJustificationMotivo'
        );

        expect(
          source
        ).toContain(
          'Motivo:'
        );

        expect(
          source
        ).toContain(
          'Detalle:'
        );
      }
    );


    test(
      'justify sigue enviando un unico campo motivo al backend',
      () => {
        expect(
          source
        ).toContain(
          '/justify'
        );

        expect(
          source
        ).toMatch(
          /api\.patch\([\s\S]*\/justify[\s\S]*motivo/
        );
      }
    );


    test(
      'el formulario estructurado se limita a Justificar',
      () => {
        expect(
          source
        ).toMatch(
          /reviewAction\s*===\s*['"]justify['"]/
        );

        expect(
          source
        ).toContain(
          'Motivo administrativo'
        );
      }
    );
  }
);
