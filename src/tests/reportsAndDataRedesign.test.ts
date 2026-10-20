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
    expect(navigation).toContain('Reunir información, entender resultados y decidir qué revisar');
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
    expect(dataModule).toContain('Revisa la información importante en un solo lugar');
    expect(dataModule).toContain('Elige lo que necesitas revisar');
    expect(predictions).toContain('Predicciones de personal');
    expect(predictions).toContain('Qué significa el resultado');
    expect(predictions).toContain('Cómo se obtienen las predicciones');
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

  test('predictions prioritize decisions and exclude deleted identities', () => {
    expect(predictions).toContain('isPersonnelRecord');
    expect(predictions).toContain("email.includes('@deleted.smart-rh.invalid')");
    expect(predictions).toContain('ml-overview-strip');
    expect(predictions).toContain('Atención prioritaria');
    expect(predictions).toContain('Descargar vista');
    expect(predictions).toContain("useState(5)");
    expect(styles).toContain('SMART RH — PREDICCIONES / EXPERIENCIA FINAL');
    expect(styles).toContain('.ml-page-pro .ml-decision-notes');
  });

  test('data, reports and predictions explain the next action in everyday language', () => {
    expect(dataModule).toContain('Actualizar resumen');
    expect(dataModule).toContain('Qué estás viendo');
    expect(dataModule).toContain('Qué conviene atender primero');
    expect(reports).toContain('Cada gráfica explica qué muestra, para qué sirve y qué debes revisar');
    expect(reports).toContain('Qué estás viendo');
    expect(reports).toContain('Para qué sirve');
    expect(reports).toContain('Qué hacer');
    expect(predictions).toContain('Aprende de registros previos');
    expect(predictions).toContain('Aciertos del análisis');
    expect(predictions).toContain('Diferencia promedio');
  });
});
