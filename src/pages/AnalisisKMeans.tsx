import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../app/auth/AuthContext';
import { api } from '../services/api';

// Tipos base usados por este componente para representar los datos del dataset,
// los resultados del método del codo y los clusters generados por K-means.
type ThemeMode = 'dark' | 'light';

type DatasetRow = Record<string, any>;

type ElbowItem = {
  k: number;
  inertia: number;
  silhouette: number;
  iterations: number;
};

type Cluster = {
  cluster: number;
  total: number;
  porcentaje: number;
  perfil: string;
  promedio: Record<string, number>;
  empleados: {
    usuario_id: number;
    nombre: string;
    apellido: string;
    correo: string;
    role: string;
    datos: Record<string, any>;
  }[];
};

type Entrenamiento = {
  total: number;
  features: string[];
  featureLabels: Record<string, string>;
  parametros: {
    k: number;
    trials: number;
    maxIterations: number;
  };
  mejorResultado: {
    k: number;
    inertia: number;
    silhouette: number;
    iterations: number;
    clusters: Cluster[];
  };
  intentos: {
    intento: number;
    k: number;
    inertia: number;
    silhouette: number;
    iterations: number;
  }[];
};

type ThemeColors = ReturnType<typeof getColors>;

type QualityInfo = {
  label: string;
  description: string;
  recommendation: string;
  tone: 'excellent' | 'good' | 'moderate' | 'low' | 'pending';
};

type StepStatus = 'done' | 'active' | 'pending';

// Determina el tema visual del portal usando el DOM, el almacenamiento local y
// la preferencia del sistema operativo, para que la vista se adapte al tema activo.
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

function toNumber(value?: number | string | null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function formatNumber(value?: number | null, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';

  return number.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatMoney(value?: number | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '$0';

  return number.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });
}

function formatPercentFromRate(value?: number | null) {
  return `${Math.round(toNumber(value) * 100)}%`;
}

// Evalúa la calidad del resultado de silueta para traducir un valor numérico
// en una explicación de negocio comprensible: excelente, bueno, moderado o bajo.
function getSilhouetteQuality(value?: number | null): QualityInfo {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return {
      label: 'Pendiente',
      description: 'Aún no se han formado los grupos de personal.',
      recommendation:
        'Revisa la cantidad sugerida de grupos y después selecciona “Actualizar grupos”.',
      tone: 'pending',
    };
  }

  const score = Number(value);

  if (score >= 0.7) {
    return {
      label: 'Muy bueno',
      description:
        'Los grupos muestran diferencias claras entre las personas incluidas.',
      recommendation:
        'El resultado es confiable para explicar perfiles laborales y tomar decisiones de seguimiento.',
      tone: 'excellent',
    };
  }

  if (score >= 0.5) {
    return {
      label: 'Bueno',
      description:
        'Existe una separación útil entre grupos. El análisis puede apoyar decisiones operativas.',
      recommendation:
        'Puedes usar estos grupos como referencia para identificar empleados estables, intermedios o de seguimiento.',
      tone: 'good',
    };
  }

  if (score >= 0.25) {
    return {
      label: 'Moderado',
      description:
        'Hay separación parcial entre grupos. Algunos empleados pueden compartir comportamientos similares.',
      recommendation:
        'El resultado sirve como orientación, pero conviene revisar los empleados individualmente antes de tomar decisiones.',
      tone: 'moderate',
    };
  }

  return {
    label: 'Bajo',
    description:
      'Los grupos no están claramente separados. Puede faltar variación o cantidad de datos.',
    recommendation:
      'Agrega más registros históricos de asistencia, nómina, vacaciones y contratos antes de interpretar el resultado como definitivo.',
    tone: 'low',
  };
}

function getParameterExplanation(k: number, trials: number, maxIterations: number, mejorK: number) {
  const kMessage =
    k === mejorK
      ? `Elegiste ${k} grupos, la cantidad recomendada para esta información.`
      : `Elegiste ${k} grupos; el sistema recomienda ${mejorK} para distinguir mejor los perfiles.`;

  const trialsMessage =
    trials < 5
      ? 'Pocas comparaciones pueden dejar fuera una mejor distribución.'
      : trials <= 15
        ? 'Cantidad adecuada para comparar distintas formas de organizar los grupos.'
        : 'Cantidad alta: puede encontrar otra distribución, pero tardará más.';

  const iterationsMessage =
    maxIterations < 50
      ? 'Pocas pasadas pueden terminar la comparación antes de ordenar bien los grupos.'
      : maxIterations <= 150
        ? 'Cantidad adecuada para ordenar los grupos sin tardar demasiado.'
        : 'Cantidad alta: puede ayudar con más información, pero tardará más.';

  return {
    kMessage,
    trialsMessage,
    iterationsMessage,
  };
}

function getRecommendedSettings(datasetLength: number) {
  if (datasetLength < 10) {
    return {
      k: 2,
      trials: 10,
      maxIterations: 100,
      reason:
        'Con pocos empleados conviene iniciar con 2 grupos para evitar divisiones forzadas o poco reales.',
    };
  }

  if (datasetLength < 30) {
    return {
      k: 3,
      trials: 10,
      maxIterations: 100,
      reason:
        'Con esta cantidad de personas, 3 grupos permite distinguir perfiles estables, intermedios y de seguimiento.',
    };
  }

  return {
    k: 4,
    trials: 15,
    maxIterations: 150,
    reason:
      'Con más empleados se pueden probar más perfiles sin perder demasiada claridad en la interpretación.',
  };
}

function getElbowInsight(elbow: ElbowItem[], mejorK: number) {
  if (!elbow.length) {
    return {
      title: 'Cantidad sugerida pendiente',
      text: 'Aún no se ha comparado cuántos grupos conviene formar. Selecciona “Revisar cantidad sugerida”.',
      easyConclusion:
        'Todavía no sabemos cuántos grupos conviene usar.',
    };
  }

  const selected = elbow.find((item) => item.k === mejorK);
  const bestSilhouette = selected ? formatNumber(selected.silhouette, 4) : 'N/D';

  return {
    title: `${mejorK} grupos recomendados`,
    text: `El sistema comparó varias opciones y encontró que ${mejorK} grupos ofrecen una separación clara (${bestSilhouette}).`,
    easyConclusion: `Para esta información, lo más razonable es organizar al personal en ${mejorK} grupos.`,
  };
}

function getClusterName(cluster: Cluster) {
  const aprobacion = toNumber(cluster.promedio.tasa_aprobacion_asistencia);
  const salida = toNumber(cluster.promedio.tasa_salida_asistencia);
  const pendientes = toNumber(cluster.promedio.asistencias_pendientes);
  const rechazadas = toNumber(cluster.promedio.asistencias_rechazadas);
  const nomina = toNumber(cluster.promedio.promedio_nomina);
  const vacaciones = toNumber(cluster.promedio.solicitudes_vacaciones);

  if (aprobacion >= 0.8 && salida >= 0.75 && pendientes <= 1 && rechazadas <= 1) {
    return 'Perfil estable';
  }

  if (aprobacion < 0.45 || pendientes >= 2 || rechazadas >= 1.5) {
    return 'Perfil de seguimiento';
  }

  if (nomina > 0 && vacaciones >= 2) {
    return 'Perfil activo';
  }

  return 'Perfil intermedio';
}

function getClusterRecommendation(cluster: Cluster) {
  const name = getClusterName(cluster);

  if (name === 'Perfil estable') {
    return 'Mantener seguimiento normal. Este grupo muestra buen cumplimiento y puede servir como referencia operativa.';
  }

  if (name === 'Perfil de seguimiento') {
    return 'Revisar registros incompletos, rechazos y pendientes. Este grupo puede requerir seguimiento de Recursos Humanos.';
  }

  if (name === 'Perfil activo') {
    return 'Monitorear carga operativa, vacaciones y comportamiento de nómina para planear recursos.';
  }

  return 'Revisar caso por caso. El grupo tiene comportamiento mixto y no debe interpretarse como riesgo automático.';
}

// Convierte los resultados del modelo en una conclusión ejecutiva fácil de leer,
// útil para presentar al usuario final o a un área de RR. HH.
function getBusinessConclusion(params: {
  training: Entrenamiento | null;
  mejorK: number;
  datasetLength: number;
}) {
  const { training, mejorK, datasetLength } = params;

  if (!training) {
    return {
      title: 'Conclusión pendiente',
      text:
        datasetLength < 2
          ? 'Se necesitan al menos dos personas para formar grupos.'
          : 'Todavía no se han formado los grupos. Actualízalos para ver una conclusión.',
      action: 'Selecciona “Actualizar grupos” cuando la información esté disponible.',
    };
  }

  const quality = getSilhouetteQuality(training.mejorResultado.silhouette);
  const clusters = training.mejorResultado.clusters || [];
  const stable = clusters.filter((cluster) => getClusterName(cluster) === 'Perfil estable');
  const risk = clusters.filter((cluster) => getClusterName(cluster) === 'Perfil de seguimiento');
  const intermediate = clusters.filter((cluster) => getClusterName(cluster) === 'Perfil intermedio');
  const active = clusters.filter((cluster) => getClusterName(cluster) === 'Perfil activo');

  const stableTotal = stable.reduce((sum, cluster) => sum + cluster.total, 0);
  const riskTotal = risk.reduce((sum, cluster) => sum + cluster.total, 0);
  const intermediateTotal = intermediate.reduce((sum, cluster) => sum + cluster.total, 0);
  const activeTotal = active.reduce((sum, cluster) => sum + cluster.total, 0);

  let text = `El sistema organizó ${datasetLength} personas en ${mejorK} grupos. `;

  if (quality.tone === 'excellent' || quality.tone === 'good') {
    text += 'La separación entre grupos es útil para interpretar perfiles laborales. ';
  } else if (quality.tone === 'moderate') {
    text += 'La separación es moderada, por lo que el resultado sirve como apoyo, no como decisión automática. ';
  } else {
    text += 'La separación es baja, por lo que se recomienda agregar más datos antes de usar el resultado como referencia fuerte. ';
  }

  text += `Se identificaron ${stableTotal} empleados en perfiles estables, ${activeTotal} en perfiles activos, ${intermediateTotal} en perfiles intermedios y ${riskTotal} en perfiles de seguimiento.`;

  const action =
    riskTotal > 0
      ? 'Revisa primero los perfiles de seguimiento y confirma sus asistencias, salidas y solicitudes pendientes.'
      : 'No se detecta un grupo que requiera atención inmediata; mantén la revisión habitual.';

  return {
    title: `Conclusión general: ${quality.label}`,
    text,
    action,
  };
}

function getDatasetSummary(dataset: DatasetRow[]) {
  const total = dataset.length;

  const promedioAprobacion = average(
    dataset.map((row) => toNumber(row.tasa_aprobacion_asistencia))
  );

  const promedioSalida = average(
    dataset.map((row) => toNumber(row.tasa_salida_asistencia))
  );

  const promedioNomina = average(
    dataset.map((row) => toNumber(row.promedio_nomina || row.salario_estimado))
  );

  const totalAsistencias = dataset.reduce(
    (sum, row) => sum + toNumber(row.total_asistencias),
    0
  );

  const totalPendientes = dataset.reduce(
    (sum, row) => sum + toNumber(row.asistencias_pendientes),
    0
  );

  const totalRechazadas = dataset.reduce(
    (sum, row) => sum + toNumber(row.asistencias_rechazadas),
    0
  );

  const contratosActivos = dataset.reduce(
    (sum, row) => sum + toNumber(row.contratos_activos),
    0
  );

  const solicitudesVacaciones = dataset.reduce(
    (sum, row) => sum + toNumber(row.solicitudes_vacaciones),
    0
  );

  return {
    total,
    promedioAprobacion,
    promedioSalida,
    promedioNomina,
    totalAsistencias,
    totalPendientes,
    totalRechazadas,
    contratosActivos,
    solicitudesVacaciones,
  };
}

function getStepStatus(params: {
  datasetLength: number;
  elbowLength: number;
  hasTraining: boolean;
}): StepStatus[] {
  const { datasetLength, elbowLength, hasTraining } = params;

  return [
    datasetLength > 0 ? 'done' : 'active',
    elbowLength > 0 ? 'done' : datasetLength > 0 ? 'active' : 'pending',
    hasTraining ? 'done' : elbowLength > 0 ? 'active' : 'pending',
    hasTraining ? 'done' : 'pending',
  ];
}

// Componente principal del análisis K-means.
// Carga datos del backend, calcula el método del codo, entrena el modelo,
// muestra métricas, gráficas y una interpretación de los grupos encontrados.
export default function AnalisisKMeans() {
  const authContext = useAuth() as any;
  const themeMode = usePortalTheme(authContext?.theme);
  const isDark = themeMode === 'dark';

  const colors = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [featureLabels, setFeatureLabels] = useState<Record<string, string>>({});
  const [elbow, setElbow] = useState<ElbowItem[]>([]);
  const [mejorK, setMejorK] = useState<number>(3);
  const [k, setK] = useState<number>(3);
  const [trials, setTrials] = useState<number>(10);
  const [maxIterations, setMaxIterations] = useState<number>(100);
  const [training, setTraining] = useState<Entrenamiento | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    'dataset' | 'elbow' | 'training' | 'initial' | ''
  >('');
  const [error, setError] = useState('');

  const maxKPermitido = useMemo(() => {
    if (dataset.length < 2) return 2;
    return Math.min(8, dataset.length);
  }, [dataset.length]);

  const recommendedSettings = useMemo(
    () => getRecommendedSettings(dataset.length),
    [dataset.length]
  );

  const parameterExplanation = useMemo(
    () => getParameterExplanation(k, trials, maxIterations, mejorK),
    [k, trials, maxIterations, mejorK]
  );

  const datasetSummary = useMemo(() => getDatasetSummary(dataset), [dataset]);

  const clustersChart = useMemo(() => {
    if (!training?.mejorResultado?.clusters) return [];

    return training.mejorResultado.clusters.map((cluster) => ({
      name: `Grupo ${cluster.cluster + 1}`,
      empleados: cluster.total,
      porcentaje: cluster.porcentaje,
    }));
  }, [training]);

  const trainedResult = training?.mejorResultado || null;

  const silhouetteQuality = useMemo(
    () => getSilhouetteQuality(trainedResult?.silhouette),
    [trainedResult?.silhouette]
  );

  const elbowInsight = useMemo(
    () => getElbowInsight(elbow, mejorK),
    [elbow, mejorK]
  );

  const businessConclusion = useMemo(
    () =>
      getBusinessConclusion({
        training,
        mejorK,
        datasetLength: dataset.length,
      }),
    [training, mejorK, dataset.length]
  );

  const stepStatuses = useMemo(
    () =>
      getStepStatus({
        datasetLength: dataset.length,
        elbowLength: elbow.length,
        hasTraining: Boolean(training),
      }),
    [dataset.length, elbow.length, training]
  );

  const dominantCluster = useMemo(() => {
    if (!training?.mejorResultado?.clusters?.length) return null;

    return [...training.mejorResultado.clusters].sort(
      (a, b) => b.total - a.total
    )[0];
  }, [training]);

  async function cargarDataset() {
    const { data } = await api.get('/kmeans/dataset');

    const rows = data.dataset || [];
    const labels = data.featureLabels || {};

    setDataset(rows);
    setFeatureLabels(labels);

    return rows as DatasetRow[];
  }

  async function calcularCodo(kMaxValue?: number) {
    const calculatedKMax = Math.max(2, Math.min(8, kMaxValue || maxKPermitido));

    const { data } = await api.get('/kmeans/elbow', {
      params: {
        kMin: 2,
        kMax: calculatedKMax,
        trials: 5,
        maxIterations,
      },
    });

    const resultados = data.resultados || [];
    const mejor = data.mejor_k_silueta || 3;

    setElbow(resultados);
    setMejorK(mejor);
    setK(mejor);

    return resultados as ElbowItem[];
  }

  async function recalcularAnalisis() {
    try {
      setLoading(true);
      setLoadingAction('elbow');
      setError('');

      const rows = await cargarDataset();

      if (rows.length < 2) {
        setElbow([]);
        setTraining(null);
        setError(
          'Se necesitan al menos 2 personas para comparar y formar grupos.'
        );
        return;
      }

      await calcularCodo(Math.min(8, rows.length));
      setTraining(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo calcular la cantidad sugerida de grupos. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
      setLoadingAction('');
    }
  }

  async function entrenar() {
    try {
      setLoading(true);
      setLoadingAction('training');
      setError('');

      if (dataset.length < 2) {
        setError(
          'Se necesitan al menos 2 personas para formar grupos.'
        );
        return;
      }

      const safeK = Math.min(
        Math.max(2, Number(k) || 2),
        Math.max(2, dataset.length)
      );

      const { data } = await api.post('/kmeans/entrenar', {
        k: safeK,
        trials,
        maxIterations,
      });

      setTraining(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudieron actualizar los grupos. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
      setLoadingAction('');
    }
  }

  async function cargarInicial() {
    try {
      setLoading(true);
      setLoadingAction('initial');
      setError('');

      const rows = await cargarDataset();

      if (rows.length >= 2) {
        await calcularCodo(Math.min(8, rows.length));
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo cargar la información para formar los grupos.'
      );
    } finally {
      setLoading(false);
      setLoadingAction('');
    }
  }

  function aplicarConfiguracionRecomendada() {
    setK(mejorK || recommendedSettings.k);
    setTrials(recommendedSettings.trials);
    setMaxIterations(recommendedSettings.maxIterations);
  }

  useEffect(() => {
    cargarInicial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadingLabel =
    loadingAction === 'training'
      ? 'Actualizando grupos...'
      : loadingAction === 'elbow'
        ? 'Buscando la cantidad recomendada...'
        : loadingAction === 'initial'
          ? 'Cargando información...'
          : 'Procesando...';

  return (
    <div style={styles.page}>
      {/* Encabezado principal: presenta el objetivo del módulo y una conclusión ejecutiva inicial. */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <span style={styles.chip}>Comparación de perfiles</span>
          <h1 style={styles.title}>Grupos de personal con características similares</h1>
          <p style={styles.subtitle}>
            Compara asistencia, vacaciones, contratos y pagos para reunir personas
            con características parecidas. Úsalo para saber qué grupos mantener bajo
            revisión, sin tomar decisiones automáticas sobre ningún empleado.
          </p>

          <div style={styles.heroMetaGrid}>
            <InfoPill
              label="Qué hace"
              value="Forma grupos"
              detail="Compara información laboral"
              styles={styles}
            />
            <InfoPill
              label="Cómo los separa"
              value="Por similitud"
              detail="Busca comportamientos parecidos"
              styles={styles}
            />
            <InfoPill
              label="Qué debes hacer"
              value="Revisar cada caso"
              detail="Confirma antes de decidir"
              styles={styles}
            />
          </div>
        </div>

        <aside style={styles.heroPanel}>
          <span style={styles.panelEyebrow}>Conclusión ejecutiva</span>
          <h2 style={styles.panelTitle}>{businessConclusion.title}</h2>
          <p style={styles.panelText}>{businessConclusion.text}</p>

          <div style={styles.qualityBox}>
            <span style={styles.qualityLabel}>Acción sugerida</span>
          </div>

          <div
            style={{
              ...styles.qualityBadge,
              ...getQualityStyle(silhouetteQuality.tone, colors),
            }}
          >
            {businessConclusion.action}
          </div>
        </aside>
      </section>

      {/* Mensajes de estado global: errores y carga. */}
      {error ? <div style={styles.errorBox}>{error}</div> : null}

      {loading ? (
        <div style={styles.loadingBox}>
          <span style={styles.loadingDot} />
          {loadingLabel}
        </div>
      ) : null}

      <section style={styles.workflowCard}>
        <div style={styles.sectionHeadingCompact}>
          <div>
            <span style={styles.eyebrow}>Opciones del análisis</span>
            <h2 style={styles.sectionTitle}>Configuración recomendada</h2>
          </div>
          <p style={styles.sectionHint}>
            Puedes usar estos valores sugeridos o ajustarlos antes de formar los grupos.
          </p>
        </div>

        <div style={styles.parameterGuideGrid}>
          <GuideCard
            title="Cantidad de grupos"
            value={`${mejorK || recommendedSettings.k} grupos`}
            text="Indica en cuántos grupos quieres organizar al personal. Se necesitan al menos dos para poder comparar perfiles."
            note={parameterExplanation.kMessage}
            styles={styles}
          />

          <GuideCard
            title="Comparaciones"
            value={`${recommendedSettings.trials} recomendado`}
            text="El sistema prueba distintas formas de organizar a las personas y conserva la que muestra diferencias más claras."
            note={parameterExplanation.trialsMessage}
            styles={styles}
          />

          <GuideCard
            title="Pasadas de revisión"
            value={`${recommendedSettings.maxIterations} recomendado`}
            text="Indica cuántas veces puede ajustar la distribución. Normalmente 100 es suficiente."
            note={parameterExplanation.iterationsMessage}
            styles={styles}
          />

          <GuideCard
            title="Configuración sugerida"
            value={`${mejorK || recommendedSettings.k} grupos`}
            text={recommendedSettings.reason}
            note={`${recommendedSettings.trials} comparaciones y ${recommendedSettings.maxIterations} pasadas`}
            styles={styles}
          />
        </div>

        <div style={styles.guideActions}>
          <button style={styles.secondaryButton} onClick={aplicarConfiguracionRecomendada}>
            Aplicar configuración recomendada
          </button>
        </div>
      </section>

      {/* Explica al usuario cómo funciona el proceso de análisis paso a paso. */}
      <section style={styles.workflowCard}>
        <div style={styles.sectionHeadingCompact}>
          <div>
            <span style={styles.eyebrow}>Cómo funciona</span>
            <h2 style={styles.sectionTitle}>De la información a la revisión</h2>
          </div>
          <p style={styles.sectionHint}>
            Estas son las etapas que sigue el sistema antes de mostrar los grupos.
          </p>
        </div>

        <div style={styles.stepGrid}>
          <StepCard
            number="01"
            title="Información reunida"
            text="Reúne datos de personal, asistencia, pagos, contratos y vacaciones."
            status={stepStatuses[0]}
            styles={styles}
            colors={colors}
          />
          <StepCard
            number="02"
            title="Cantidad sugerida"
            text="Compara varias opciones para saber cuántos grupos conviene formar."
            status={stepStatuses[1]}
            styles={styles}
            colors={colors}
          />
          <StepCard
            number="03"
            title="Formación de grupos"
            text="Prueba distintas distribuciones y conserva la más clara."
            status={stepStatuses[2]}
            styles={styles}
            colors={colors}
          />
          <StepCard
            number="04"
            title="Revisión final"
            text="Explica cada grupo y señala qué casos conviene revisar primero."
            status={stepStatuses[3]}
            styles={styles}
            colors={colors}
          />
        </div>
      </section>

      {/* KPIs y métricas principales para ver en una sola lectura. */}
      <section style={styles.kpiGrid}>
        <MetricCard
          title="Personas incluidas"
          value={String(datasetSummary.total)}
          detail="Personas consideradas en la comparación"
          accent="blue"
          styles={styles}
          colors={colors}
        />
        <MetricCard
          title="Grupos recomendados"
          value={String(mejorK)}
          detail="Cantidad sugerida de grupos"
          accent="teal"
          styles={styles}
          colors={colors}
        />
        <MetricCard
          title="Claridad de los grupos"
          value={trainedResult ? formatNumber(trainedResult.silhouette, 4) : 'Pendiente'}
          detail={silhouetteQuality.label}
          accent={silhouetteQuality.tone === 'low' ? 'danger' : 'gold'}
          styles={styles}
          colors={colors}
        />
        <MetricCard
          title="Cercanía dentro de cada grupo"
          value={trainedResult ? formatNumber(trainedResult.inertia, 4) : 'Pendiente'}
          detail="Qué tan parecidas son las personas reunidas"
          accent="blue"
          styles={styles}
          colors={colors}
        />
      </section>

      {/* Panel de configuración y acciones del modelo. */}
      <section style={styles.dashboardGrid}>
        <article style={styles.cardLarge}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.eyebrow}>Opciones avanzadas</span>
              <h2 style={styles.sectionTitle}>Formar grupos de personal</h2>
              <p style={styles.text}>
                Ajusta cuántos grupos quieres comparar y cuánto debe revisar el sistema.
                Si no necesitas personalizarlo, usa la configuración recomendada.
              </p>
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={styles.secondaryButton}
                onClick={recalcularAnalisis}
                disabled={loading}
              >
                Revisar cantidad sugerida
              </button>

              <button style={styles.primaryButton} onClick={entrenar} disabled={loading}>
                Actualizar grupos
              </button>
            </div>
          </div>

          <div style={styles.controls}>
            <label style={styles.label}>
              <span>Cantidad de grupos</span>
              <input
                style={styles.input}
                type="number"
                min={2}
                max={Math.max(2, dataset.length)}
                value={k}
                onChange={(event) => setK(Number(event.target.value))}
              />
              <small style={styles.inputHelp}>
                Dos grupos ofrecen una comparación básica. Tres suelen distinguir
                perfiles estables, intermedios y de seguimiento.
              </small>
            </label>

            <label style={styles.label}>
              <span>Comparaciones</span>
              <input
                style={styles.input}
                type="number"
                min={1}
                max={50}
                value={trials}
                onChange={(event) => setTrials(Number(event.target.value))}
              />
              <small style={styles.inputHelp}>
                Diez suele ser suficiente. Más comparaciones pueden mejorar la
                distribución, pero tardarán más.
              </small>
            </label>

            <label style={styles.label}>
              <span>Pasadas de revisión</span>
              <input
                style={styles.input}
                type="number"
                min={10}
                max={500}
                value={maxIterations}
                onChange={(event) => setMaxIterations(Number(event.target.value))}
              />
              <small style={styles.inputHelp}>
                Cien suele ser suficiente. Aumenta este valor solo si hay muchas
                personas y el resultado todavía cambia.
              </small>
            </label>
          </div>
        </article>

        <aside style={styles.cardSide}>
          <span style={styles.eyebrow}>¿Para qué sirve?</span>
          <h2 style={styles.sectionTitle}>Uso del resultado</h2>
          <p style={styles.text}>
            El resultado no reemplaza una decisión de Recursos Humanos. Sirve
            como apoyo para detectar patrones y priorizar revisiones.
          </p>

          <div style={styles.analysisList}>
            <AnalysisItem
              title="Detectar empleados estables"
              text="Identifica grupos con buena asistencia, pocos pendientes y salidas completas."
              styles={styles}
            />
            <AnalysisItem
              title="Ubicar casos de seguimiento"
              text="Ayuda a encontrar empleados con pendientes, rechazos o registros incompletos."
              styles={styles}
            />
            <AnalysisItem
              title="Planear recursos"
              text="Relaciona vacaciones, contratos y pagos con la actividad diaria."
              styles={styles}
            />
            <AnalysisItem
              title="Tomar decisiones informadas"
              text="Resume qué grupos conviene revisar y por qué."
              styles={styles}
            />
          </div>
        </aside>
      </section>

      {/* Resumen del dataset con métricas de negocio. */}
      <section style={styles.summaryGrid}>
        <SummaryCard
          title="Promedio de asistencia aprobada"
          value={formatPercentFromRate(datasetSummary.promedioAprobacion)}
          detail="Tasa promedio de registros aprobados"
          styles={styles}
        />
        <SummaryCard
          title="Salidas registradas"
          value={formatPercentFromRate(datasetSummary.promedioSalida)}
          detail="Promedio de jornadas con salida capturada"
          styles={styles}
        />
        <SummaryCard
          title="Nómina promedio"
          value={formatMoney(datasetSummary.promedioNomina)}
          detail="Promedio económico considerado por empleado"
          styles={styles}
        />
        <SummaryCard
          title="Casos por revisar"
          value={String(datasetSummary.totalPendientes + datasetSummary.totalRechazadas)}
          detail="Pendientes y rechazadas acumuladas"
          styles={styles}
        />
      </section>

      {/* Gráficos que resumen la cantidad y claridad de los grupos. */}
      <section style={styles.gridTwo}>
        <article style={styles.card}>
          <div style={styles.chartHeader}>
            <div>
              <span style={styles.eyebrow}>Cantidad recomendada</span>
              <h2 style={styles.sectionTitle}>¿Cuántos grupos conviene usar?</h2>
            </div>
            <span style={styles.chartBadge}>{mejorK} grupos</span>
          </div>

          <p style={styles.text}>
            La gráfica compara varias cantidades de grupos. Busca una opción que
            reúna a personas parecidas sin crear divisiones innecesarias.
          </p>

          <div style={styles.chartBox}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={elbow}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
                <XAxis dataKey="k" stroke={colors.chartAxis} />
                <YAxis stroke={colors.chartAxis} />
                <Tooltip
                  contentStyle={styles.tooltip}
                  labelStyle={styles.tooltipLabel}
                  itemStyle={styles.tooltipItem}
                />
                <Line
                  type="monotone"
                  dataKey="inertia"
                  stroke={colors.primary}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article style={styles.card}>
          <div style={styles.chartHeader}>
            <div>
              <span style={styles.eyebrow}>Claridad de los grupos</span>
              <h2 style={styles.sectionTitle}>¿Qué tan diferentes son?</h2>
            </div>
            <span
              style={{
                ...styles.chartBadge,
                ...getQualityStyle(silhouetteQuality.tone, colors),
              }}
            >
              {silhouetteQuality.label}
            </span>
          </div>

          <p style={styles.text}>
            Un valor cercano a 1 indica que las personas de cada grupo se parecen
            entre sí y se distinguen de los demás. Un valor bajo indica que los
            grupos todavía comparten muchas características.
          </p>

          <div style={styles.chartBox}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={elbow}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
                <XAxis dataKey="k" stroke={colors.chartAxis} />
                <YAxis stroke={colors.chartAxis} domain={[-1, 1]} />
                <Tooltip
                  contentStyle={styles.tooltip}
                  labelStyle={styles.tooltipLabel}
                  itemStyle={styles.tooltipItem}
                />
                <Line
                  type="monotone"
                  dataKey="silhouette"
                  stroke={colors.teal}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* Interpretación simple del resultado para el usuario final. */}
      <section style={styles.insightGrid}>
        <article style={styles.insightCard}>
          <span style={styles.eyebrow}>Cantidad sugerida</span>
          <h2 style={styles.sectionTitle}>{elbowInsight.title}</h2>
          <p style={styles.text}>{elbowInsight.text}</p>
          <div style={styles.simpleConclusion}>{elbowInsight.easyConclusion}</div>
        </article>

        <article style={styles.insightCard}>
          <span style={styles.eyebrow}>Lectura del resultado</span>
          <h2 style={styles.sectionTitle}>{silhouetteQuality.label}</h2>
          <p style={styles.text}>{silhouetteQuality.recommendation}</p>
          <div style={styles.simpleConclusion}>
            {trainedResult
              ? `Claridad obtenida: ${formatNumber(trainedResult.silhouette, 4)}.`
              : 'Actualiza los grupos para generar esta conclusión.'}
          </div>
        </article>

        <article style={styles.insightCard}>
          <span style={styles.eyebrow}>Grupo dominante</span>
          <h2 style={styles.sectionTitle}>
            {dominantCluster
              ? `Grupo ${dominantCluster.cluster + 1}`
              : 'Pendiente'}
          </h2>
          <p style={styles.text}>
            {dominantCluster
              ? `Este grupo concentra ${dominantCluster.total} empleados (${formatNumber(
                  dominantCluster.porcentaje,
                  2
                )}%). Perfil detectado: ${getClusterName(dominantCluster)}.`
              : 'Actualiza los grupos para saber cuál reúne a más personas.'}
          </p>
          <div style={styles.simpleConclusion}>
            {dominantCluster
              ? getClusterRecommendation(dominantCluster)
              : 'Sin conclusión disponible todavía.'}
          </div>
        </article>
      </section>

      {/* Detalle del entrenamiento cuando ya existe un resultado entrenado. */}
      {training ? (
        <>
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.eyebrow}>Resultado final</span>
                <h2 style={styles.sectionTitle}>Distribución por grupo</h2>
                <p style={styles.text}>
                  Se formaron {training.mejorResultado.k} grupos después de{' '}
                  {training.intentos.length} comparaciones y{' '}
                  {training.mejorResultado.iterations} pasadas de revisión.
                </p>
              </div>
            </div>

            <div style={styles.chartBoxTall}>
              <ResponsiveContainer width="100%" height={330}>
                <BarChart data={clustersChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
                  <XAxis dataKey="name" stroke={colors.chartAxis} />
                  <YAxis stroke={colors.chartAxis} />
                  <Tooltip
                    contentStyle={styles.tooltip}
                    labelStyle={styles.tooltipLabel}
                    itemStyle={styles.tooltipItem}
                  />
                  <Bar dataKey="empleados" radius={[12, 12, 0, 0]}>
                    {clustersChart.map((_, index) => (
                      <Cell
                        key={`cluster-cell-${index}`}
                        fill={colors.clusterPalette[index % colors.clusterPalette.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={styles.clusterGrid}>
            {training.mejorResultado.clusters.map((cluster, index) => (
              <article key={cluster.cluster} style={styles.clusterCard}>
                <div style={styles.clusterTop}>
                  <div>
                    <span
                      style={{
                        ...styles.clusterIndex,
                        background:
                          colors.clusterPalette[index % colors.clusterPalette.length],
                      }}
                    >
                      {cluster.cluster + 1}
                    </span>
                    <h3 style={styles.clusterTitle}>
                      Grupo {cluster.cluster + 1} · {getClusterName(cluster)}
                    </h3>
                  </div>

                  <span style={styles.badge}>{cluster.total} empleados</span>
                </div>

                <p style={styles.text}>{cluster.perfil}</p>

                <div style={styles.clusterRecommendation}>
                  {getClusterRecommendation(cluster)}
                </div>

                <div style={styles.miniGrid}>
                  <MetricMini
                    title="Porcentaje"
                    value={`${formatNumber(cluster.porcentaje, 2)}%`}
                    styles={styles}
                  />
                  <MetricMini
                    title="Asistencia"
                    value={formatPercentFromRate(
                      cluster.promedio.tasa_aprobacion_asistencia
                    )}
                    styles={styles}
                  />
                  <MetricMini
                    title="Salidas"
                    value={formatPercentFromRate(cluster.promedio.tasa_salida_asistencia)}
                    styles={styles}
                  />
                  <MetricMini
                    title="Nómina promedio"
                    value={formatMoney(cluster.promedio.promedio_nomina || 0)}
                    styles={styles}
                  />
                  <MetricMini
                    title="Pendientes"
                    value={String(
                      Math.round(toNumber(cluster.promedio.asistencias_pendientes))
                    )}
                    styles={styles}
                  />
                  <MetricMini
                    title="Vacaciones solicitadas"
                    value={String(
                      Math.round(toNumber(cluster.promedio.solicitudes_vacaciones))
                    )}
                    styles={styles}
                  />
                </div>

                <div style={styles.employeeList}>
                  <div style={styles.employeeListHeader}>
                    <strong>Empleados del grupo</strong>
                    <span>{cluster.empleados.length} registros</span>
                  </div>

                  {cluster.empleados.slice(0, 8).map((empleado) => (
                    <div key={empleado.usuario_id} style={styles.employeeItem}>
                      <div>
                        <strong>
                          {empleado.nombre} {empleado.apellido}
                        </strong>
                        <span>{empleado.correo}</span>
                      </div>

                      <small>
                        Asistencia:{' '}
                        {formatPercentFromRate(
                          empleado.datos?.tasa_aprobacion_asistencia
                        )}
                      </small>
                    </div>
                  ))}

                  {cluster.empleados.length > 8 ? (
                    <span style={styles.moreText}>
                      + {cluster.empleados.length - 8} empleados adicionales
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.eyebrow}>Comparación de resultados</span>
                <h2 style={styles.sectionTitle}>Revisiones realizadas</h2>
                <p style={styles.text}>
                  El sistema prueba distintas distribuciones y conserva la que
                  reúne perfiles parecidos con mayor claridad.
                </p>
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Revisión</th>
                    <th style={styles.th}>Grupos</th>
                    <th style={styles.th}>Pasadas</th>
                    <th style={styles.th}>Cercanía</th>
                    <th style={styles.th}>Claridad</th>
                    <th style={styles.th}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {training.intentos.map((item) => {
                    const quality = getSilhouetteQuality(item.silhouette);

                    return (
                      <tr key={item.intento}>
                        <td style={styles.td}>#{item.intento}</td>
                        <td style={styles.td}>{item.k}</td>
                        <td style={styles.td}>{item.iterations}</td>
                        <td style={styles.td}>{formatNumber(item.inertia, 6)}</td>
                        <td style={styles.td}>{formatNumber(item.silhouette, 6)}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.tableBadge,
                              ...getQualityStyle(quality.tone, colors),
                            }}
                          >
                            {quality.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section style={styles.emptyState}>
          <div style={styles.emptyIcon}>KM</div>
          <h2>Grupos pendientes</h2>
          <p>
            Usa la configuración recomendada y selecciona “Actualizar grupos”
            para ver cómo se organiza el personal.
          </p>
        </section>
      )}

      {/* Información considerada y resumen de los datos disponibles. */}
      <section style={styles.dataGrid}>
        <article style={styles.card}>
          <span style={styles.eyebrow}>Información considerada</span>
          <h2 style={styles.sectionTitle}>Datos usados para comparar</h2>
          <p style={styles.text}>
            El sistema compara estos datos con el mismo peso para evitar que una
            sola cifra defina el resultado.
          </p>

          <div style={styles.featureGrid}>
            {Object.entries(featureLabels).map(([key, label]) => (
              <div key={key} style={styles.featureItem}>
                <strong>{label}</strong>
                <span>Incluido en la comparación</span>
              </div>
            ))}
          </div>
        </article>

        <article style={styles.card}>
          <span style={styles.eyebrow}>Resumen de la información</span>
          <h2 style={styles.sectionTitle}>Datos disponibles</h2>

          <div style={styles.datasetStats}>
            <DatasetStat
              label="Asistencias"
              value={String(datasetSummary.totalAsistencias)}
              styles={styles}
            />
            <DatasetStat
              label="Contratos activos"
              value={String(datasetSummary.contratosActivos)}
              styles={styles}
            />
            <DatasetStat
              label="Solicitudes vacaciones"
              value={String(datasetSummary.solicitudesVacaciones)}
              styles={styles}
            />
            <DatasetStat
              label="Pendientes/rechazadas"
              value={String(
                datasetSummary.totalPendientes + datasetSummary.totalRechazadas
              )}
              styles={styles}
            />
          </div>
        </article>
      </section>

      {/* Muestra una vista resumida de las personas consideradas. */}
      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <span style={styles.eyebrow}>Personas incluidas</span>
            <h2 style={styles.sectionTitle}>Primeras personas consideradas</h2>
            <p style={styles.text}>
              Esta tabla muestra una parte de la información usada para formar
              los grupos. La comparación considera datos adicionales.
            </p>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Empleado</th>
                <th style={styles.th}>Correo</th>
                <th style={styles.th}>Asistencias</th>
                <th style={styles.th}>Aprobadas</th>
                <th style={styles.th}>Salidas</th>
                <th style={styles.th}>Vacaciones disp.</th>
                <th style={styles.th}>Nómina promedio</th>
              </tr>
            </thead>
            <tbody>
              {dataset.slice(0, 14).map((row) => (
                <tr key={row.usuario_id}>
                  <td style={styles.td}>
                    <strong>
                      {row.nombre} {row.apellido}
                    </strong>
                  </td>
                  <td style={styles.td}>{row.correo}</td>
                  <td style={styles.td}>{row.total_asistencias || 0}</td>
                  <td style={styles.td}>{row.asistencias_aprobadas || 0}</td>
                  <td style={styles.td}>
                    {formatPercentFromRate(row.tasa_salida_asistencia)}
                  </td>
                  <td style={styles.td}>
                    {row.dias_vacaciones_disponibles || 0}
                  </td>
                  <td style={styles.td}>
                    {formatMoney(row.promedio_nomina || row.salario_estimado || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// Componentes visuales reutilizables para mostrar métricas, tarjetas y ayudas.
function MetricCard({
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
  accent: 'blue' | 'teal' | 'gold' | 'danger';
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  return (
    <article style={styles.metricCard}>
      <div
        style={{
          ...styles.metricAccent,
          background:
            accent === 'teal'
              ? colors.teal
              : accent === 'gold'
                ? colors.gold
                : accent === 'danger'
                  ? colors.danger
                  : colors.primary,
        }}
      />
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function MetricMini({
  title,
  value,
  styles,
}: {
  title: string;
  value: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.metricMini}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoPill({
  label,
  value,
  detail,
  styles,
}: {
  label: string;
  value: string;
  detail: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.infoPill}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function GuideCard({
  title,
  value,
  text,
  note,
  styles,
}: {
  title: string;
  value: string;
  text: string;
  note: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <article style={styles.guideCard}>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{text}</p>
      <small>{note}</small>
    </article>
  );
}

function StepCard({
  number,
  title,
  text,
  status,
  styles,
  colors,
}: {
  number: string;
  title: string;
  text: string;
  status: StepStatus;
  styles: Record<string, CSSProperties>;
  colors: ThemeColors;
}) {
  const label =
    status === 'done' ? 'Listo' : status === 'active' ? 'En proceso' : 'Pendiente';

  const bg =
    status === 'done'
      ? colors.tealSoft
      : status === 'active'
        ? colors.primarySoft
        : colors.surfaceMuted;

  const color =
    status === 'done'
      ? colors.teal
      : status === 'active'
        ? colors.primary
        : colors.textMuted;

  return (
    <article style={styles.stepCard}>
      <div style={styles.stepTop}>
        <span style={styles.stepNumber}>{number}</span>
        <span style={{ ...styles.stepStatus, background: bg, color }}>{label}</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function AnalysisItem({
  title,
  text,
  styles,
}: {
  title: string;
  text: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.analysisItem}>
      <span />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  styles,
}: {
  title: string;
  value: string;
  detail: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <article style={styles.summaryCard}>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function DatasetStat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: Record<string, CSSProperties>;
}) {
  return (
    <div style={styles.datasetStat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// Asigna el color correcto según la calidad del resultado de silueta.
function getQualityStyle(tone: QualityInfo['tone'], colors: ThemeColors): CSSProperties {
  if (tone === 'excellent') {
    return {
      background: colors.tealSoft,
      color: colors.teal,
      borderColor: colors.tealBorder,
    };
  }

  if (tone === 'good') {
    return {
      background: colors.primarySoft,
      color: colors.primary,
      borderColor: colors.primaryBorder,
    };
  }

  if (tone === 'moderate') {
    return {
      background: colors.goldSoft,
      color: colors.gold,
      borderColor: colors.goldBorder,
    };
  }

  if (tone === 'low') {
    return {
      background: colors.dangerSoft,
      color: colors.danger,
      borderColor: colors.dangerBorder,
    };
  }

  return {
    background: colors.surfaceMuted,
    color: colors.textMuted,
    borderColor: colors.border,
  };
}

// Define los colores del tema para modo oscuro y claro.
function getColors(isDark: boolean) {
  return {
    isDark,
    background: isDark ? '#07111F' : '#F4F7FB',
    backgroundSoft: isDark ? '#091827' : '#EAF2FA',
    surface: isDark ? '#0F1B2D' : '#FFFFFF',
    surfaceSoft: isDark ? '#111F33' : '#F8FBFF',
    surfaceMuted: isDark ? '#17263D' : '#EEF4FA',
    surfaceStrong: isDark ? '#07111F' : '#F1F7FC',
    primary: isDark ? '#38BDF8' : '#0A57A4',
    primarySoft: isDark ? 'rgba(56,189,248,0.14)' : 'rgba(10,87,164,0.10)',
    primaryBorder: isDark ? 'rgba(56,189,248,0.32)' : 'rgba(10,87,164,0.22)',
    teal: isDark ? '#2DD4BF' : '#0F9F96',
    tealSoft: isDark ? 'rgba(45,212,191,0.14)' : 'rgba(15,159,150,0.12)',
    tealBorder: isDark ? 'rgba(45,212,191,0.34)' : 'rgba(15,159,150,0.24)',
    gold: isDark ? '#FACC15' : '#B45309',
    goldSoft: isDark ? 'rgba(250,204,21,0.13)' : 'rgba(245,158,11,0.14)',
    goldBorder: isDark ? 'rgba(250,204,21,0.35)' : 'rgba(180,83,9,0.25)',
    danger: isDark ? '#F87171' : '#D64545',
    dangerSoft: isDark ? 'rgba(248,113,113,0.14)' : 'rgba(214,69,69,0.12)',
    dangerBorder: isDark ? 'rgba(248,113,113,0.34)' : 'rgba(214,69,69,0.30)',
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
    clusterPalette: isDark
      ? ['#38BDF8', '#2DD4BF', '#FACC15', '#7DD3FC', '#F87171', '#60A5FA']
      : ['#0A57A4', '#0F9F96', '#B45309', '#38BDF8', '#D64545', '#2563EB'],
  };
}

// Centraliza los estilos visuales del componente para mantener el layout consistente.
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
      gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 0.8fr)',
      gap: 22,
      marginBottom: 20,
    },
    heroContent: {
      padding: 28,
      borderRadius: 30,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    heroPanel: {
      padding: 24,
      borderRadius: 30,
      background: C.surface,
      border: `1px solid ${C.primaryBorder}`,
      boxShadow: C.shadow,
    },
    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 13px',
      borderRadius: 999,
      background: C.tealSoft,
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
      letterSpacing: -1.1,
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
    heroMetaGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
      marginTop: 24,
    },
    infoPill: {
      padding: 15,
      borderRadius: 20,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
    },
    panelEyebrow: {
      color: C.teal,
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    panelTitle: {
      margin: '10px 0 8px',
      fontSize: 28,
      fontWeight: 950,
      color: C.text,
    },
    panelText: {
      margin: 0,
      color: C.textMuted,
      lineHeight: 1.65,
      fontWeight: 700,
    },
    qualityBox: {
      marginTop: 18,
      padding: 18,
      borderRadius: 22,
      background: C.surfaceStrong,
      border: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 14,
    },
    qualityLabel: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    qualityValue: {
      color: C.primary,
      fontSize: 26,
      fontWeight: 950,
    },
    qualityBadge: {
      marginTop: 14,
      padding: 13,
      borderRadius: 18,
      border: '1px solid',
      fontSize: 13,
      lineHeight: 1.55,
      fontWeight: 800,
    },
    errorBox: {
      padding: 16,
      borderRadius: 18,
      background: C.dangerSoft,
      border: `1px solid ${C.dangerBorder}`,
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
      background: C.primarySoft,
      border: `1px solid ${C.primaryBorder}`,
      color: C.primary,
      marginBottom: 18,
      fontWeight: 900,
    },
    loadingDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      background: C.primary,
      boxShadow: `0 0 0 6px ${C.primarySoft}`,
    },
    workflowCard: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      marginBottom: 18,
    },
    sectionHeadingCompact: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 18,
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    sectionHint: {
      margin: 0,
      maxWidth: 430,
      color: C.textMuted,
      fontWeight: 700,
      lineHeight: 1.5,
    },
    parameterGuideGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 12,
    },
    guideCard: {
      padding: 16,
      borderRadius: 22,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    guideActions: {
      marginTop: 16,
      display: 'flex',
      justifyContent: 'flex-end',
    },
    simpleConclusion: {
      marginTop: 13,
      padding: 13,
      borderRadius: 16,
      background: C.tealSoft,
      border: `1px solid ${C.tealBorder}`,
      color: C.teal,
      fontWeight: 900,
      lineHeight: 1.5,
    },
    stepGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 12,
    },
    stepCard: {
      padding: 16,
      borderRadius: 22,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
    },
    stepTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    stepNumber: {
      color: C.primary,
      fontWeight: 950,
      fontSize: 13,
    },
    stepStatus: {
      padding: '5px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 900,
      textTransform: 'uppercase',
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 16,
      marginBottom: 18,
    },
    metricCard: {
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 20,
      borderRadius: 24,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    metricAccent: {
      width: 42,
      height: 6,
      borderRadius: 999,
      marginBottom: 6,
    },
    dashboardGrid: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.85fr)',
      gap: 18,
      marginBottom: 18,
    },
    cardLarge: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    cardSide: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    card: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      marginBottom: 18,
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 18,
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    buttonGroup: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    },
    primaryButton: {
      border: 0,
      borderRadius: 16,
      padding: '14px 18px',
      background: C.teal,
      color: C.isDark ? '#03111A' : '#FFFFFF',
      fontWeight: 950,
      cursor: 'pointer',
      boxShadow: C.isDark
        ? '0 14px 30px rgba(45,212,191,0.14)'
        : '0 14px 30px rgba(15,159,150,0.18)',
    },
    secondaryButton: {
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '14px 18px',
      background: C.surfaceSoft,
      color: C.primary,
      fontWeight: 950,
      cursor: 'pointer',
    },
    eyebrow: {
      color: C.teal,
      fontSize: 12,
      fontWeight: 950,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      margin: '8px 0',
      fontSize: 24,
      fontWeight: 950,
      color: C.text,
      letterSpacing: -0.2,
    },
    text: {
      margin: 0,
      color: C.textMuted,
      lineHeight: 1.65,
      fontWeight: 700,
    },
    controls: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 14,
      marginTop: 18,
    },
    label: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      color: C.textSoft,
      fontWeight: 900,
    },
    input: {
      padding: 14,
      borderRadius: 16,
      border: `1px solid ${C.border}`,
      background: C.surfaceStrong,
      color: C.text,
      fontWeight: 900,
      outline: 'none',
    },
    inputHelp: {
      color: C.textMuted,
      lineHeight: 1.45,
      fontWeight: 700,
    },
    analysisList: {
      display: 'grid',
      gap: 12,
      marginTop: 18,
    },
    analysisItem: {
      display: 'flex',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 14,
      marginBottom: 18,
    },
    summaryCard: {
      padding: 18,
      borderRadius: 22,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    gridTwo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 18,
      marginBottom: 18,
    },
    chartHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    chartBadge: {
      padding: '8px 12px',
      borderRadius: 999,
      border: `1px solid ${C.primaryBorder}`,
      background: C.primarySoft,
      color: C.primary,
      fontWeight: 950,
      fontSize: 12,
      whiteSpace: 'nowrap',
    },
    chartBox: {
      height: 320,
      marginTop: 16,
      padding: 12,
      borderRadius: 22,
      background: C.surfaceStrong,
      border: `1px solid ${C.border}`,
    },
    chartBoxTall: {
      height: 350,
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
    tooltipLabel: {
      color: C.text,
      fontWeight: 900,
    },
    tooltipItem: {
      color: C.primary,
      fontWeight: 800,
    },
    insightGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 14,
      marginBottom: 18,
    },
    insightCard: {
      padding: 20,
      borderRadius: 24,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    clusterGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 18,
      marginBottom: 18,
    },
    clusterCard: {
      padding: 22,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    clusterTop: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    clusterIndex: {
      display: 'inline-flex',
      width: 38,
      height: 38,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      color: C.isDark ? '#03111A' : '#FFFFFF',
      fontWeight: 950,
      marginBottom: 10,
    },
    clusterTitle: {
      margin: 0,
      color: C.text,
      fontSize: 22,
      fontWeight: 950,
    },
    badge: {
      padding: '8px 12px',
      borderRadius: 999,
      background: C.tealSoft,
      color: C.teal,
      fontWeight: 950,
      fontSize: 12,
      whiteSpace: 'nowrap',
    },
    clusterRecommendation: {
      marginTop: 14,
      padding: 13,
      borderRadius: 18,
      background: C.primarySoft,
      border: `1px solid ${C.primaryBorder}`,
      color: C.primary,
      fontWeight: 800,
      lineHeight: 1.5,
    },
    miniGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 10,
      marginTop: 16,
    },
    metricMini: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      padding: 13,
      borderRadius: 16,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
    },
    employeeList: {
      display: 'grid',
      gap: 8,
      marginTop: 16,
    },
    employeeListHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      color: C.textMuted,
      fontSize: 13,
      fontWeight: 900,
    },
    employeeItem: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      padding: 12,
      borderRadius: 16,
      background: C.surfaceStrong,
      border: `1px solid ${C.border}`,
      color: C.textSoft,
    },
    moreText: {
      color: C.textMuted,
      fontWeight: 900,
      fontSize: 13,
    },
    tableWrapper: {
      width: '100%',
      overflowX: 'auto',
      marginTop: 14,
      borderRadius: 18,
      border: `1px solid ${C.border}`,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: 820,
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
    tableBadge: {
      display: 'inline-flex',
      padding: '6px 9px',
      borderRadius: 999,
      border: '1px solid',
      fontWeight: 950,
      fontSize: 11,
    },
    emptyState: {
      padding: 34,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      marginBottom: 18,
      textAlign: 'center',
      color: C.text,
    },
    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      background: C.primarySoft,
      color: C.primary,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 950,
      marginBottom: 14,
    },
    dataGrid: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.75fr)',
      gap: 18,
    },
    featureGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
      marginTop: 16,
    },
    featureItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: 14,
      borderRadius: 18,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      color: C.textSoft,
    },
    datasetStats: {
      display: 'grid',
      gap: 12,
      marginTop: 18,
    },
    datasetStat: {
      padding: 15,
      borderRadius: 18,
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
  };
}
