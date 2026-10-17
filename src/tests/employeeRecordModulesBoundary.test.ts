// @ts-ignore -- Jest runs in Node; the web tsconfig intentionally omits Node types.
import fs from 'node:fs';

const read = (relativePath: string) => fs.readFileSync(`src/${relativePath}`, 'utf8');

describe('Expediente laboral visual contract', () => {
  const contracts = read('modules/contratos/index.tsx');
  const payroll = read('modules/nomina/index.tsx');
  const documents = read('modules/documentacion/DocumentacionEmpleado.tsx');
  const styles = read('app/styles.css');

  test('contracts and payroll never expose database IDs as table columns or titles', () => {
    expect(contracts).not.toContain('<th>ID</th>');
    expect(payroll).not.toContain('<th>ID</th>');
    expect(contracts).not.toContain('Editar contrato #{edit.id}');
    expect(payroll).not.toContain('Editar nómina #{edit.id}');
    expect(contracts).not.toContain('Contrato #${selectedUserLatestContrato.id}');
  });

  test('record histories use status filters and the approved operation table pattern', () => {
    for (const source of [contracts, payroll]) {
      expect(source).toContain('record-filter-tabs');
      expect(source).toContain('operation-table-wrapper record-table-wrapper');
      expect(source).toContain('operation-person-avatar');
      expect(source).toContain('data-label="Empleado"');
      expect(source).toContain('filteredItems.slice');
    }
  });

  test('existing record actions remain wired to their APIs', () => {
    expect(contracts).toContain("api.post('/contratos'");
    expect(contracts).toContain('api.put(`/contratos/${edit.id}`');
    expect(contracts).toContain('api.patch(`/contratos/${item.id}/estado`');
    expect(payroll).toContain("api.post('/nominas'");
    expect(payroll).toContain('api.put(`/nominas/${edit.id}`');
    expect(payroll).toContain('api.patch(`/nominas/${item.id}/estado`');
    expect(documents).toContain('api.post(`/documentos/usuarios/${selectedId}/contrato-pdf`');
    expect(documents).toContain('api.post(`/documentos/usuarios/${selectedId}/credencial-imagen`');
    expect(documents).toContain('api.patch(`/documentos/usuarios/${selectedId}/foto-perfil`');
  });

  test('documents present a compact workflow and meaningful completion summary', () => {
    expect(documents).toContain('record-document-summary');
    expect(documents).toContain('Expedientes completos');
    expect(documents).toContain('Paso 1');
    expect(documents).toContain('Paso 2');
    expect(documents).not.toContain('trazabilidad en MongoDB');
  });

  test('shared styles cover responsive tables, forms, documents, and dark mode', () => {
    expect(styles).toContain('SMART RH · EXPEDIENTE LABORAL');
    expect(styles).toContain('.record-form-grid');
    expect(styles).toContain('.record-table');
    expect(styles).toContain('.record-document-summary');
    expect(styles).toContain(":root[data-theme='dark'] .record-page > .module-card");
    expect(styles).toContain('@media (max-width: 900px)');
  });
});
