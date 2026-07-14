import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { api } from '../../services/api';

type Riesgo = 'BAJO' | 'MEDIO' | 'ALTO';
type RiskFilter = Riesgo | 'TODOS';
type ActiveFilter = 'TODOS' | 'ACTIVO' | 'INACTIVO';
type TabKey = 'resumen' | 'graficas' | 'empleados' | 'modelo';
type SortBy =
  | 'probabilidad_desc'
  | 'probabilidad_asc'
  | 'ausencias_desc'
  | 'score_desc'
  | 'nombre_asc';

type ResumenML = {
  total_empleados: number;
  riesgo_alto: number;
  riesgo_medio: number;
  riesgo_bajo: number;
  modelo_clasificacion: string;
  modelo_regresion: string;
  objetivo: string;
};

type EvaluacionML = {
  accuracy: number;
  mae: number;
  mse: number;
  total_registros: number;
  descripcion: string;
};

type PrediccionML = {
  usuario_id: number;
  nombre_completo: string;
  correo: string;
  rol: string;
  activo: number;
  antiguedad_meses: number;
  dias_vacaciones_disponibles: number;
  score_riesgo: number;
  ausencias_estimadas: number;
  riesgo_real: Riesgo;
  riesgo_predicho: Riesgo;
  probabilidad: number;
  recomendacion: string;
};

type MlResponse = {
  ok: boolean;
  message?: string;
  resumen?: ResumenML;
  evaluacion?: EvaluacionML;
  predicciones?: PrediccionML[];
};

const RISK_COLORS: Record<Riesgo, string> = {
  BAJO: '#22c55e',
  MEDIO: '#f59e0b',
  ALTO: '#ef4444',
};

const PROBABILITY_BANDS = [
  { label: '0 - 30%', min: 0, max: 30 },
  { label: '31 - 45%', min: 31, max: 45 },
  { label: '46 - 60%', min: 46, max: 60 },
  { label: '61 - 75%', min: 61, max: 75 },
  { label: '76 - 100%', min: 76, max: 100 },
];

function getRiskLabel(riesgo?: string) {
  if (riesgo === 'ALTO') return 'Riesgo alto';
  if (riesgo === 'MEDIO') return 'Riesgo medio';
  return 'Riesgo bajo';
}

function getRiskClass(riesgo?: string) {
  if (riesgo === 'ALTO') return 'risk-high';
  if (riesgo === 'MEDIO') return 'risk-medium';
  return 'risk-low';
}

function formatNumber(value?: number, decimals = 2) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0';
  }

  return Number(value).toFixed(decimals);
}

function shortName(name: string, max = 18) {
  if (!name) return 'Empleado';
  return name.length > max ? `${name.slice(0, max)}...` : name;
}

function getNivelModelo(accuracy?: number) {
  const value = Number(accuracy || 0);

  if (value >= 90) return 'Alto desempeño';
  if (value >= 75) return 'Desempeño aceptable';
  return 'Requiere ajuste';
}

export default function AnalisisSupervisado() {
  const [resumen, setResumen] = useState<ResumenML | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionML | null>(null);
  const [predicciones, setPredicciones] = useState<PrediccionML[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('TODOS');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('TODOS');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [sortBy, setSortBy] = useState<SortBy>('probabilidad_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedEmployee, setSelectedEmployee] = useState<PrediccionML | null>(null);

  const totalEmpleados = resumen?.total_empleados || 0;

  const porcentajes = useMemo(() => {
    if (!resumen || totalEmpleados === 0) {
      return { bajo: 0, medio: 0, alto: 0 };
    }

    return {
      bajo: Math.round((resumen.riesgo_bajo / totalEmpleados) * 100),
      medio: Math.round((resumen.riesgo_medio / totalEmpleados) * 100),
      alto: Math.round((resumen.riesgo_alto / totalEmpleados) * 100),
    };
  }, [resumen, totalEmpleados]);

  const rolesDisponibles = useMemo(() => {
    const roles = new Set(predicciones.map((item) => item.rol).filter(Boolean));
    return ['TODOS', ...Array.from(roles)];
  }, [predicciones]);

  const empleadosActivos = useMemo(() => {
    return predicciones.filter((item) => Number(item.activo) === 1).length;
  }, [predicciones]);

  const empleadosInactivos = useMemo(() => {
    return predicciones.filter((item) => Number(item.activo) === 0).length;
  }, [predicciones]);

  const promedioAusencias = useMemo(() => {
    if (!predicciones.length) return 0;

    const total = predicciones.reduce(
      (acc, item) => acc + Number(item.ausencias_estimadas || 0),
      0
    );

    return total / predicciones.length;
  }, [predicciones]);

  const promedioScore = useMemo(() => {
    if (!predicciones.length) return 0;

    const total = predicciones.reduce((acc, item) => acc + Number(item.score_riesgo || 0), 0);

    return total / predicciones.length;
  }, [predicciones]);

  const maxProbabilidad = useMemo(() => {
    if (!predicciones.length) return 0;

    return Math.max(...predicciones.map((item) => Number(item.probabilidad || 0)));
  }, [predicciones]);

  const mayorProbabilidadEmpleado = useMemo(() => {
    return [...predicciones].sort(
      (a, b) => Number(b.probabilidad) - Number(a.probabilidad)
    )[0];
  }, [predicciones]);

  const topRiesgo = useMemo(() => {
    return [...predicciones]
      .sort((a, b) => Number(b.probabilidad) - Number(a.probabilidad))
      .slice(0, 5);
  }, [predicciones]);

  const empleadosSeguimiento = useMemo(() => {
    return predicciones.filter(
      (item) =>
        item.riesgo_predicho === 'MEDIO' ||
        item.riesgo_predicho === 'ALTO' ||
        Number(item.probabilidad) >= 60
    ).length;
  }, [predicciones]);

  const riskChartData = useMemo(() => {
    return [
      {
        name: 'Bajo',
        key: 'BAJO' as Riesgo,
        value: resumen?.riesgo_bajo || 0,
      },
      {
        name: 'Medio',
        key: 'MEDIO' as Riesgo,
        value: resumen?.riesgo_medio || 0,
      },
      {
        name: 'Alto',
        key: 'ALTO' as Riesgo,
        value: resumen?.riesgo_alto || 0,
      },
    ];
  }, [resumen]);

  const topChartData = useMemo(() => {
    return [...predicciones]
      .sort((a, b) => Number(b.probabilidad) - Number(a.probabilidad))
      .slice(0, 8)
      .map((item) => ({
        empleado: shortName(item.nombre_completo, 16),
        probabilidad: Number(item.probabilidad || 0),
        ausencias: Number(item.ausencias_estimadas || 0),
        riesgo: item.riesgo_predicho,
      }));
  }, [predicciones]);

  const scatterData = useMemo(() => {
    return predicciones.map((item) => ({
      x: Number(item.probabilidad || 0),
      y: Number(item.ausencias_estimadas || 0),
      z: Number(item.score_riesgo || 0),
      nombre: item.nombre_completo,
      riesgo: item.riesgo_predicho,
    }));
  }, [predicciones]);

  const scoreVacationScatterData = useMemo(() => {
    return predicciones.map((item) => ({
      x: Number(item.dias_vacaciones_disponibles || 0),
      y: Number(item.score_riesgo || 0),
      z: Number(item.probabilidad || 0),
      nombre: item.nombre_completo,
      riesgo: item.riesgo_predicho,
    }));
  }, [predicciones]);

  const riskByRoleData = useMemo(() => {
    const map = new Map<string, { rol: string; BAJO: number; MEDIO: number; ALTO: number }>();

    predicciones.forEach((item) => {
      const rol = item.rol || 'Sin rol';

      if (!map.has(rol)) {
        map.set(rol, {
          rol,
          BAJO: 0,
          MEDIO: 0,
          ALTO: 0,
        });
      }

      const current = map.get(rol);

      if (current) {
        current[item.riesgo_predicho] += 1;
      }
    });

    return Array.from(map.values());
  }, [predicciones]);

  const probabilityBandsData = useMemo(() => {
    return PROBABILITY_BANDS.map((band) => ({
      rango: band.label,
      empleados: predicciones.filter((item) => {
        const prob = Number(item.probabilidad || 0);
        return prob >= band.min && prob <= band.max;
      }).length,
    }));
  }, [predicciones]);

  const activeStatusData = useMemo(() => {
    return [
      { estado: 'Activos', empleados: empleadosActivos },
      { estado: 'Inactivos', empleados: empleadosInactivos },
    ];
  }, [empleadosActivos, empleadosInactivos]);

  const modelMetricData = useMemo(() => {
    return [
      {
        metrica: 'Accuracy',
        valor: Number(evaluacion?.accuracy || 0),
      },
      {
        metrica: 'MAE x100',
        valor: Number(evaluacion?.mae || 0) * 100,
      },
      {
        metrica: 'MSE x100',
        valor: Number(evaluacion?.mse || 0) * 100,
      },
    ];
  }, [evaluacion]);

  const insights = useMemo(() => {
    const riesgoMedio = resumen?.riesgo_medio || 0;
    const riesgoAlto = resumen?.riesgo_alto || 0;
    const riesgoBajo = resumen?.riesgo_bajo || 0;
    const total = resumen?.total_empleados || 0;
    const porcentajeBajo = total ? Math.round((riesgoBajo / total) * 100) : 0;
    const mayor = topRiesgo[0];

    return [
      {
        title: 'Panorama general',
        text: `El ${porcentajeBajo}% del personal se clasifica actualmente en riesgo bajo, lo que indica estabilidad general del dataset.`,
      },
      {
        title: 'Atención preventiva',
        text:
          riesgoAlto > 0
            ? `Se detectaron ${riesgoAlto} empleados en riesgo alto que requieren seguimiento inmediato.`
            : 'No se detectaron empleados en riesgo alto durante esta ejecución.',
      },
      {
        title: 'Grupo de seguimiento',
        text: `El grupo preventivo principal está formado por ${riesgoMedio} empleados en riesgo medio.`,
      },
      {
        title: 'Probabilidad máxima',
        text: mayor
          ? `La probabilidad máxima detectada es de ${mayor.probabilidad}% en ${mayor.nombre_completo}.`
          : 'No hay empleados disponibles para calcular probabilidad máxima.',
      },
      {
        title: 'Ausencias estimadas',
        text: `El promedio estimado de ausencias es de ${formatNumber(
          promedioAusencias,
          2
        )} por empleado.`,
      },
    ];
  }, [resumen, topRiesgo, promedioAusencias]);

  const filteredPredicciones = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = predicciones.filter((item) => {
      const matchesSearch =
        !term ||
        item.nombre_completo.toLowerCase().includes(term) ||
        item.correo.toLowerCase().includes(term) ||
        item.rol.toLowerCase().includes(term);

      const matchesRisk = riskFilter === 'TODOS' || item.riesgo_predicho === riskFilter;

      const matchesActive =
        activeFilter === 'TODOS' ||
        (activeFilter === 'ACTIVO' && Number(item.activo) === 1) ||
        (activeFilter === 'INACTIVO' && Number(item.activo) === 0);

      const matchesRole = roleFilter === 'TODOS' || item.rol === roleFilter;

      return matchesSearch && matchesRisk && matchesActive && matchesRole;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'probabilidad_asc') {
        return Number(a.probabilidad) - Number(b.probabilidad);
      }

      if (sortBy === 'ausencias_desc') {
        return Number(b.ausencias_estimadas) - Number(a.ausencias_estimadas);
      }

      if (sortBy === 'score_desc') {
        return Number(b.score_riesgo) - Number(a.score_riesgo);
      }

      if (sortBy === 'nombre_asc') {
        return a.nombre_completo.localeCompare(b.nombre_completo);
      }

      return Number(b.probabilidad) - Number(a.probabilidad);
    });
  }, [predicciones, search, riskFilter, activeFilter, roleFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPredicciones.length / pageSize));

  const paginatedPredicciones = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPredicciones.slice(start, start + pageSize);
  }, [filteredPredicciones, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, riskFilter, activeFilter, roleFilter, sortBy, pageSize]);

  async function cargarPredicciones() {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { data } = await api.get<MlResponse>('/ml/predicciones');

      if (!data?.ok) {
        setError(data?.message || 'No se pudo cargar el análisis supervisado.');
        return;
      }

      setPredicciones(data.predicciones || []);
      setEvaluacion(data.evaluacion || null);

      const resumenResponse = await api.get<MlResponse>('/ml/resumen');

      if (resumenResponse.data?.ok) {
        setResumen(resumenResponse.data.resumen || null);
        setEvaluacion(resumenResponse.data.evaluacion || data.evaluacion || null);
      }

      setLastUpdated(
        new Date().toLocaleString('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar el módulo de análisis.');
    } finally {
      setLoading(false);
    }
  }

  async function ejecutarModelo() {
    if (training) return;

    try {
      setTraining(true);
      setError('');
      setSuccess('');

      const { data } = await api.post<MlResponse>('/ml/entrenar');

      if (!data?.ok) {
        setError(data?.message || 'No se pudo ejecutar el modelo.');
        return;
      }

      setResumen(data.resumen || null);
      setEvaluacion(data.evaluacion || null);
      setPredicciones(data.predicciones || []);
      setSuccess(data.message || 'Modelo supervisado ejecutado correctamente.');

      setLastUpdated(
        new Date().toLocaleString('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al ejecutar el modelo.');
    } finally {
      setTraining(false);
    }
  }

  function exportarCSV(tipo: 'todo' | 'filtrado' = 'todo') {
    const headers = [
      'usuario_id',
      'nombre_completo',
      'correo',
      'rol',
      'activo',
      'antiguedad_meses',
      'dias_vacaciones_disponibles',
      'score_riesgo',
      'ausencias_estimadas',
      'riesgo_real',
      'riesgo_predicho',
      'probabilidad',
      'recomendacion',
    ];

    const datosAExportar = tipo === 'todo' ? predicciones : filteredPredicciones;

    if (!datosAExportar.length) {
      setError('No hay datos disponibles para exportar.');
      return;
    }

    const rows = datosAExportar.map((item) =>
      headers
        .map((key) => {
          const value = String((item as any)[key] ?? '');
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download =
      tipo === 'todo'
        ? `smart-rh-analisis-supervisado-todos-${Date.now()}.csv`
        : `smart-rh-analisis-supervisado-filtrado-${Date.now()}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    cargarPredicciones();
  }, []);

  return (
    <div className="ml-page ml-page-pro">
      <section className="ml-hero ml-hero-pro">
        <div>
          <p className="ml-eyebrow">Machine Learning · SMART RH</p>
          <h1>Análisis Supervisado</h1>

          <p>
            Clasificación de riesgo laboral y predicción estimada de ausencias usando datos
            de empleados reales del sistema. El modelo excluye cuentas administrativas
            generales para evitar contaminar el dataset.
          </p>

          <div className="ml-hero-actions">
            <button type="button" onClick={ejecutarModelo} disabled={training}>
              {training ? 'Ejecutando modelo...' : 'Ejecutar modelo'}
            </button>

            <button type="button" className="secondary" onClick={cargarPredicciones}>
              Actualizar datos
            </button>

            <button type="button" className="secondary" onClick={() => exportarCSV('todo')}>
              Exportar todo
            </button>

            <button type="button" className="secondary" onClick={() => exportarCSV('filtrado')}>
              Exportar filtrados
            </button>
          </div>

          {error && <div className="ml-message error">{error}</div>}
          {success && <div className="ml-message success">{success}</div>}
        </div>

        <div className="ml-model-card ml-model-card-pro">
          <span>Modelo activo</span>
          <strong>{resumen?.modelo_clasificacion || 'KNN'}</strong>
          <p>Clasificación de riesgo laboral</p>

          <div className="ml-model-meta">
            <div>
              <small>Regresión</small>
              <b>{resumen?.modelo_regresion || 'Ausencias estimadas'}</b>
            </div>

            <div>
              <small>Dataset válido</small>
              <b>{totalEmpleados} empleados</b>
            </div>

            <div>
              <small>Última ejecución</small>
              <b>{lastUpdated || 'Pendiente'}</b>
            </div>

            <div>
              <small>Nivel</small>
              <b>{getNivelModelo(evaluacion?.accuracy)}</b>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="ml-loading-card">
          <strong>Cargando análisis...</strong>
          <p>Obteniendo predicciones y evaluación del modelo.</p>
        </div>
      ) : (
        <>
          <section className="ml-kpi-grid ml-kpi-grid-pro">
            <article className="ml-kpi-card">
              <span>Empleados analizados</span>
              <strong>{resumen?.total_empleados || 0}</strong>
              <p>Registros reales considerados por el modelo.</p>
            </article>

            <article className="ml-kpi-card">
              <span>Accuracy</span>
              <strong>{formatNumber(evaluacion?.accuracy, 2)}%</strong>
              <p>Precisión de clasificación del modelo supervisado.</p>
            </article>

            <article className="ml-kpi-card">
              <span>Seguimiento RH</span>
              <strong>{empleadosSeguimiento}</strong>
              <p>Empleados con riesgo medio, alto o probabilidad mayor a 60%.</p>
            </article>

            <article className="ml-kpi-card">
              <span>Ausencias promedio</span>
              <strong>{formatNumber(promedioAusencias, 2)}</strong>
              <p>Promedio estimado por empleado en el periodo.</p>
            </article>

            <article className="ml-kpi-card">
              <span>MAE</span>
              <strong>{formatNumber(evaluacion?.mae, 4)}</strong>
              <p>Error absoluto medio en la estimación.</p>
            </article>

            <article className="ml-kpi-card">
              <span>MSE</span>
              <strong>{formatNumber(evaluacion?.mse, 4)}</strong>
              <p>Error cuadrático medio del modelo.</p>
            </article>

            <article className="ml-kpi-card">
              <span>Probabilidad máxima</span>
              <strong>{formatNumber(maxProbabilidad, 0)}%</strong>
              <p>Mayor probabilidad detectada en la ejecución.</p>
            </article>

            <article className="ml-kpi-card">
              <span>Score promedio</span>
              <strong>{formatNumber(promedioScore, 1)}</strong>
              <p>Promedio general del score de riesgo laboral.</p>
            </article>
          </section>

          <section className="ml-tabs">
            <button
              type="button"
              className={activeTab === 'resumen' ? 'active' : ''}
              onClick={() => setActiveTab('resumen')}
            >
              Resumen
            </button>

            <button
              type="button"
              className={activeTab === 'graficas' ? 'active' : ''}
              onClick={() => setActiveTab('graficas')}
            >
              Gráficas
            </button>

            <button
              type="button"
              className={activeTab === 'empleados' ? 'active' : ''}
              onClick={() => setActiveTab('empleados')}
            >
              Empleados
            </button>

            <button
              type="button"
              className={activeTab === 'modelo' ? 'active' : ''}
              onClick={() => setActiveTab('modelo')}
            >
              Modelo
            </button>
          </section>

          {activeTab === 'resumen' && (
            <>
              <section className="ml-summary-grid-pro">
                <article className="ml-panel ml-executive-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Resumen ejecutivo</span>
                      <h2>Estado actual del personal</h2>
                    </div>
                  </div>

                  <p>
                    El modelo analizó <b>{totalEmpleados}</b> empleados reales y clasificó
                    el riesgo laboral en tres niveles: bajo, medio y alto. Esta información
                    permite a RRHH actuar de forma preventiva antes de que se presenten
                    incidencias operativas.
                  </p>

                  <div className="ml-executive-grid">
                    <div>
                      <span>Personal estable</span>
                      <strong>{resumen?.riesgo_bajo || 0}</strong>
                      <small>{porcentajes.bajo}% del dataset</small>
                    </div>

                    <div>
                      <span>Atención preventiva</span>
                      <strong>{resumen?.riesgo_medio || 0}</strong>
                      <small>{porcentajes.medio}% del dataset</small>
                    </div>

                    <div>
                      <span>Atención crítica</span>
                      <strong>{resumen?.riesgo_alto || 0}</strong>
                      <small>{porcentajes.alto}% del dataset</small>
                    </div>

                    <div>
                      <span>Probabilidad mayor</span>
                      <strong>{formatNumber(maxProbabilidad, 0)}%</strong>
                      <small>{mayorProbabilidadEmpleado?.nombre_completo || 'Sin datos'}</small>
                    </div>
                  </div>
                </article>

                <article className="ml-panel ml-health-card-pro">
                  <div className="ml-panel-header">
                    <div>
                      <span>Salud del modelo</span>
                      <h2>Evaluación rápida</h2>
                    </div>
                  </div>

                  <div className="ml-health-list">
                    <div>
                      <span>Precisión</span>
                      <strong>{formatNumber(evaluacion?.accuracy, 2)}%</strong>
                      <p>{getNivelModelo(evaluacion?.accuracy)}</p>
                    </div>

                    <div>
                      <span>Error MAE</span>
                      <strong>{formatNumber(evaluacion?.mae, 4)}</strong>
                      <p>Mientras más bajo, mejor estimación.</p>
                    </div>

                    <div>
                      <span>Error MSE</span>
                      <strong>{formatNumber(evaluacion?.mse, 4)}</strong>
                      <p>Penaliza más los errores grandes.</p>
                    </div>

                    <div>
                      <span>Registros evaluados</span>
                      <strong>{evaluacion?.total_registros || 0}</strong>
                      <p>Empleados usados en la evaluación.</p>
                    </div>
                  </div>
                </article>
              </section>

              <section className="ml-main-grid">
                <article className="ml-panel">
                  <div className="ml-panel-header">
                    <div>
                      <span>Distribución de riesgo</span>
                      <h2>Clasificación actual</h2>
                    </div>
                  </div>

                  <div className="ml-risk-bars">
                    <div className="ml-risk-row">
                      <div>
                        <strong>Bajo</strong>
                        <span>{resumen?.riesgo_bajo || 0} empleados</span>
                      </div>
                      <div className="ml-bar">
                        <span
                          className="risk-low-bg"
                          style={{ width: `${porcentajes.bajo}%` }}
                        />
                      </div>
                      <b>{porcentajes.bajo}%</b>
                    </div>

                    <div className="ml-risk-row">
                      <div>
                        <strong>Medio</strong>
                        <span>{resumen?.riesgo_medio || 0} empleados</span>
                      </div>
                      <div className="ml-bar">
                        <span
                          className="risk-medium-bg"
                          style={{ width: `${porcentajes.medio}%` }}
                        />
                      </div>
                      <b>{porcentajes.medio}%</b>
                    </div>

                    <div className="ml-risk-row">
                      <div>
                        <strong>Alto</strong>
                        <span>{resumen?.riesgo_alto || 0} empleados</span>
                      </div>
                      <div className="ml-bar">
                        <span
                          className="risk-high-bg"
                          style={{ width: `${porcentajes.alto}%` }}
                        />
                      </div>
                      <b>{porcentajes.alto}%</b>
                    </div>
                  </div>
                </article>

                <article className="ml-panel">
                  <div className="ml-panel-header">
                    <div>
                      <span>Mayor probabilidad</span>
                      <h2>Seguimiento sugerido</h2>
                    </div>
                  </div>

                  <div className="ml-top-list">
                    {topRiesgo.map((item) => (
                      <button
                        type="button"
                        key={item.usuario_id}
                        className="ml-top-item"
                        onClick={() => setSelectedEmployee(item)}
                      >
                        <div>
                          <strong>{item.nombre_completo}</strong>
                          <span>{item.correo}</span>
                        </div>

                        <div className={`ml-risk-pill ${getRiskClass(item.riesgo_predicho)}`}>
                          {item.probabilidad}%
                        </div>
                      </button>
                    ))}
                  </div>
                </article>
              </section>

              <section className="ml-insight-grid">
                <article className="ml-panel">
                  <div className="ml-panel-header">
                    <div>
                      <span>Insights automáticos</span>
                      <h2>Lectura</h2>
                    </div>
                  </div>

                  <div className="ml-insight-list">
                    {insights.map((item) => (
                      <div key={item.title} className="ml-insight-item">
                        <span>✓</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="ml-panel">
                  <div className="ml-panel-header">
                    <div>
                      <span>Plan de acción</span>
                      <h2>Recomendaciones RH</h2>
                    </div>
                  </div>

                  <div className="ml-recommendation-list">
                    <p>
                      <b>Prioridad 1:</b> Revisar empleados con probabilidad mayor a 60%.
                    </p>
                    <p>
                      <b>Prioridad 2:</b> Atender empleados en riesgo medio aunque no tengan
                      ausencias acumuladas.
                    </p>
                    <p>
                      <b>Prioridad 3:</b> Actualizar asistencia, vacaciones y estado laboral
                      antes de ejecutar nuevamente.
                    </p>
                    <p>
                      <b>Nota:</b> El modelo funciona como apoyo a la decisión, no como sanción
                      automática.
                    </p>
                  </div>
                </article>
              </section>

              <section className="ml-data-quality-grid">
                <article className="ml-panel">
                  <span className="ml-section-tag">Calidad del dataset</span>
                  <h3>Datos considerados</h3>
                  <p>
                    El análisis usa empleados reales registrados en SMART RH. Las cuentas
                    generales del sistema, como usuarios administrativos sin relación laboral
                    directa, se excluyen para evitar sesgos.
                  </p>

                  <div className="ml-chip-list">
                    <span>{empleadosActivos} activos</span>
                    <span>{empleadosInactivos} inactivos</span>
                    <span>{totalEmpleados} registros válidos</span>
                    <span>Cuentas de sistema excluidas</span>
                  </div>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Interpretación</span>
                  <h3>Cómo leer el resultado</h3>
                  <p>
                    Un empleado con riesgo medio no necesariamente tiene una incidencia, pero
                    sí muestra condiciones que ameritan seguimiento preventivo. El riesgo alto
                    indicaría necesidad de intervención inmediata.
                  </p>

                  <div className="ml-chip-list">
                    <span>Bajo = monitoreo normal</span>
                    <span>Medio = seguimiento</span>
                    <span>Alto = atención prioritaria</span>
                  </div>
                </article>
              </section>
            </>
          )}

          {activeTab === 'graficas' && (
            <>
              <section className="ml-graph-intro">
                <div>
                  <span className="ml-section-tag">Visualización analítica</span>
                  <h2>Gráficas del modelo supervisado</h2>
                  <p>
                    Estas gráficas permiten interpretar el comportamiento del dataset, detectar
                    concentración de riesgo, comparar roles y ubicar empleados con mayor
                    probabilidad de incidencia.
                  </p>
                </div>
              </section>

              <section className="ml-charts-grid ml-charts-grid-pro">
                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Gráfica circular</span>
                      <h2>Distribución por riesgo</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={riskChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={4}
                        >
                          {riskChartData.map((entry) => (
                            <Cell key={entry.key} fill={RISK_COLORS[entry.key]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Muestra qué proporción del personal se encuentra en riesgo bajo, medio
                      o alto. Sirve para saber si el estado general del personal es estable o
                      requiere atención preventiva.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Top empleados</span>
                      <h2>Mayor probabilidad</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="empleado" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="probabilidad" radius={[10, 10, 0, 0]}>
                          {topChartData.map((item, index) => (
                            <Cell
                              key={`${item.empleado}-${index}`}
                              fill={RISK_COLORS[item.riesgo as Riesgo]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Ordena los empleados con mayor probabilidad de riesgo. Es útil para
                      priorizar revisiones, entrevistas o seguimiento por parte de RRHH.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Histograma</span>
                      <h2>Distribución de probabilidad</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={probabilityBandsData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="rango" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="empleados" fill="#38bdf8" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Agrupa a los empleados por rangos de probabilidad. Ayuda a identificar
                      si el riesgo está concentrado en pocos empleados o distribuido en varios.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Comparativo por rol</span>
                      <h2>Riesgo por tipo de usuario</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={riskByRoleData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="rol" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="BAJO" stackId="a" fill={RISK_COLORS.BAJO} />
                        <Bar dataKey="MEDIO" stackId="a" fill={RISK_COLORS.MEDIO} />
                        <Bar dataKey="ALTO" stackId="a" fill={RISK_COLORS.ALTO} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Compara la distribución del riesgo por rol. Permite revisar si el riesgo
                      se concentra más en empleados, administradores u otros perfiles.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card ml-chart-wide">
                  <div className="ml-panel-header">
                    <div>
                      <span>Relación de variables</span>
                      <h2>Probabilidad vs ausencias estimadas</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={330}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" dataKey="x" name="Probabilidad" unit="%" />
                        <YAxis type="number" dataKey="y" name="Ausencias" />
                        <ZAxis type="number" dataKey="z" range={[70, 260]} name="Score" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Empleados" data={scatterData} fill="#38bdf8" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Relaciona la probabilidad de riesgo con las ausencias estimadas. Los
                      puntos más altos y a la derecha representan empleados que requieren
                      mayor atención preventiva.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card ml-chart-wide">
                  <div className="ml-panel-header">
                    <div>
                      <span>Vacaciones y score</span>
                      <h2>Días disponibles vs score de riesgo</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={330}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" dataKey="x" name="Vacaciones" unit=" días" />
                        <YAxis type="number" dataKey="y" name="Score" />
                        <ZAxis type="number" dataKey="z" range={[70, 260]} name="Probabilidad" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Empleados" data={scoreVacationScatterData} fill="#2dd4bf" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Permite observar si los empleados con pocos días disponibles tienen un
                      score de riesgo mayor. Es útil para detectar patrones relacionados con
                      carga laboral, descanso o historial de uso de vacaciones.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Estado laboral</span>
                      <h2>Activos e inactivos</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={activeStatusData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="estado" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="empleados" fill="#22c55e" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Separa empleados activos e inactivos dentro del dataset. Los inactivos
                      pueden elevar el score y deben revisarse con cuidado en la interpretación.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Métricas del modelo</span>
                      <h2>Accuracy, MAE y MSE</h2>
                    </div>
                  </div>

                  <div className="ml-chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={modelMetricData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="metrica" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="valor" fill="#38bdf8" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ml-chart-summary">
                    <strong>Qué significa:</strong>
                    <p>
                      Resume el rendimiento del modelo. Accuracy indica precisión de
                      clasificación; MAE y MSE muestran el error de estimación.
                    </p>
                  </div>
                </article>
              </section>
            </>
          )}

          {activeTab === 'empleados' && (
            <section className="ml-table-section">
              <div className="ml-panel-header">
                <div>
                  <span>Predicciones generadas</span>
                  <h2>Resultados por empleado</h2>
                </div>

                <small>
                  {filteredPredicciones.length} de {predicciones.length} registros
                </small>
              </div>

              <div className="ml-filters">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, correo o rol..."
                />

                <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}>
                  <option value="TODOS">Todos los riesgos</option>
                  <option value="BAJO">Riesgo bajo</option>
                  <option value="MEDIO">Riesgo medio</option>
                  <option value="ALTO">Riesgo alto</option>
                </select>

                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}>
                  <option value="TODOS">Todos los estados</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="INACTIVO">Inactivos</option>
                </select>

                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  {rolesDisponibles.map((rol) => (
                    <option key={rol} value={rol}>
                      {rol === 'TODOS' ? 'Todos los roles' : rol}
                    </option>
                  ))}
                </select>

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                  <option value="probabilidad_desc">Mayor probabilidad</option>
                  <option value="probabilidad_asc">Menor probabilidad</option>
                  <option value="ausencias_desc">Más ausencias</option>
                  <option value="score_desc">Mayor score</option>
                  <option value="nombre_asc">Nombre A-Z</option>
                </select>

                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  <option value={5}>Mostrar 5</option>
                  <option value={10}>Mostrar 10</option>
                  <option value={20}>Mostrar 20</option>
                  <option value={50}>Mostrar 50</option>
                </select>
              </div>

              <div className="ml-table-wrapper">
                <table className="ml-table ml-table-compact">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Estado</th>
                      <th>Score</th>
                      <th>Ausencias</th>
                      <th>Riesgo</th>
                      <th>Probabilidad</th>
                      <th>Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedPredicciones.map((item) => (
                      <tr key={item.usuario_id}>
                        <td>
                          <strong>{item.nombre_completo}</strong>
                          <span>{item.correo}</span>
                        </td>

                        <td>
                          <span
                            className={`ml-status-pill ${
                              Number(item.activo) === 1 ? 'active' : 'inactive'
                            }`}
                          >
                            {Number(item.activo) === 1 ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td>{item.score_riesgo}</td>
                        <td>{item.ausencias_estimadas}</td>

                        <td>
                          <span className={`ml-risk-pill ${getRiskClass(item.riesgo_predicho)}`}>
                            {getRiskLabel(item.riesgo_predicho)}
                          </span>
                        </td>

                        <td>{item.probabilidad}%</td>

                        <td>
                          <button
                            type="button"
                            className="ml-detail-btn"
                            onClick={() => setSelectedEmployee(item)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!paginatedPredicciones.length && (
                      <tr>
                        <td colSpan={7}>
                          <div className="ml-empty">
                            No hay resultados con los filtros seleccionados.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ml-pagination">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </button>

                <span>
                  Página {page} de {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </button>
              </div>
            </section>
          )}

          {activeTab === 'modelo' && (
            <>
              <section className="ml-model-explain-hero">
                <span className="ml-section-tag">Explicación académica y técnica</span>
                <h2>Modelo de aprendizaje supervisado aplicado a SMART RH</h2>
                <p>
                  Este módulo implementa un enfoque educativo de aprendizaje supervisado para
                  clasificar riesgo laboral y estimar ausencias. El objetivo es mostrar cómo los
                  datos de RRHH pueden transformarse en información útil para la prevención y la
                  toma de decisiones.
                </p>
              </section>

              <section className="ml-model-grid-pro">
                <article className="ml-panel">
                  <span className="ml-section-tag">Objetivo del modelo</span>
                  <h3>Qué predice</h3>
                  <p>
                    El sistema predice el nivel de riesgo laboral de cada empleado y estima
                    posibles ausencias en el próximo periodo. La salida se expresa como riesgo
                    bajo, medio o alto.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Tipo de aprendizaje</span>
                  <h3>Supervisado</h3>
                  <p>
                    El modelo usa registros con variables de entrada y una etiqueta de riesgo
                    calculada. Con estos ejemplos aprende a clasificar nuevos registros con
                    características similares.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Clasificación</span>
                  <h3>KNN</h3>
                  <p>
                    KNN compara cada empleado contra registros similares y asigna una clase
                    según los vecinos más cercanos. En este caso las clases son bajo, medio
                    y alto.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Regresión</span>
                  <h3>Ausencias estimadas</h3>
                  <p>
                    La estimación de ausencias se calcula mediante una relación lineal entre
                    score de riesgo, antigüedad y días disponibles, permitiendo generar una
                    predicción numérica.
                  </p>
                </article>
              </section>

              <section className="ml-variable-section">
                <article className="ml-panel">
                  <div className="ml-panel-header">
                    <div>
                      <span>Variables de entrada</span>
                      <h2>Características usadas</h2>
                    </div>
                  </div>

                  <div className="ml-variable-grid">
                    <div>
                      <strong>Antigüedad</strong>
                      <p>Meses transcurridos desde la fecha de ingreso del empleado.</p>
                    </div>

                    <div>
                      <strong>Estado activo</strong>
                      <p>Indica si el empleado sigue activo dentro del sistema.</p>
                    </div>

                    <div>
                      <strong>Días disponibles</strong>
                      <p>Días de vacaciones disponibles asociados al empleado.</p>
                    </div>

                    <div>
                      <strong>Rol</strong>
                      <p>Perfil dentro del sistema: empleado, administrador u otro.</p>
                    </div>

                    <div>
                      <strong>Score de riesgo</strong>
                      <p>Puntuación calculada a partir de reglas de negocio.</p>
                    </div>

                    <div>
                      <strong>Ausencias estimadas</strong>
                      <p>Variable numérica usada para análisis predictivo.</p>
                    </div>
                  </div>
                </article>
              </section>

              <section className="ml-workflow-grid">
                <article>
                  <span>01</span>
                  <h3>Extracción</h3>
                  <p>Se obtienen empleados reales desde la base de datos transaccional.</p>
                </article>

                <article>
                  <span>02</span>
                  <h3>Limpieza</h3>
                  <p>Se excluyen cuentas generales del sistema para no contaminar el dataset.</p>
                </article>

                <article>
                  <span>03</span>
                  <h3>Transformación</h3>
                  <p>Se calculan antigüedad, score, riesgo real y ausencias estimadas.</p>
                </article>

                <article>
                  <span>04</span>
                  <h3>Predicción</h3>
                  <p>El modelo clasifica cada empleado y asigna probabilidad de riesgo.</p>
                </article>

                <article>
                  <span>05</span>
                  <h3>Evaluación</h3>
                  <p>Se calculan Accuracy, MAE y MSE para interpretar el desempeño.</p>
                </article>

                <article>
                  <span>06</span>
                  <h3>Uso RH</h3>
                  <p>Se generan recomendaciones preventivas para apoyar decisiones.</p>
                </article>
              </section>

              <section className="ml-metrics-explain-grid">
                <article className="ml-panel">
                  <span className="ml-section-tag">Accuracy</span>
                  <h3>{formatNumber(evaluacion?.accuracy, 2)}%</h3>
                  <p>
                    Mide qué porcentaje de clasificaciones fueron correctas. Un valor alto
                    indica que el modelo coincide con la clasificación esperada.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">MAE</span>
                  <h3>{formatNumber(evaluacion?.mae, 4)}</h3>
                  <p>
                    Error absoluto medio. Indica en promedio cuánto se equivoca el modelo
                    en la estimación numérica.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">MSE</span>
                  <h3>{formatNumber(evaluacion?.mse, 4)}</h3>
                  <p>
                    Error cuadrático medio. Penaliza más los errores grandes, por eso ayuda
                    a detectar desviaciones importantes.
                  </p>
                </article>
              </section>

              <section className="ml-responsible-section">
                <article className="ml-panel">
                  <span className="ml-section-tag">Uso responsable</span>
                  <h3>Limitaciones y consideraciones</h3>
                  <p>
                    El resultado del modelo debe interpretarse como apoyo para RRHH, no como
                    una decisión automática. Antes de tomar acciones, se debe revisar contexto,
                    historial, incidencias reales y comunicación con el empleado.
                  </p>

                  <div className="ml-chip-list">
                    <span>No sanciona automáticamente</span>
                    <span>Requiere interpretación humana</span>
                    <span>Depende de calidad de datos</span>
                    <span>Debe actualizarse periódicamente</span>
                  </div>
                </article>
              </section>
            </>
          )}
        </>
      )}

      {selectedEmployee && (
        <div className="ml-modal-backdrop" onClick={() => setSelectedEmployee(null)}>
          <div className="ml-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ml-modal-header">
              <div>
                <span>Detalle de predicción</span>
                <h2>{selectedEmployee.nombre_completo}</h2>
                <p>{selectedEmployee.correo}</p>
              </div>

              <button type="button" onClick={() => setSelectedEmployee(null)}>
                ×
              </button>
            </div>

            <div className="ml-modal-grid">
              <div>
                <span>Riesgo predicho</span>
                <strong>{getRiskLabel(selectedEmployee.riesgo_predicho)}</strong>
              </div>

              <div>
                <span>Probabilidad</span>
                <strong>{selectedEmployee.probabilidad}%</strong>
              </div>

              <div>
                <span>Ausencias estimadas</span>
                <strong>{selectedEmployee.ausencias_estimadas}</strong>
              </div>

              <div>
                <span>Score de riesgo</span>
                <strong>{selectedEmployee.score_riesgo}</strong>
              </div>

              <div>
                <span>Antigüedad</span>
                <strong>{selectedEmployee.antiguedad_meses} meses</strong>
              </div>

              <div>
                <span>Vacaciones disponibles</span>
                <strong>{selectedEmployee.dias_vacaciones_disponibles} días</strong>
              </div>
            </div>

            <div className="ml-modal-recommendation">
              <span>Recomendación RH</span>
              <p>{selectedEmployee.recomendacion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 