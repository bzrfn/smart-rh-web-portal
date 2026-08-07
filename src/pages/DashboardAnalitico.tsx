import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../app/auth/AuthContext';
import { api } from '../services/api';

/* =========================================================
   1. TIPOS GENERALES
   ========================================================= */

type ThemeMode = 'dark' | 'light';
type Accent = 'blue' | 'teal' | 'gold' | 'danger' | 'purple';
type ChartCategory = 'Operativa' | 'Administrativa' | 'Comparativa' | 'Machine Learning';

type ChartItem = {
  name: string;
  value: number;
};

type AnalyticsResponse = {
  generatedAt: string;
  kpis: {
    totalEmpleados: number;
    totalAsistencias: number;
    asistenciasAprobadas: number;
    asistenciasPendientes: number;
    asistenciasRechazadas: number;
    tasaAprobacion: number;
    promedioNomina: number;
    solicitudesVacaciones: number;
    contratosActivos: number;
    totalIncidencias: number;
  };
  charts: {
    asistenciasPorEstado: ChartItem[];
    asistenciasPorFecha: {
      fecha: string;
      asistencias: number;
      aprobadas: number;
      pendientes: number;
      rechazadas: number;
    }[];
    nominaTopEmpleados: {
      usuario_id: number;
      empleado: string;
      promedio_nomina: number;
    }[];
    vacacionesPorEstado: ChartItem[];
    vacacionesPorEmpleado: {
      usuario_id: number;
      empleado: string;
      solicitudes: number;
      dias_solicitados: number;
    }[];
    contratosPorEstado: ChartItem[];
    asistenciaVsNomina: {
      usuario_id: number;
      empleado: string;
      correo: string;
      tasa_asistencia: number;
      nomina_promedio: number;
      asistencias: number;
      incidencias: number;
      solicitudes_vacaciones: number;
    }[];
  };
  interpretaciones: {
    asistencia: string;
    nomina: string;
    vacaciones: string;
    incidencias: string;
    conclusion: string;
  };
  graficas: {
    nombre: string;
    tipo: string;
    pregunta: string;
    justificacion: string;
  }[];
};

type KMeansTraining = {
  mejorResultado: {
    k: number;
    silhouette: number;
    inertia: number;
    clusters: {
      cluster: number;
      total: number;
      porcentaje: number;
      perfil: string;
    }[];
  };
};

type ThemeColors = ReturnType<typeof getColors>;

type VisualizationInfo = {
  number: string;
  category: ChartCategory;
  title: string;
  chartType: string;
  source: string;
  question: string;
  description: string;
  whyThisChart: string;
  accent: Accent;
};

/* =========================================================
   2. UTILIDADES DE TEMA
   ========================================================= */

function resolveThemeMode(): ThemeMode {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'dark';
  }

  const html = document.documentElement;
  const body = document.body;

  const storedTheme =
    localStorage.getItem('theme') ||
    localStorage.getItem('smart-rh-theme') ||
    localStorage.getItem('rrhh_theme');

  const themeAttribute =
    html.getAttribute('data-theme') ||
    body.getAttribute('data-theme') ||
    storedTheme ||
    '';

  const className = `${html.className || ''} ${body.className || ''}`.toLowerCase();
  const normalizedTheme = themeAttribute.toLowerCase();

  if (
    normalizedTheme.includes('light') ||
    normalizedTheme.includes('claro') ||
    className.includes('light') ||
    className.includes('claro')
  ) {
    return 'light';
  }

  if (
    normalizedTheme.includes('dark') ||
    normalizedTheme.includes('oscuro') ||
    className.includes('dark') ||
    className.includes('oscuro')
  ) {
    return 'dark';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function usePortalTheme(authTheme?: string): ThemeMode {
  const [domTheme, setDomTheme] = useState<ThemeMode>(() => resolveThemeMode());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const updateTheme = () => setDomTheme(resolveThemeMode());
    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    window.addEventListener('storage', updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  const normalizedAuthTheme = String(authTheme || '').toLowerCase();

  if (normalizedAuthTheme.includes('light') || normalizedAuthTheme.includes('claro')) {
    return 'light';
  }

  if (normalizedAuthTheme.includes('dark') || normalizedAuthTheme.includes('oscuro')) {
    return 'dark';
  }

  return domTheme;
}

/* =========================================================
   3. UTILIDADES DE FORMATO
   ========================================================= */

function formatMoney(value?: number | null) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '$0';

  return number.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });
}

function formatPercent(value?: number | null) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '0%';

  return `${Math.round(number * 100)}%`;
}

function formatNumber(value?: number | null, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '0';

  return number.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getSilhouetteLabel(value?: number | null) {
  const score = Number(value);

  if (!Number.isFinite(score)) return 'Pendiente';
  if (score >= 0.7) return 'Muy bueno';
  if (score >= 0.5) return 'Bueno';
  if (score >= 0.25) return 'Moderado';

  return 'Bajo';
}

function getSilhouetteExplanation(value?: number | null) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 'Aún no se cuenta con resultado de silueta.';
  }

  if (score >= 0.7) {
    return 'Los grupos están muy bien separados y el resultado es fuerte.';
  }

  if (score >= 0.5) {
    return 'Los grupos tienen buena separación y el resultado es útil.';
  }

  if (score >= 0.25) {
    return 'La separación es moderada; sirve como referencia, pero requiere revisión.';
  }

  return 'La separación es baja; se recomienda agregar más datos o revisar variables.';
}

function hasData<T>(data?: T[]) {
  return Array.isArray(data) && data.length > 0;
}

function getEmptyAnalytics(): AnalyticsResponse {
  return {
    generatedAt: '',
    kpis: {
      totalEmpleados: 0,
      totalAsistencias: 0,
      asistenciasAprobadas: 0,
      asistenciasPendientes: 0,
      asistenciasRechazadas: 0,
      tasaAprobacion: 0,
      promedioNomina: 0,
      solicitudesVacaciones: 0,
      contratosActivos: 0,
      totalIncidencias: 0,
    },
    charts: {
      asistenciasPorEstado: [],
      asistenciasPorFecha: [],
      nominaTopEmpleados: [],
      vacacionesPorEstado: [],
      vacacionesPorEmpleado: [],
      contratosPorEstado: [],
      asistenciaVsNomina: [],
    },
    interpretaciones: {
      asistencia: '',
      nomina: '',
      vacaciones: '',
      incidencias: '',
      conclusion: '',
    },
    graficas: [],
  };
}

function getAccentColor(accent: Accent, colors: ThemeColors) {
  if (accent === 'teal') return colors.teal;
  if (accent === 'gold') return colors.gold;
  if (accent === 'danger') return colors.danger;
  if (accent === 'purple') return colors.purple;

  return colors.primary;
}

/* =========================================================
   4. COMPONENTE PRINCIPAL
   ========================================================= */

export default function DashboardAnalitico() {
  const authContext = useAuth() as any;
  const themeMode = usePortalTheme(authContext?.theme);
  const isDark = themeMode === 'dark';

  const colors = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [analytics, setAnalytics] = useState<AnalyticsResponse>(getEmptyAnalytics());
  const [kmeans, setKmeans] = useState<KMeansTraining | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const incidenciasPorFecha = useMemo(() => {
    return analytics.charts.asistenciasPorFecha.map((item) => ({
      fecha: item.fecha,
      pendientes: item.pendientes,
      rechazadas: item.rechazadas,
      incidencias: item.pendientes + item.rechazadas,
    }));
  }, [analytics.charts.asistenciasPorFecha]);

  const vacacionesTop = useMemo(() => {
    return [...analytics.charts.vacacionesPorEmpleado]
      .sort((a, b) => b.dias_solicitados - a.dias_solicitados)
      .slice(0, 10);
  }, [analytics.charts.vacacionesPorEmpleado]);

  const clusterBarChart = useMemo(() => {
    if (!kmeans?.mejorResultado?.clusters) return [];

    return kmeans.mejorResultado.clusters.map((cluster) => ({
      name: `Cluster ${cluster.cluster + 1}`,
      empleados: cluster.total,
      porcentaje: cluster.porcentaje,
      perfil: cluster.perfil,
    }));
  }, [kmeans]);

  const clusterDonutChart = useMemo(() => {
    return clusterBarChart.map((cluster) => ({
      name: cluster.name,
      value: cluster.empleados,
      porcentaje: cluster.porcentaje,
    }));
  }, [clusterBarChart]);

  const incidenciasVsVacaciones = useMemo(() => {
    return analytics.charts.asistenciaVsNomina.map((item) => ({
      usuario_id: item.usuario_id,
      empleado: item.empleado,
      incidencias: item.incidencias,
      solicitudes_vacaciones: item.solicitudes_vacaciones,
      asistencias: item.asistencias,
    }));
  }, [analytics.charts.asistenciaVsNomina]);

  const dataQuality = useMemo(() => {
    const chartsWithData = [
      analytics.charts.asistenciasPorEstado,
      analytics.charts.asistenciasPorFecha,
      analytics.charts.nominaTopEmpleados,
      analytics.charts.vacacionesPorEstado,
      analytics.charts.vacacionesPorEmpleado,
      analytics.charts.contratosPorEstado,
      analytics.charts.asistenciaVsNomina,
      clusterBarChart,
    ].filter((items) => items.length > 0).length;

    return {
      chartsWithData,
      totalCharts: 8,
      label:
        chartsWithData >= 7
          ? 'Completa'
          : chartsWithData >= 5
            ? 'Aceptable'
            : 'Limitada',
    };
  }, [analytics, clusterBarChart]);

  const dashboardConclusion = useMemo(() => {
    const asistencia = analytics.kpis.tasaAprobacion;
    const incidencias = analytics.kpis.totalIncidencias;
    const empleados = analytics.kpis.totalEmpleados;

    if (!empleados) {
      return 'El dashboard aún no cuenta con empleados suficientes para generar una conclusión sólida.';
    }

    if (asistencia >= 0.8 && incidencias <= empleados) {
      return 'El comportamiento general es favorable: la mayoría de asistencias se encuentran aprobadas y las incidencias son controladas.';
    }

    if (asistencia >= 0.5) {
      return 'El comportamiento general es moderado: existen registros aprobados, pero también incidencias que deben revisarse.';
    }

    return 'El comportamiento general requiere atención: la tasa de aprobación es baja o existen incidencias relevantes.';
  }, [analytics.kpis]);

  async function cargarDashboard() {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/analytics/resumen-visual');
      setAnalytics(data);

      try {
        const kmeansResponse = await api.post('/kmeans/entrenar', {
          k: 3,
          trials: 10,
          maxIterations: 100,
        });

        setKmeans(kmeansResponse.data);
      } catch {
        setKmeans(null);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo cargar el Dashboard Analítico.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <span style={styles.chip}>Visualización de datos</span>
          <h1 style={styles.title}>Dashboard Analítico SMART RH</h1>
          <p style={styles.subtitle}>
            Panel de gráficas para representar información de asistencia, nómina,
            vacaciones, contratos y K-means. 
          </p>

          <div style={styles.heroTags}>
            <MiniTag label="Gráficas" value="11" styles={styles} />
            <MiniTag label="Categorías" value="4" styles={styles} />
            <MiniTag label="Fuente" value="MySQL + ML" styles={styles} />
          </div>
        </div>

        <aside style={styles.heroPanel}>
          <span style={styles.eyebrow}>Conclusión general</span>
          <h2 style={styles.panelTitle}>{dataQuality.label}</h2>
          <p style={styles.panelText}>
            {analytics.interpretaciones.conclusion || dashboardConclusion}
          </p>

          <div style={styles.panelInfoGrid}>
            <PanelMetric
              label="Gráficas con datos"
              value={`${dataQuality.chartsWithData}/${dataQuality.totalCharts}`}
              styles={styles}
            />
            <PanelMetric
              label="Calidad K-means"
              value={getSilhouetteLabel(kmeans?.mejorResultado?.silhouette)}
              styles={styles}
            />
          </div>

          <button style={styles.primaryButton} onClick={cargarDashboard} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar dashboard'}
          </button>
        </aside>
      </section>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      {loading ? (
        <div style={styles.loadingBox}>
          <span style={styles.loadingDot} />
          Cargando datos visuales...
        </div>
      ) : null}

      <section style={styles.kpiGrid}>
        <KpiCard
          title="Empleados analizados"
          value={String(analytics.kpis.totalEmpleados)}
          detail="Registros activos considerados"
          accent="blue"
          styles={styles}
          colors={colors}
        />
        <KpiCard
          title="Asistencias registradas"
          value={String(analytics.kpis.totalAsistencias)}
          detail={`Aprobación general ${formatPercent(analytics.kpis.tasaAprobacion)}`}
          accent="teal"
          styles={styles}
          colors={colors}
        />
        <KpiCard
          title="Nómina promedio"
          value={formatMoney(analytics.kpis.promedioNomina)}
          detail="Promedio general analizado"
          accent="gold"
          styles={styles}
          colors={colors}
        />
        <KpiCard
          title="Vacaciones"
          value={String(analytics.kpis.solicitudesVacaciones)}
          detail="Solicitudes registradas"
          accent="purple"
          styles={styles}
          colors={colors}
        />
        <KpiCard
          title="Contratos activos"
          value={String(analytics.kpis.contratosActivos)}
          detail="Situación contractual vigente"
          accent="blue"
          styles={styles}
          colors={colors}
        />
        <KpiCard
          title="Incidencias"
          value={String(analytics.kpis.totalIncidencias)}
          detail="Pendientes y rechazadas"
          accent="danger"
          styles={styles}
          colors={colors}
        />
      </section>

      <section style={styles.explainCard}>
        <SectionHeading
          eyebrow="Guía de lectura"
          title="Cómo interpretar este dashboard"
          text="El dashboard está dividido en cuatro bloques: visualización operativa, administrativa, comparativa y Machine Learning."
          styles={styles}
        />

        <div style={styles.readingGrid}>
          <ReadingStep
            number="01"
            title="Operativa"
            text="Explica asistencia, estados e incidencias."
            styles={styles}
          />
          <ReadingStep
            number="02"
            title="Administrativa"
            text="Explica nómina, contratos y vacaciones."
            styles={styles}
          />
          <ReadingStep
            number="03"
            title="Comparativa"
            text="Cruza variables para detectar patrones."
            styles={styles}
          />
          <ReadingStep
            number="04"
            title="Machine Learning"
            text="Visualiza los grupos generados por K-means."
            styles={styles}
          />
        </div>
      </section>

      <DashboardSection
        category="Operativa"
        title="1. Visualización operativa"
        text="Estas gráficas explican cómo se comportan los registros de asistencia y dónde se concentran las incidencias."
        styles={styles}
      />

      <section style={styles.gridTwo}>
        <Grafica01AsistenciasPorEstado
          data={analytics.charts.asistenciasPorEstado}
          interpretacion={analytics.interpretaciones.asistencia}
          styles={styles}
          colors={colors}
        />

        <Grafica02EvolucionAsistencias
          data={analytics.charts.asistenciasPorFecha}
          styles={styles}
          colors={colors}
        />
      </section>

      <section style={styles.gridOne}>
        <Grafica03IncidenciasPorFecha
          data={incidenciasPorFecha}
          interpretacion={analytics.interpretaciones.incidencias}
          styles={styles}
          colors={colors}
        />
      </section>

      <DashboardSection
        category="Administrativa"
        title="2. Visualización administrativa"
        text="Estas gráficas explican la información administrativa del sistema: nómina, vacaciones y contratos."
        styles={styles}
      />

      <section style={styles.gridTwo}>
        <Grafica04NominaPromedio
          data={analytics.charts.nominaTopEmpleados}
          interpretacion={analytics.interpretaciones.nomina}
          styles={styles}
          colors={colors}
        />

        <Grafica05VacacionesPorEstado
          data={analytics.charts.vacacionesPorEstado}
          interpretacion={analytics.interpretaciones.vacaciones}
          styles={styles}
          colors={colors}
        />
      </section>

      <section style={styles.gridTwo}>
        <Grafica06DiasVacaciones
          data={vacacionesTop}
          styles={styles}
          colors={colors}
        />

        <Grafica07ContratosPorEstado
          data={analytics.charts.contratosPorEstado}
          styles={styles}
          colors={colors}
        />
      </section>

      <DashboardSection
        category="Comparativa"
        title="3. Visualización comparativa"
        text="Estas gráficas cruzan variables para observar patrones. No se usan para afirmar causalidad, sino para detectar relaciones visuales."
        styles={styles}
      />

      <section style={styles.gridTwo}>
        <Grafica08AsistenciaVsNomina
          data={analytics.charts.asistenciaVsNomina}
          styles={styles}
          colors={colors}
        />

        <Grafica09IncidenciasVsVacaciones
          data={incidenciasVsVacaciones}
          styles={styles}
          colors={colors}
        />
      </section>

      <DashboardSection
        category="Machine Learning"
        title="4. Visualización Machine Learning"
        text="Estas gráficas muestran cómo se distribuyen los empleados después de aplicar K-means."
        styles={styles}
      />

      <section style={styles.gridTwo}>
        <Grafica10KMeansBarras
          data={clusterBarChart}
          kmeans={kmeans}
          styles={styles}
          colors={colors}
        />

        <Grafica11KMeansDona
          data={clusterDonutChart}
          kmeans={kmeans}
          styles={styles}
          colors={colors}
        />
      </section>

      <TablaJustificacion styles={styles} />

      <section style={styles.conclusionCard}>
        <SectionHeading
          eyebrow="Conclusiones"
          title="Interpretación final"
          text="Resumen ejecutivo de lo que presentan las gráficas principales."
          styles={styles}
        />

        <div style={styles.conclusionGrid}>
          <ConclusionItem
            title="Asistencia"
            text={analytics.interpretaciones.asistencia}
            fallback="La asistencia permite medir el comportamiento operativo del personal."
            styles={styles}
          />
          <ConclusionItem
            title="Nómina"
            text={analytics.interpretaciones.nomina}
            fallback="La nómina permite comparar información económica registrada por empleado."
            styles={styles}
          />
          <ConclusionItem
            title="Vacaciones"
            text={analytics.interpretaciones.vacaciones}
            fallback="Las vacaciones muestran solicitudes y carga administrativa."
            styles={styles}
          />
          <ConclusionItem
            title="Incidencias"
            text={analytics.interpretaciones.incidencias}
            fallback="Las incidencias ayudan a detectar casos que requieren revisión."
            styles={styles}
          />
          <ConclusionItem
            title="K-means"
            text={
              kmeans
                ? `El resultado K-means se interpreta como ${getSilhouetteLabel(
                    kmeans.mejorResultado.silhouette
                  )}. ${getSilhouetteExplanation(kmeans.mejorResultado.silhouette)}`
                : ''
            }
            fallback="K-means se mostrará cuando el endpoint de entrenamiento esté disponible."
            styles={styles}
          />
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   5. GRÁFICAS INDEPENDIENTES
   Cada gráfica tiene SU DISEÑO dentro de su mismo bloque.
   ========================================================= */

/* =========================================================
   GRÁFICA 01: ASISTENCIAS POR ESTADO
   ========================================================= */

function Grafica01AsistenciasPorEstado({
  data,
  interpretacion,
  styles,
  colors,
}: {
  data: ChartItem[];
  interpretacion: string;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar la barra de APROBADA:
    cambia colorBarraAprobada.

    Para cambiar la barra de PENDIENTE:
    cambia colorBarraPendiente.

    Para cambiar la barra de RECHAZADA:
    cambia colorBarraRechazada.
  */
  const altoGrafica = 340;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorBarraAprobada = colors.isDark ? '#38BDF8' : '#0A57A4';
  const colorBarraPendiente = colors.isDark ? '#2DD4BF' : '#0F9F96';
  const colorBarraRechazada = colors.isDark ? '#FACC15' : '#B45309';

  const radioSuperiorBarras: [number, number, number, number] = [14, 14, 0, 0];
  const separacionCuadricula = '3 3';

  const coloresPorEstado: Record<string, string> = {
    aprobada: colorBarraAprobada,
    pendiente: colorBarraPendiente,
    rechazada: colorBarraRechazada,
  };

  const info: VisualizationInfo = {
    number: '01',
    category: 'Operativa',
    title: 'Asistencias por estado',
    chartType: 'Gráfica de barras verticales',
    source: 'Tabla asistencias, campo estado',
    question: '¿Cuántas asistencias fueron aprobadas, pendientes o rechazadas?',
    description:
      'Presenta el conteo de registros de asistencia agrupados por estado administrativo.',
    whyThisChart:
      'Se usa barras porque permite comparar categorías independientes de manera clara.',
    accent: 'blue',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis dataKey="name" stroke={colorTextoEjes} />
              <YAxis stroke={colorTextoEjes} />
              <Tooltip contentStyle={styles.tooltip} />
              <Bar
                dataKey="value"
                name="Registros"
                radius={radioSuperiorBarras}
              >
                {data.map((item, index) => (
                  <Cell
                    key={`asistencia-estado-${index}`}
                    fill={coloresPorEstado[item.name] || colorBarraAprobada}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos de asistencia por estado." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text={interpretacion}
        fallback="Si predominan las aprobadas, el comportamiento operativo es estable. Si aumentan pendientes o rechazadas, hay incidencias que revisar."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 02: EVOLUCIÓN DE ASISTENCIAS
   ========================================================= */

function Grafica02EvolucionAsistencias({
  data,
  styles,
  colors,
}: {
  data: AnalyticsResponse['charts']['asistenciasPorFecha'];
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar la línea/área de ASISTENCIAS:
    cambia colorLineaAsistencias y colorAreaAsistencias.

    Para cambiar la línea de APROBADAS:
    cambia colorLineaAprobadas.
  */
  const altoGrafica = 340;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorLineaAsistencias = colors.isDark ? '#38BDF8' : '#2563EB';
  const colorAreaAsistencias = colors.isDark ? '#38BDF8' : '#2563EB';
  const colorLineaAprobadas = colors.isDark ? '#2DD4BF' : '#0F9F96';

  const grosorLineaAsistencias = 3;
  const grosorLineaAprobadas = 3;
  const radioPunto = 3;
  const radioPuntoActivo = 6;
  const opacidadAreaInicio = 0.35;
  const opacidadAreaFinal = 0.02;
  const separacionCuadricula = '3 3';

  const info: VisualizationInfo = {
    number: '02',
    category: 'Operativa',
    title: 'Evolución de asistencias',
    chartType: 'Gráfica de área y línea',
    source: 'Tabla asistencias, campos fecha y estado',
    question: '¿Cómo cambia el registro de asistencias con el tiempo?',
    description:
      'Muestra la cantidad total de asistencias y asistencias aprobadas por fecha.',
    whyThisChart:
      'Se usa línea o área porque representa una tendencia temporal.',
    accent: 'teal',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="areaAsistenciasGrafica02" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={colorAreaAsistencias}
                    stopOpacity={opacidadAreaInicio}
                  />
                  <stop
                    offset="95%"
                    stopColor={colorAreaAsistencias}
                    stopOpacity={opacidadAreaFinal}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis dataKey="fecha" stroke={colorTextoEjes} />
              <YAxis stroke={colorTextoEjes} />
              <Tooltip contentStyle={styles.tooltip} />
              <Legend />

              <Area
                type="monotone"
                dataKey="asistencias"
                name="Asistencias"
                stroke={colorLineaAsistencias}
                fill="url(#areaAsistenciasGrafica02)"
                strokeWidth={grosorLineaAsistencias}
              />

              <Line
                type="monotone"
                dataKey="aprobadas"
                name="Aprobadas"
                stroke={colorLineaAprobadas}
                strokeWidth={grosorLineaAprobadas}
                dot={{ r: radioPunto }}
                activeDot={{ r: radioPuntoActivo }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos de evolución de asistencias." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text="Esta gráfica permite observar la tendencia de registros por fecha y comparar el total contra las asistencias aprobadas."
        fallback="Permite detectar picos, caídas o días con menor actividad laboral."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 03: INCIDENCIAS POR FECHA
   ========================================================= */

function Grafica03IncidenciasPorFecha({
  data,
  interpretacion,
  styles,
  colors,
}: {
  data: {
    fecha: string;
    pendientes: number;
    rechazadas: number;
    incidencias: number;
  }[];
  interpretacion: string;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar la línea de PENDIENTES:
    cambia colorLineaPendientes.

    Para cambiar la línea de RECHAZADAS:
    cambia colorLineaRechazadas.

    Para cambiar la línea de INCIDENCIAS TOTALES:
    cambia colorLineaIncidencias.
  */
  const altoGrafica = 350;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorLineaPendientes = colors.isDark ? '#FACC15' : '#B45309';
  const colorLineaRechazadas = colors.isDark ? '#F87171' : '#D64545';
  const colorLineaIncidencias = colors.isDark ? '#A78BFA' : '#7C3AED';

  const grosorLinea = 3;
  const radioPunto = 3;
  const radioPuntoActivo = 6;
  const separacionCuadricula = '3 3';

  const info: VisualizationInfo = {
    number: '03',
    category: 'Operativa',
    title: 'Incidencias por fecha',
    chartType: 'Gráfica de línea múltiple',
    source: 'Tabla asistencias, estados pendiente y rechazada',
    question: '¿En qué fechas se concentran más incidencias?',
    description:
      'Compara asistencias pendientes, rechazadas e incidencias totales a través del tiempo.',
    whyThisChart:
      'Se usa línea múltiple porque permite comparar varias series temporales en una misma gráfica.',
    accent: 'danger',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis dataKey="fecha" stroke={colorTextoEjes} />
              <YAxis stroke={colorTextoEjes} />
              <Tooltip contentStyle={styles.tooltip} />
              <Legend />

              <Line
                type="monotone"
                dataKey="pendientes"
                name="Pendientes"
                stroke={colorLineaPendientes}
                strokeWidth={grosorLinea}
                dot={{ r: radioPunto }}
                activeDot={{ r: radioPuntoActivo }}
              />

              <Line
                type="monotone"
                dataKey="rechazadas"
                name="Rechazadas"
                stroke={colorLineaRechazadas}
                strokeWidth={grosorLinea}
                dot={{ r: radioPunto }}
                activeDot={{ r: radioPuntoActivo }}
              />

              <Line
                type="monotone"
                dataKey="incidencias"
                name="Incidencias totales"
                stroke={colorLineaIncidencias}
                strokeWidth={grosorLinea}
                dot={{ r: radioPunto }}
                activeDot={{ r: radioPuntoActivo }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos de incidencias por fecha." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text={interpretacion}
        fallback="Ayuda a detectar fechas con posibles problemas de registro, validación o seguimiento."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 04: NÓMINA PROMEDIO POR EMPLEADO
   ========================================================= */

function Grafica04NominaPromedio({
  data,
  interpretacion,
  styles,
  colors,
}: {
  data: AnalyticsResponse['charts']['nominaTopEmpleados'];
  interpretacion: string;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar el color de todas las barras de nómina:
    cambia colorBarraNomina.

    Para hacer las barras más redondas:
    cambia radioBarraHorizontal.

    Para mostrar más espacio en nombres:
    cambia anchoEjeEmpleado.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorBarraNomina = colors.isDark ? '#FACC15' : '#B45309';
  const radioBarraHorizontal: [number, number, number, number] = [0, 14, 14, 0];

  const anchoEjeEmpleado = 150;
  const margenIzquierdo = 45;
  const margenDerecho = 20;
  const separacionCuadricula = '3 3';

  const info: VisualizationInfo = {
    number: '04',
    category: 'Administrativa',
    title: 'Nómina promedio por empleado',
    chartType: 'Barras horizontales',
    source: 'Tabla nominas y tabla usuarios',
    question: '¿Qué empleados tienen mayor promedio de nómina?',
    description:
      'Presenta el top de empleados con mayor promedio económico registrado.',
    whyThisChart:
      'Se usa barra horizontal porque los nombres de empleados pueden ser largos y se comparan cantidades.',
    accent: 'gold',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                left: margenIzquierdo,
                right: margenDerecho,
              }}
            >
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis type="number" stroke={colorTextoEjes} />
              <YAxis
                type="category"
                dataKey="empleado"
                stroke={colorTextoEjes}
                width={anchoEjeEmpleado}
              />
              <Tooltip
                contentStyle={styles.tooltip}
                formatter={(value: any) => formatMoney(Number(value))}
              />
              <Bar
                dataKey="promedio_nomina"
                name="Nómina promedio"
                fill={colorBarraNomina}
                radius={radioBarraHorizontal}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos de nómina." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text={interpretacion}
        fallback="Permite revisar diferencias económicas entre empleados sin saturar la vista."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 05: VACACIONES POR ESTADO
   ========================================================= */

function Grafica05VacacionesPorEstado({
  data,
  interpretacion,
  styles,
  colors,
}: {
  data: ChartItem[];
  interpretacion: string;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar la dona de APROBADA:
    cambia colorDonaAprobada.

    Para cambiar la dona de PENDIENTE:
    cambia colorDonaPendiente.

    Para cambiar la dona de RECHAZADA:
    cambia colorDonaRechazada.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;

  const colorDonaAprobada = colors.isDark ? '#2DD4BF' : '#0F9F96';
  const colorDonaPendiente = colors.isDark ? '#FACC15' : '#B45309';
  const colorDonaRechazada = colors.isDark ? '#F87171' : '#D64545';

  const radioInterno = 78;
  const radioExterno = 124;
  const separacionEntrePartes = 4;

  const coloresPorEstado: Record<string, string> = {
    aprobada: colorDonaAprobada,
    pendiente: colorDonaPendiente,
    rechazada: colorDonaRechazada,
  };

  const info: VisualizationInfo = {
    number: '05',
    category: 'Administrativa',
    title: 'Vacaciones por estado',
    chartType: 'Gráfica de dona',
    source: 'Tabla vacaciones, campo estado',
    question: '¿Cómo se distribuyen las solicitudes de vacaciones?',
    description:
      'Muestra la proporción de vacaciones aprobadas, pendientes y rechazadas.',
    whyThisChart:
      'Se usa dona porque son pocas categorías y se busca mostrar proporciones.',
    accent: 'teal',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={styles.tooltip} />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={radioInterno}
                outerRadius={radioExterno}
                paddingAngle={separacionEntrePartes}
                label={({ name, percent }: any) =>
                  `${name} ${Math.round((percent || 0) * 100)}%`
                }
              >
                {data.map((item, index) => (
                  <Cell
                    key={`vacaciones-estado-${index}`}
                    fill={coloresPorEstado[item.name] || colorDonaAprobada}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos de vacaciones por estado." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text={interpretacion}
        fallback="Ayuda a ver rápidamente si hay muchas solicitudes pendientes o rechazadas."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 06: DÍAS DE VACACIONES SOLICITADOS
   ========================================================= */

function Grafica06DiasVacaciones({
  data,
  styles,
  colors,
}: {
  data: AnalyticsResponse['charts']['vacacionesPorEmpleado'];
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar las barras moradas de días solicitados:
    cambia colorBarraDiasVacaciones.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorBarraDiasVacaciones = colors.isDark ? '#876ed2' : '#7C3AED';
  const radioBarraHorizontal: [number, number, number, number] = [0, 14, 14, 0];

  const anchoEjeEmpleado = 150;
  const margenIzquierdo = 45;
  const margenDerecho = 20;
  const separacionCuadricula = '3 3';

  const info: VisualizationInfo = {
    number: '06',
    category: 'Administrativa',
    title: 'Días de vacaciones solicitados',
    chartType: 'Barras horizontales',
    source: 'Tabla vacaciones, campo dias_solicitados',
    question: '¿Qué empleados han solicitado más días de vacaciones?',
    description:
      'Presenta los empleados con mayor cantidad de días solicitados.',
    whyThisChart:
      'Se usa barra horizontal para comparar empleados y cantidades acumuladas.',
    accent: 'purple',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                left: margenIzquierdo,
                right: margenDerecho,
              }}
            >
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis type="number" stroke={colorTextoEjes} />
              <YAxis
                type="category"
                dataKey="empleado"
                stroke={colorTextoEjes}
                width={anchoEjeEmpleado}
              />
              <Tooltip contentStyle={styles.tooltip} />
              <Bar
                dataKey="dias_solicitados"
                name="Días solicitados"
                fill={colorBarraDiasVacaciones}
                radius={radioBarraHorizontal}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos de vacaciones por empleado." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text="Esta gráfica permite detectar qué empleados concentran más días de vacaciones solicitados."
        fallback="Sirve para revisar carga administrativa y uso de descansos por empleado."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 07: CONTRATOS POR ESTADO
   ========================================================= */

function Grafica07ContratosPorEstado({
  data,
  styles,
  colors,
}: {
  data: ChartItem[];
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar barra de ACTIVO:
    cambia colorBarraActivo.

    Para cambiar barra de INACTIVO:
    cambia colorBarraInactivo.

    Para cambiar barra de FINALIZADO:
    cambia colorBarraFinalizado.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorBarraActivo = colors.isDark ? '#38BDF8' : '#0A57A4';
  const colorBarraInactivo = colors.isDark ? '#FACC15' : '#B45309';
  const colorBarraFinalizado = colors.isDark ? '#F87171' : '#D64545';

  const radioSuperiorBarras: [number, number, number, number] = [14, 14, 0, 0];
  const separacionCuadricula = '3 3';

  const coloresPorEstado: Record<string, string> = {
    activo: colorBarraActivo,
    inactivo: colorBarraInactivo,
    finalizado: colorBarraFinalizado,
  };

  const info: VisualizationInfo = {
    number: '07',
    category: 'Administrativa',
    title: 'Contratos por estado',
    chartType: 'Gráfica de barras verticales',
    source: 'Tabla contratos, campo estado',
    question: '¿Cuántos contratos están activos, inactivos o finalizados?',
    description:
      'Resume la situación contractual de los empleados considerados.',
    whyThisChart:
      'Se usa barras porque compara estados contractuales específicos.',
    accent: 'blue',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis dataKey="name" stroke={colorTextoEjes} />
              <YAxis stroke={colorTextoEjes} />
              <Tooltip contentStyle={styles.tooltip} />
              <Bar
                dataKey="value"
                name="Contratos"
                radius={radioSuperiorBarras}
              >
                {data.map((item, index) => (
                  <Cell
                    key={`contratos-${index}`}
                    fill={coloresPorEstado[item.name] || colorBarraActivo}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos de contratos por estado." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text="Esta gráfica permite revisar el estado contractual del personal considerado en el análisis."
        fallback="Permite confirmar si la mayoría del personal tiene contrato activo."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 08: ASISTENCIA VS NÓMINA
   ========================================================= */

function Grafica08AsistenciaVsNomina({
  data,
  styles,
  colors,
}: {
  data: AnalyticsResponse['charts']['asistenciaVsNomina'];
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar el color de los puntos:
    cambia colorPuntosEmpleados.

    Para cambiar los ejes:
    cambia colorTextoEjes.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorPuntosEmpleados = colors.isDark ? '#2DD4BF' : '#0F9F96';
  const separacionCuadricula = '3 3';

  const info: VisualizationInfo = {
    number: '08',
    category: 'Comparativa',
    title: 'Asistencia vs nómina',
    chartType: 'Gráfica de dispersión',
    source: 'Tablas asistencias, nominas y usuarios',
    question: '¿Existe relación visual entre tasa de asistencia y nómina promedio?',
    description:
      'Cada punto representa un empleado con su tasa de asistencia y su promedio de nómina.',
    whyThisChart:
      'Se usa dispersión porque compara dos variables numéricas al mismo tiempo.',
    accent: 'teal',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis
                type="number"
                dataKey="tasa_asistencia"
                name="Asistencia"
                stroke={colorTextoEjes}
                tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
              />
              <YAxis
                type="number"
                dataKey="nomina_promedio"
                name="Nómina"
                stroke={colorTextoEjes}
                tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip content={<ScatterTooltip colors={colors} type="nomina" />} />
              <Scatter
                data={data}
                fill={colorPuntosEmpleados}
                name="Empleados"
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos para asistencia vs nómina." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text="Cada punto representa un empleado. El eje X muestra su tasa de asistencia y el eje Y su nómina promedio."
        fallback="No prueba causalidad. Sirve para observar patrones o valores atípicos."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 09: INCIDENCIAS VS VACACIONES
   ========================================================= */

function Grafica09IncidenciasVsVacaciones({
  data,
  styles,
  colors,
}: {
  data: {
    usuario_id: number;
    empleado: string;
    incidencias: number;
    solicitudes_vacaciones: number;
    asistencias: number;
  }[];
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar el color de los puntos:
    cambia colorPuntosIncidencias.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorPuntosIncidencias = colors.isDark ? '#F87171' : '#D64545';
  const separacionCuadricula = '3 3';

  const info: VisualizationInfo = {
    number: '09',
    category: 'Comparativa',
    title: 'Incidencias vs vacaciones',
    chartType: 'Gráfica de dispersión',
    source: 'Tablas asistencias y vacaciones',
    question: '¿Los empleados con más incidencias también registran más solicitudes?',
    description:
      'Compara incidencias laborales con solicitudes de vacaciones por empleado.',
    whyThisChart:
      'Se usa dispersión porque permite observar relación entre dos variables.',
    accent: 'danger',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis
                type="number"
                dataKey="incidencias"
                name="Incidencias"
                stroke={colorTextoEjes}
              />
              <YAxis
                type="number"
                dataKey="solicitudes_vacaciones"
                name="Solicitudes"
                stroke={colorTextoEjes}
              />
              <Tooltip content={<ScatterTooltip colors={colors} type="incidencias" />} />
              <Scatter
                data={data}
                fill={colorPuntosIncidencias}
                name="Empleados"
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos para incidencias vs vacaciones." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text="Cada punto representa un empleado. El eje X muestra incidencias y el eje Y solicitudes de vacaciones."
        fallback="Sirve para detectar empleados que requieren revisión administrativa individual."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 10: DISTRIBUCIÓN POR CLÚSTER K-MEANS
   ========================================================= */

function Grafica10KMeansBarras({
  data,
  kmeans,
  styles,
  colors,
}: {
  data: {
    name: string;
    empleados: number;
    porcentaje: number;
    perfil: string;
  }[];
  kmeans: KMeansTraining | null;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar colores de cada cluster:
    cambia colorCluster1, colorCluster2, colorCluster3, etc.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;
  const colorLineasCuadricula = colors.chartGrid;
  const colorTextoEjes = colors.chartAxis;

  const colorCluster1 = colors.isDark ? '#38BDF8' : '#0A57A4';
  const colorCluster2 = colors.isDark ? '#2DD4BF' : '#0F9F96';
  const colorCluster3 = colors.isDark ? '#FACC15' : '#B45309';
  const colorCluster4 = colors.isDark ? '#A78BFA' : '#7C3AED';
  const colorCluster5 = colors.isDark ? '#F87171' : '#D64545';

  const coloresClusters = [
    colorCluster1,
    colorCluster2,
    colorCluster3,
    colorCluster4,
    colorCluster5,
  ];

  const radioSuperiorBarras: [number, number, number, number] = [14, 14, 0, 0];
  const separacionCuadricula = '3 3';

  const info: VisualizationInfo = {
    number: '10',
    category: 'Machine Learning',
    title: 'Distribución por clúster K-means',
    chartType: 'Gráfica de barras verticales',
    source: 'Endpoint /kmeans/entrenar',
    question: '¿Cuántos empleados quedaron en cada grupo generado por K-means?',
    description:
      'Presenta el número de empleados agrupados en cada clúster.',
    whyThisChart:
      'Se usa barras porque compara la cantidad de empleados por grupo.',
    accent: 'purple',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray={separacionCuadricula}
                stroke={colorLineasCuadricula}
              />
              <XAxis dataKey="name" stroke={colorTextoEjes} />
              <YAxis stroke={colorTextoEjes} />
              <Tooltip contentStyle={styles.tooltip} />
              <Bar
                dataKey="empleados"
                name="Empleados"
                radius={radioSuperiorBarras}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cluster-bar-${index}`}
                    fill={coloresClusters[index % coloresClusters.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No se pudo cargar el resultado K-means." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text={
          kmeans
            ? `K-means trabajó con K=${kmeans.mejorResultado.k}. Su índice de silueta fue ${formatNumber(
                kmeans.mejorResultado.silhouette,
                4
              )}, por lo que la calidad se interpreta como ${getSilhouetteLabel(
                kmeans.mejorResultado.silhouette
              )}.`
            : ''
        }
        fallback="Ayuda a identificar si los perfiles están equilibrados o concentrados."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   GRÁFICA 11: PORCENTAJE POR CLÚSTER
   ========================================================= */

function Grafica11KMeansDona({
  data,
  kmeans,
  styles,
  colors,
}: {
  data: {
    name: string;
    value: number;
    porcentaje: number;
  }[];
  kmeans: KMeansTraining | null;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  /*
    DISEÑO INDEPENDIENTE DE ESTA GRÁFICA

    Para cambiar colores de cada parte de la dona:
    cambia colorCluster1, colorCluster2, colorCluster3, etc.
  */
  const altoGrafica = 370;
  const colorFondoGrafica = colors.surfaceStrong;

  const colorCluster1 = colors.isDark ? '#38BDF8' : '#0A57A4';
  const colorCluster2 = colors.isDark ? '#2DD4BF' : '#0F9F96';
  const colorCluster3 = colors.isDark ? '#FACC15' : '#B45309';
  const colorCluster4 = colors.isDark ? '#A78BFA' : '#7C3AED';
  const colorCluster5 = colors.isDark ? '#F87171' : '#D64545';

  const coloresClusters = [
    colorCluster1,
    colorCluster2,
    colorCluster3,
    colorCluster4,
    colorCluster5,
  ];

  const radioInterno = 78;
  const radioExterno = 124;
  const separacionEntrePartes = 4;

  const info: VisualizationInfo = {
    number: '11',
    category: 'Machine Learning',
    title: 'Porcentaje por clúster',
    chartType: 'Gráfica de dona',
    source: 'Endpoint /kmeans/entrenar',
    question: '¿Qué proporción del personal representa cada clúster?',
    description:
      'Muestra el peso porcentual de cada grupo generado por K-means.',
    whyThisChart:
      'Se usa dona porque muestra proporción entre pocos grupos.',
    accent: 'gold',
  };

  return (
    <ChartCard info={info} styles={styles} colors={colors}>
      <div
        style={{
          ...styles.chartBox,
          height: altoGrafica,
          background: colorFondoGrafica,
        }}
      >
        {hasData(data) ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={styles.tooltip} />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={radioInterno}
                outerRadius={radioExterno}
                paddingAngle={separacionEntrePartes}
                label={({ name, percent }: any) =>
                  `${name} ${Math.round((percent || 0) * 100)}%`
                }
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cluster-donut-${index}`}
                    fill={coloresClusters[index % coloresClusters.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart styles={styles} text="No hay datos porcentuales de K-means." />
        )}
      </div>

      <ChartInterpretation
        title="Interpretación"
        text={
          kmeans
            ? getSilhouetteExplanation(kmeans.mejorResultado.silhouette)
            : ''
        }
        fallback="Permite explicar qué perfil tiene mayor presencia dentro del dataset."
        styles={styles}
      />
    </ChartCard>
  );
}

/* =========================================================
   6. COMPONENTES REUTILIZABLES
   ========================================================= */

function MiniTag({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.miniTag}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PanelMetric({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.panelMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KpiCard({
  title,
  value,
  detail,
  accent,
  styles,
  colors,
}: {
  title: string;
  value: string;
  detail: string;
  accent: Accent;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  const accentColor = getAccentColor(accent, colors);

  return (
    <article style={styles.kpiCard}>
      <span style={{ ...styles.kpiAccent, background: accentColor }} />
      <p>{title}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  styles,
}: {
  eyebrow: string;
  title: string;
  text: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div>
      <span style={styles.eyebrow}>{eyebrow}</span>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.text}>{text}</p>
    </div>
  );
}

function DashboardSection({
  category,
  title,
  text,
  styles,
}: {
  category: ChartCategory;
  title: string;
  text: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <section style={styles.sectionBanner}>
      <div>
        <span style={styles.eyebrow}>{category}</span>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <p style={styles.text}>{text}</p>
      </div>
    </section>
  );
}

function ReadingStep({
  number,
  title,
  text,
  styles,
}: {
  number: string;
  title: string;
  text: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <article style={styles.readingStep}>
      <span>{number}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function ChartCard({
  info,
  children,
  styles,
  colors,
}: {
  info: VisualizationInfo;
  children: ReactNode;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  const accentColor = getAccentColor(info.accent, colors);

  return (
    <article style={styles.card}>
      <div style={styles.chartHeader}>
        <div>
          <div style={styles.chartMetaRow}>
            <span
              style={{
                ...styles.chartNumber,
                borderColor: accentColor,
                color: accentColor,
              }}
            >
              {info.number}
            </span>

            <span style={styles.chartCategory}>{info.category}</span>
            <span style={styles.chartType}>{info.chartType}</span>
          </div>

          <h2 style={styles.sectionTitle}>{info.title}</h2>
          <p style={styles.text}>{info.description}</p>
        </div>
      </div>

      <div style={styles.chartExplanationGrid}>
        <InfoBox title="Pregunta" text={info.question} styles={styles} />
        <InfoBox title="Fuente de datos" text={info.source} styles={styles} />
        <InfoBox title="Por qué esta gráfica" text={info.whyThisChart} styles={styles} />
      </div>

      {children}
    </article>
  );
}

function InfoBox({
  title,
  text,
  styles,
}: {
  title: string;
  text: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.infoBox}>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function ChartInterpretation({
  title,
  text,
  fallback,
  styles,
}: {
  title: string;
  text?: string;
  fallback: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.interpretation}>
      <strong>{title}</strong>
      <p>{text || fallback}</p>
    </div>
  );
}

function ConclusionItem({
  title,
  text,
  fallback,
  styles,
}: {
  title: string;
  text?: string;
  fallback: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <article style={styles.conclusionItem}>
      <strong>{title}</strong>
      <p>{text || fallback}</p>
    </article>
  );
}

function EmptyChart({
  text,
  styles,
}: {
  text: string;
  styles: Record<string, CSSProperties>;
}) {
  return <div style={styles.emptyChart}>{text}</div>;
}

function ScatterTooltip({
  active,
  payload,
  colors,
  type,
}: {
  active?: boolean;
  payload?: any[];
  colors: ThemeColors;
  type: 'nomina' | 'incidencias';
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload || {};

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 12,
        color: colors.text,
        boxShadow: colors.shadow,
        maxWidth: 260,
      }}
    >
      <strong>{data.empleado || 'Empleado'}</strong>

      {type === 'nomina' ? (
        <>
          <p style={{ margin: '8px 0 0', color: colors.textMuted }}>
            Asistencia: {formatPercent(data.tasa_asistencia)}
          </p>
          <p style={{ margin: '4px 0 0', color: colors.textMuted }}>
            Nómina: {formatMoney(data.nomina_promedio)}
          </p>
          <p style={{ margin: '4px 0 0', color: colors.textMuted }}>
            Incidencias: {data.incidencias || 0}
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: '8px 0 0', color: colors.textMuted }}>
            Incidencias: {data.incidencias || 0}
          </p>
          <p style={{ margin: '4px 0 0', color: colors.textMuted }}>
            Solicitudes vacaciones: {data.solicitudes_vacaciones || 0}
          </p>
          <p style={{ margin: '4px 0 0', color: colors.textMuted }}>
            Asistencias: {data.asistencias || 0}
          </p>
        </>
      )}
    </div>
  );
}

/* =========================================================
   7. TABLA DE JUSTIFICACIÓN
   ========================================================= */

function TablaJustificacion({
  styles,
}: {
  styles: Record<string, CSSProperties>;
}) {
  const justificaciones = [
    {
      no: '01',
      categoria: 'Operativa',
      grafica: 'Asistencias por estado',
      tipo: 'Barras verticales',
      fuente: 'asistencias.estado',
      pregunta: '¿Cuántas asistencias fueron aprobadas, pendientes o rechazadas?',
      justificacion: 'Compara categorías independientes.',
    },
    {
      no: '02',
      categoria: 'Operativa',
      grafica: 'Evolución de asistencias',
      tipo: 'Área y línea',
      fuente: 'asistencias.fecha, asistencias.estado',
      pregunta: '¿Cómo cambia el registro de asistencias con el tiempo?',
      justificacion: 'Muestra tendencia temporal.',
    },
    {
      no: '03',
      categoria: 'Operativa',
      grafica: 'Incidencias por fecha',
      tipo: 'Línea múltiple',
      fuente: 'asistencias.estado',
      pregunta: '¿En qué fechas se concentran más incidencias?',
      justificacion: 'Compara varias series en el tiempo.',
    },
    {
      no: '04',
      categoria: 'Administrativa',
      grafica: 'Nómina promedio',
      tipo: 'Barras horizontales',
      fuente: 'nominas.total, usuarios.nombre',
      pregunta: '¿Qué empleados tienen mayor promedio de nómina?',
      justificacion: 'Permite leer nombres largos y comparar cantidades.',
    },
    {
      no: '05',
      categoria: 'Administrativa',
      grafica: 'Vacaciones por estado',
      tipo: 'Dona',
      fuente: 'vacaciones.estado',
      pregunta: '¿Cómo se distribuyen las solicitudes de vacaciones?',
      justificacion: 'Muestra proporción entre pocas categorías.',
    },
    {
      no: '06',
      categoria: 'Administrativa',
      grafica: 'Días de vacaciones solicitados',
      tipo: 'Barras horizontales',
      fuente: 'vacaciones.dias_solicitados',
      pregunta: '¿Qué empleados han solicitado más días?',
      justificacion: 'Compara cantidades acumuladas por empleado.',
    },
    {
      no: '07',
      categoria: 'Administrativa',
      grafica: 'Contratos por estado',
      tipo: 'Barras verticales',
      fuente: 'contratos.estado',
      pregunta: '¿Cuántos contratos están activos, inactivos o finalizados?',
      justificacion: 'Compara estados contractuales.',
    },
    {
      no: '08',
      categoria: 'Comparativa',
      grafica: 'Asistencia vs nómina',
      tipo: 'Dispersión',
      fuente: 'asistencias + nominas',
      pregunta: '¿Existe relación visual entre asistencia y nómina?',
      justificacion: 'Compara dos variables numéricas.',
    },
    {
      no: '09',
      categoria: 'Comparativa',
      grafica: 'Incidencias vs vacaciones',
      tipo: 'Dispersión',
      fuente: 'asistencias + vacaciones',
      pregunta: '¿Existe relación visual entre incidencias y vacaciones?',
      justificacion: 'Detecta patrones entre dos variables.',
    },
    {
      no: '10',
      categoria: 'Machine Learning',
      grafica: 'Distribución K-means',
      tipo: 'Barras verticales',
      fuente: '/kmeans/entrenar',
      pregunta: '¿Cuántos empleados quedaron en cada clúster?',
      justificacion: 'Compara cantidad por grupo.',
    },
    {
      no: '11',
      categoria: 'Machine Learning',
      grafica: 'Porcentaje por clúster',
      tipo: 'Dona',
      fuente: '/kmeans/entrenar',
      pregunta: '¿Qué proporción representa cada clúster?',
      justificacion: 'Muestra proporciones entre grupos.',
    },
  ];

  return (
    <section style={styles.card}>
      <SectionHeading
        eyebrow="Uso correcto de gráficas"
        title="Justificación de visualizaciones"
        text="Esta tabla sirve para defender por qué se eligió cada gráfica, qué datos usa y qué pregunta responde."
        styles={styles}
      />

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>No.</th>
              <th style={styles.th}>Categoría</th>
              <th style={styles.th}>Gráfica</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Fuente</th>
              <th style={styles.th}>Pregunta que responde</th>
              <th style={styles.th}>Justificación</th>
            </tr>
          </thead>
          <tbody>
            {justificaciones.map((item) => (
              <tr key={item.no}>
                <td style={styles.td}>{item.no}</td>
                <td style={styles.td}>{item.categoria}</td>
                <td style={styles.td}>
                  <strong>{item.grafica}</strong>
                </td>
                <td style={styles.td}>{item.tipo}</td>
                <td style={styles.td}>{item.fuente}</td>
                <td style={styles.td}>{item.pregunta}</td>
                <td style={styles.td}>{item.justificacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   8. COLORES GENERALES DEL SISTEMA
   ========================================================= */

function getColors(isDark: boolean) {
  return {
    isDark,

    background: isDark ? '#07111F' : '#F4F7FB',
    surface: isDark ? '#0F1B2D' : '#FFFFFF',
    surfaceSoft: isDark ? '#111F33' : '#F8FBFF',
    surfaceStrong: isDark ? '#07111F' : '#F1F7FC',

    primary: isDark ? '#38BDF8' : '#0A57A4',
    teal: isDark ? '#2DD4BF' : '#0F9F96',
    gold: isDark ? '#FACC15' : '#B45309',
    danger: isDark ? '#F87171' : '#D64545',
    purple: isDark ? '#A78BFA' : '#7C3AED',

    text: isDark ? '#F8FAFC' : '#0F172A',
    textSoft: isDark ? '#DDE7F3' : '#223044',
    textMuted: isDark ? '#9FB0C4' : '#5B6B81',

    border: isDark ? '#26364D' : '#D9E1EC',
    borderSoft: isDark ? '#1B2A3F' : '#E6EDF5',

    chartGrid: isDark ? '#26364D' : '#D9E1EC',
    chartAxis: isDark ? '#9FB0C4' : '#5B6B81',

    shadow: isDark
      ? '0 18px 50px rgba(0,0,0,0.25)'
      : '0 18px 50px rgba(15,23,42,0.08)',
  };
}

/* =========================================================
   9. ESTILOS GENERALES DE LA PANTALLA
   ========================================================= */

function getStyles(C: ThemeColors): Record<string, CSSProperties> {
  return {
    page: {
      minHeight: '100vh',
      padding: 28,
      color: C.text,
      background: C.isDark
        ? 'radial-gradient(circle at top right, rgba(56,189,248,0.14), transparent 35%), radial-gradient(circle at top left, rgba(45,212,191,0.10), transparent 32%), #07111F'
        : 'radial-gradient(circle at top right, rgba(10,87,164,0.12), transparent 35%), radial-gradient(circle at top left, rgba(15,159,150,0.10), transparent 32%), #F4F7FB',
    },
    hero: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.8fr)',
      gap: 22,
      marginBottom: 20,
    },
    heroCopy: {
      padding: 26,
      borderRadius: 30,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    chip: {
      display: 'inline-flex',
      padding: '8px 13px',
      borderRadius: 999,
      background: C.isDark ? 'rgba(45,212,191,0.14)' : 'rgba(15,159,150,0.12)',
      color: C.teal,
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      margin: '18px 0 10px',
      fontSize: 42,
      lineHeight: 1.05,
      fontWeight: 950,
      color: C.text,
    },
    subtitle: {
      margin: 0,
      maxWidth: 920,
      color: C.textMuted,
      lineHeight: 1.75,
      fontWeight: 700,
      fontSize: 16,
    },
    heroTags: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
      marginTop: 22,
    },
    miniTag: {
      padding: 14,
      borderRadius: 18,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    },
    heroPanel: {
      padding: 24,
      borderRadius: 30,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    },
    eyebrow: {
      color: C.teal,
      fontSize: 12,
      fontWeight: 950,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    panelTitle: {
      margin: 0,
      color: C.text,
      fontSize: 28,
      fontWeight: 950,
    },
    panelText: {
      margin: 0,
      color: C.textMuted,
      lineHeight: 1.65,
      fontWeight: 700,
    },
    panelInfoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 10,
    },
    panelMetric: {
      padding: 14,
      borderRadius: 18,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
    },
    primaryButton: {
      border: 0,
      borderRadius: 16,
      padding: '14px 18px',
      background: C.teal,
      color: C.isDark ? '#03111A' : '#FFFFFF',
      fontWeight: 950,
      cursor: 'pointer',
    },
    errorBox: {
      padding: 16,
      borderRadius: 18,
      background: C.isDark ? 'rgba(248,113,113,0.14)' : 'rgba(214,69,69,0.12)',
      border: `1px solid ${C.danger}`,
      color: C.danger,
      marginBottom: 18,
      fontWeight: 900,
    },
    loadingBox: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 18,
      background: C.isDark ? 'rgba(56,189,248,0.14)' : 'rgba(10,87,164,0.10)',
      border: `1px solid ${C.border}`,
      color: C.primary,
      marginBottom: 18,
      fontWeight: 900,
    },
    loadingDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      background: C.primary,
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
      gap: 16,
      marginBottom: 18,
    },
    kpiCard: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 20,
      borderRadius: 24,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    kpiAccent: {
      width: 42,
      height: 6,
      borderRadius: 999,
      marginBottom: 6,
    },
    explainCard: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      marginBottom: 18,
    },
    readingGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 12,
      marginTop: 16,
    },
    readingStep: {
      padding: 16,
      borderRadius: 20,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
    },
    sectionBanner: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      marginBottom: 18,
    },
    gridTwo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 18,
      marginBottom: 18,
    },
    gridOne: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 18,
      marginBottom: 18,
    },
    card: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      marginBottom: 18,
    },
    chartHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'flex-start',
    },
    chartMetaRow: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    chartNumber: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 14,
      border: '1px solid',
      fontWeight: 950,
      fontSize: 13,
    },
    chartCategory: {
      padding: '7px 10px',
      borderRadius: 999,
      background: C.isDark ? 'rgba(56,189,248,0.12)' : 'rgba(10,87,164,0.08)',
      color: C.primary,
      fontWeight: 900,
      fontSize: 12,
    },
    chartType: {
      padding: '7px 10px',
      borderRadius: 999,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      color: C.textMuted,
      fontWeight: 900,
      fontSize: 12,
    },
    sectionTitle: {
      margin: '8px 0',
      fontSize: 24,
      fontWeight: 950,
      color: C.text,
    },
    text: {
      margin: 0,
      color: C.textMuted,
      lineHeight: 1.65,
      fontWeight: 700,
    },
    chartExplanationGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 10,
      marginTop: 16,
    },
    infoBox: {
      padding: 13,
      borderRadius: 17,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      color: C.textSoft,
      lineHeight: 1.45,
    },
    chartBox: {
      marginTop: 16,
      padding: 12,
      borderRadius: 22,
      background: C.surfaceStrong,
      border: `1px solid ${C.border}`,
    },
    tooltip: {
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      color: C.text,
      boxShadow: C.shadow,
    },
    interpretation: {
      marginTop: 14,
      padding: 14,
      borderRadius: 18,
      background: C.isDark ? 'rgba(56,189,248,0.12)' : 'rgba(10,87,164,0.08)',
      border: `1px solid ${C.border}`,
      color: C.textSoft,
      lineHeight: 1.6,
      fontWeight: 700,
    },
    emptyChart: {
      height: '100%',
      minHeight: 280,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: C.textMuted,
      fontWeight: 900,
      textAlign: 'center',
    },
    tableWrapper: {
      width: '100%',
      overflowX: 'auto',
      marginTop: 16,
      borderRadius: 18,
      border: `1px solid ${C.border}`,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: 1100,
      background: C.surface,
    },
    th: {
      padding: '13px 14px',
      textAlign: 'left',
      color: C.primary,
      borderBottom: `1px solid ${C.border}`,
      background: C.surfaceSoft,
      fontSize: 13,
      fontWeight: 950,
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '13px 14px',
      color: C.textSoft,
      borderBottom: `1px solid ${C.borderSoft}`,
      fontSize: 13,
      fontWeight: 700,
      verticalAlign: 'top',
    },
    conclusionCard: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      marginBottom: 18,
    },
    conclusionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      gap: 14,
      marginTop: 16,
    },
    conclusionItem: {
      padding: 16,
      borderRadius: 20,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      color: C.textSoft,
      lineHeight: 1.55,
    },
  };
}