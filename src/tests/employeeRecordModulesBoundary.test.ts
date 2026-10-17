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
    expect(documents).toContain('employee-filter-trigger');
    expect(documents).toContain('employee-filter-dropdown');
    expect(documents).toContain('Ocultar lista');
    expect(documents).toContain('setFilterMenuOpen(false)');
    expect(documents).not.toContain('employee-filter-row');
  });

  test('money is formatted and payroll reuses the contractual salary', () => {
    const currencyInput = read('components/CurrencyInput.tsx');

    expect(currencyInput).toContain("new Intl.NumberFormat('es-MX'");
    expect(contracts).toContain("import CurrencyInput from '../../components/CurrencyInput'");
    expect(payroll).toContain("api.get('/contratos')");
    expect(payroll).toContain('readOnly={Boolean(selectedContract)}');
    expect(payroll).toContain('Este importe se aplicará automáticamente a la nómina.');
    expect(contracts).not.toContain('placeholder="Ej. 12000"');
    expect(payroll).not.toContain('placeholder="Ej. 12000"');
  });

  test('table wrappers preserve horizontal access without trapping page scroll', () => {
    expect(styles).toContain('.attendance-review-table-wrapper');
    expect(styles).toContain('.vacation-table-wrapper');
    expect(styles).toContain('.incapacity-table-wrapper');
    expect(styles).toContain('overscroll-behavior: auto !important;');
    expect(styles).toContain('touch-action: pan-x pan-y !important;');
  });

  test('dark record actions reuse the restrained semantic tones from daily operation', () => {
    expect(contracts).toContain('record-action-edit');
    expect(contracts).toContain('record-action-state');
    expect(contracts).toContain('record-action-view');
    expect(payroll).toContain('record-action-edit');
    expect(payroll).toContain('record-action-state');
    expect(styles).toContain(":root[data-theme='dark'] .record-page .record-action-state");
    expect(styles).toContain('rgba(13, 148, 136, 0.20)');
    expect(styles).toContain('rgba(56, 189, 248, 0.18)');
    expect(styles).toContain('rgba(37, 99, 235, 0.19)');
  });

  test('employee pickers remain compact and legible in both themes', () => {
    for (const source of [contracts, payroll]) {
      expect(source).toContain('user-search-avatar');
      expect(source).toContain('user-search-copy');
      expect(source).toContain('user-search-select');
    }
    expect(styles).toContain("record-page .user-search-results");
    expect(styles).toContain('max-height: 286px !important;');
    expect(styles).toContain("background: #0d1b2e !important;");
    expect(styles).toContain("color: #f1f7fd !important;");
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
