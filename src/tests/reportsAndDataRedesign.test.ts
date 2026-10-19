// @ts-ignore -- Jest runs in Node; the web tsconfig intentionally omits Node types.
import fs from 'node:fs';

const read = (relativePath: string) => fs.readFileSync(`src/${relativePath}`, 'utf8');

describe('Reportes y datos visual contract', () => {
  const navigation = read('components/AnalyticsModuleNav.tsx');
  const dataModule = read('components/ETLProcess.tsx');
  const reports = read('pages/DashboardAnalitico.tsx');
  const predictions = read('modules/ml/AnalisisSupervisado.tsx');
  const styles = read('app/styles.css');
  const dataStyles = read('components/ETLProcess.css');

  test('the three modules share a clear persistent workflow navigation', () => {
    expect(navigation).toContain("'/portal/etl'");
    expect(navigation).toContain("'/portal/dashboard-analitico'");
    expect(navigation).toContain("'/portal/analisis-supervisado'");
    expect(navigation).toContain('Preparar, interpretar y anticipar');
    expect(dataModule).toContain('<AnalyticsModuleNav />');
    expect(reports).toContain('<AnalyticsModuleNav />');
    expect(predictions).toContain('<AnalyticsModuleNav />');
  });

  test('reports separate the information into four focused views', () => {
    expect(reports).toContain("type AnalyticsView = 'operativa'");
    expect(reports).toContain('analytics-view-switcher');
    expect(reports).toContain("activeView === 'operativa'");
    expect(reports).toContain("activeView === 'administrativa'");
    expect(reports).toContain("activeView === 'comparativa'");
    expect(reports).toContain("activeView === 'segmentos'");
    expect(reports).toContain('Estas comparaciones no determinan por sí solas una causa');
  });

  test('visible language explains the modules to non-technical users', () => {
    expect(dataModule).toContain('Datos listos para revisar');
    expect(dataModule).toContain('Revisión de información preparada');
    expect(predictions).toContain('Predicciones de personal');
    expect(predictions).toContain('Precisión del análisis');
    expect(predictions).toContain('Nivel preventivo');
    expect(reports).toContain('Reportes de Recursos Humanos');
    expect(reports).toContain('Grupos de personal');
  });

  test('the final styling keeps compact SMART RH surfaces in both themes', () => {
    expect(styles).toContain('.analytics-module-nav {');
    expect(styles).toContain('.analytics-view-switcher {');
    expect(styles).toContain("[data-theme='dark'] .analytics-module-nav");
    expect(styles).toContain('background: var(--primary) !important');
    expect(dataStyles).toContain('Experiencia final de Datos');
    expect(dataStyles).toContain('background: var(--card) !important');
    expect(styles).not.toMatch(/#7c3aed|#8b5cf6|#a855f7|#9333ea/i);
  });

  test('the new navigation and views adapt to narrower screens', () => {
    expect(styles).toContain('@media (max-width: 980px)');
    expect(styles).toContain('@media (max-width: 760px)');
    expect(styles).toContain('grid-template-columns: 1fr');
    expect(dataStyles).toContain('@media (max-width: 900px)');
  });
});
