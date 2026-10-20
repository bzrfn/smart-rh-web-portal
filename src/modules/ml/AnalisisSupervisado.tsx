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
import AnalyticsModuleNav from '../../components/AnalyticsModuleNav';

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

function isPersonnelRecord(item: PrediccionML) {
  const name = String(item.nombre_completo || '').trim().toLowerCase();
  const email = String(item.correo || '').trim().toLowerCase();

  return !(
    name.includes('cuenta eliminada') ||
    email.includes('@deleted.smart-rh.invalid') ||
    email.includes('@deleted.')
  );
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
  const [pageSize, setPageSize] = useState(5);
  const [selectedEmployee, setSelectedEmployee] = useState<PrediccionML | null>(null);

  const personnelPredictions = useMemo(
    () => predicciones.filter(isPersonnelRecord),
    [predicciones]
  );

  const totalEmpleados = personnelPredictions.length;

  const riskTotals = useMemo(
    () => ({
      bajo: personnelPredictions.filter((item) => item.riesgo_predicho === 'BAJO').length,
      medio: personnelPredictions.filter((item) => item.riesgo_predicho === 'MEDIO').length,
      alto: personnelPredictions.filter((item) => item.riesgo_predicho === 'ALTO').length,
    }),
    [personnelPredictions]
  );

  const porcentajes = useMemo(() => {
    if (totalEmpleados === 0) {
      return { bajo: 0, medio: 0, alto: 0 };
    }

    return {
      bajo: Math.round((riskTotals.bajo / totalEmpleados) * 100),
      medio: Math.round((riskTotals.medio / totalEmpleados) * 100),
      alto: Math.round((riskTotals.alto / totalEmpleados) * 100),
    };
  }, [riskTotals, totalEmpleados]);

  const rolesDisponibles = useMemo(() => {
    const roles = new Set(personnelPredictions.map((item) => item.rol).filter(Boolean));
    return ['TODOS', ...Array.from(roles)];
  }, [personnelPredictions]);

  const empleadosActivos = useMemo(() => {
    return personnelPredictions.filter((item) => Number(item.activo) === 1).length;
  }, [personnelPredictions]);

  const empleadosInactivos = useMemo(() => {
    return personnelPredictions.filter((item) => Number(item.activo) === 0).length;
  }, [personnelPredictions]);

  const promedioAusencias = useMemo(() => {
    if (!personnelPredictions.length) return 0;

    const total = personnelPredictions.reduce(
      (acc, item) => acc + Number(item.ausencias_estimadas || 0),
      0
    );

    return total / personnelPredictions.length;
  }, [personnelPredictions]);

  const topRiesgo = useMemo(() => {
    return [...personnelPredictions]
      .sort((a, b) => Number(b.probabilidad) - Number(a.probabilidad))
      .slice(0, 5);
  }, [personnelPredictions]);

  const empleadosSeguimiento = useMemo(() => {
    return personnelPredictions.filter(
      (item) =>
        item.riesgo_predicho === 'MEDIO' ||
        item.riesgo_predicho === 'ALTO' ||
        Number(item.probabilidad) >= 60
    ).length;
  }, [personnelPredictions]);

  const riskChartData = useMemo(() => {
    return [
      {
        name: 'Bajo',
        key: 'BAJO' as Riesgo,
        value: riskTotals.bajo,
      },
      {
        name: 'Medio',
        key: 'MEDIO' as Riesgo,
        value: riskTotals.medio,
      },
      {
        name: 'Alto',
        key: 'ALTO' as Riesgo,
        value: riskTotals.alto,
      },
    ];
  }, [riskTotals]);

  const topChartData = useMemo(() => {
    return [...personnelPredictions]
      .sort((a, b) => Number(b.probabilidad) - Number(a.probabilidad))
      .slice(0, 8)
      .map((item) => ({
        empleado: shortName(item.nombre_completo, 16),
        probabilidad: Number(item.probabilidad || 0),
        ausencias: Number(item.ausencias_estimadas || 0),
        riesgo: item.riesgo_predicho,
      }));
  }, [personnelPredictions]);

  const scatterData = useMemo(() => {
    return personnelPredictions.map((item) => ({
      x: Number(item.probabilidad || 0),
      y: Number(item.ausencias_estimadas || 0),
      z: Number(item.score_riesgo || 0),
      nombre: item.nombre_completo,
      riesgo: item.riesgo_predicho,
    }));
  }, [personnelPredictions]);

  const scoreVacationScatterData = useMemo(() => {
    return personnelPredictions.map((item) => ({
      x: Number(item.dias_vacaciones_disponibles || 0),
      y: Number(item.score_riesgo || 0),
      z: Number(item.probabilidad || 0),
      nombre: item.nombre_completo,
      riesgo: item.riesgo_predicho,
    }));
  }, [personnelPredictions]);

  const riskByRoleData = useMemo(() => {
    const map = new Map<string, { rol: string; BAJO: number; MEDIO: number; ALTO: number }>();

    personnelPredictions.forEach((item) => {
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
  }, [personnelPredictions]);

  const probabilityBandsData = useMemo(() => {
    return PROBABILITY_BANDS.map((band) => ({
      rango: band.label,
      empleados: personnelPredictions.filter((item) => {
        const prob = Number(item.probabilidad || 0);
        return prob >= band.min && prob <= band.max;
      }).length,
    }));
  }, [personnelPredictions]);

  const activeStatusData = useMemo(() => {
    return [
      { estado: 'Activos', empleados: empleadosActivos },
      { estado: 'Inactivos', empleados: empleadosInactivos },
    ];
  }, [empleadosActivos, empleadosInactivos]);

  const modelMetricData = useMemo(() => {
    return [
      {
        metrica: 'Aciertos',
        valor: Number(evaluacion?.accuracy || 0),
      },
      {
        metrica: 'Error promedio',
        valor: Number(evaluacion?.mae || 0) * 100,
      },
      {
        metrica: 'Errores grandes',
        valor: Number(evaluacion?.mse || 0) * 100,
      },
    ];
  }, [evaluacion]);

  const insights = useMemo(() => {
    const riesgoMedio = riskTotals.medio;
    const riesgoAlto = riskTotals.alto;
    const riesgoBajo = riskTotals.bajo;
    const total = totalEmpleados;
    const porcentajeBajo = total ? Math.round((riesgoBajo / total) * 100) : 0;
    const mayor = topRiesgo[0];

    return [
      {
        title: 'Panorama general',
        text: `El ${porcentajeBajo}% del personal se encuentra en nivel bajo, lo que indica una situación general estable.`,
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
  }, [riskTotals, totalEmpleados, topRiesgo, promedioAusencias]);

  const filteredPredicciones = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = personnelPredictions.filter((item) => {
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
  }, [personnelPredictions, search, riskFilter, activeFilter, roleFilter, sortBy]);

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
        setError(data?.message || 'No se pudieron cargar las predicciones.');
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
        setError(data?.message || 'No se pudo actualizar el análisis.');
        return;
      }

      setResumen(data.resumen || null);
      setEvaluacion(data.evaluacion || null);
      setPredicciones(data.predicciones || []);
      setSuccess(data.message || 'El análisis se actualizó correctamente.');

      setLastUpdated(
        new Date().toLocaleString('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Ocurrió un error al actualizar el análisis.');
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

    const datosAExportar = tipo === 'todo' ? personnelPredictions : filteredPredicciones;

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
      <AnalyticsModuleNav />

      <section className="ml-hero ml-hero-pro">
        <div className="ml-hero-copy-pro">
          <p className="ml-eyebrow">Prevención y seguimiento</p>
          <h1>Predicciones de personal</h1>

          <p>
            Identifica señales que pueden requerir seguimiento de Recursos Humanos y consulta
            una estimación de ausencias. Los resultados orientan la revisión; no sustituyen
            la evaluación de una persona responsable.
          </p>

          <div className="ml-hero-actions">
            <button type="button" onClick={ejecutarModelo} disabled={training}>
              {training ? 'Analizando información…' : 'Actualizar análisis'}
            </button>

            <button type="button" className="secondary" onClick={cargarPredicciones}>
              Consultar resultados
            </button>
          </div>

          {error && <div className="ml-message error">{error}</div>}
          {success && <div className="ml-message success">{success}</div>}
        </div>

        <div className="ml-model-card ml-model-card-pro">
          <span>Estado del análisis</span>
          <strong>{resumen ? 'Resultados vigentes' : 'Sin ejecución reciente'}</strong>
          <p>Información preventiva disponible para la revisión de Recursos Humanos.</p>

          <div className="ml-model-meta">
            <div>
              <small>Personas consideradas</small>
              <b>{totalEmpleados} empleados</b>
            </div>

            <div>
              <small>Requieren seguimiento</small>
              <b>{empleadosSeguimiento} casos</b>
            </div>

            <div>
              <small>Última ejecución</small>
              <b>{lastUpdated || 'Pendiente'}</b>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="ml-loading-card">
          <strong>Cargando análisis...</strong>
          <p>Consultando la información necesaria para mostrar las predicciones.</p>
        </div>
      ) : (
        <>
          <section className="ml-tabs" role="tablist" aria-label="Vistas de predicciones">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'resumen'}
              className={activeTab === 'resumen' ? 'active' : ''}
              onClick={() => setActiveTab('resumen')}
            >
              Panorama
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'graficas'}
              className={activeTab === 'graficas' ? 'active' : ''}
              onClick={() => setActiveTab('graficas')}
            >
              Gráficas
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'empleados'}
              className={activeTab === 'empleados' ? 'active' : ''}
              onClick={() => setActiveTab('empleados')}
            >
              Personas
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'modelo'}
              className={activeTab === 'modelo' ? 'active' : ''}
              onClick={() => setActiveTab('modelo')}
            >
              Cómo se calcula
            </button>
          </section>

          {activeTab === 'resumen' && (
            <>
              <section className="ml-overview-strip" aria-label="Resumen preventivo">
                <article className="ml-overview-stat">
                  <span>Personal revisado</span>
                  <strong>{totalEmpleados}</strong>
                  <p>Personas incluidas en el análisis actual.</p>
                </article>
                <article className="ml-overview-stat is-warning">
                  <span>Seguimiento preventivo</span>
                  <strong>{riskTotals.medio}</strong>
                  <p>Casos que conviene revisar durante el periodo.</p>
                </article>
                <article className="ml-overview-stat is-danger">
                  <span>Atención prioritaria</span>
                  <strong>{riskTotals.alto}</strong>
                  <p>Casos con señales que requieren revisión pronta.</p>
                </article>
                <article className="ml-overview-stat">
                  <span>Ausencias estimadas</span>
                  <strong>{formatNumber(promedioAusencias, 2)}</strong>
                  <p>Promedio estimado por persona para el periodo.</p>
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
                        <span>{riskTotals.bajo} personas</span>
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
                        <span>{riskTotals.medio} personas</span>
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
                        <span>{riskTotals.alto} personas</span>
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

                    {!topRiesgo.length && (
                      <div className="ml-empty ml-empty-compact">
                        Aún no hay resultados disponibles para priorizar una revisión.
                      </div>
                    )}
                  </div>
                </article>
              </section>

              <section className="ml-decision-notes">
                <article className="ml-panel ml-brief-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Lectura del periodo</span>
                      <h2>Qué significa el resultado</h2>
                    </div>
                  </div>

                  <div className="ml-insight-list">
                    {insights.slice(0, 3).map((item) => (
                      <div key={item.title} className="ml-insight-item">
                        <span aria-hidden="true" />
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="ml-panel ml-action-card-pro">
                  <div className="ml-panel-header">
                    <div>
                      <span>Siguiente paso</span>
                      <h2>Qué hacer ahora</h2>
                    </div>
                  </div>

                  <div className="ml-action-list-pro">
                    <div><b>01</b><span>Abre los casos de atención prioritaria y valida su contexto.</span></div>
                    <div><b>02</b><span>Revisa asistencia, vacaciones y situación laboral antes de actuar.</span></div>
                    <div><b>03</b><span>Documenta el seguimiento; la predicción nunca aplica una sanción.</span></div>
                  </div>
                </article>
              </section>
            </>
          )}

          {activeTab === 'graficas' && (
            <>
              <section className="ml-graph-intro">
                <div>
                  <span className="ml-section-tag">Comparaciones visuales</span>
                  <h2>Entiende las predicciones con gráficas</h2>
                  <p>
                    Cada gráfica explica qué información compara y para qué puede ayudarte.
                    Úsalas para localizar personas o situaciones que conviene revisar.
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
                      <span>Revisión prioritaria</span>
                      <h2>Personas con mayor probabilidad</h2>
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
                      <span>Niveles de probabilidad</span>
                      <h2>Personas por rango de probabilidad</h2>
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
                      Agrupa al personal según su probabilidad estimada. Ayuda a saber si la
                      atención se concentra en pocas personas o se distribuye entre varias.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Comparación por acceso</span>
                      <h2>Nivel preventivo según el tipo de cuenta</h2>
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
                      Compara los niveles preventivos según el tipo de acceso. Permite revisar
                      si alguna clase de cuenta concentra más casos que requieren seguimiento.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card ml-chart-wide">
                  <div className="ml-panel-header">
                    <div>
                      <span>Comparación de resultados</span>
                      <h2>Probabilidad y ausencias previstas</h2>
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
                      Cada punto representa una persona. Los puntos ubicados más arriba y a la
                      derecha combinan una probabilidad mayor con más ausencias previstas.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card ml-chart-wide">
                  <div className="ml-panel-header">
                    <div>
                      <span>Vacaciones y prevención</span>
                      <h2>Días disponibles y nivel preventivo</h2>
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
                      Permite observar si las personas con pocos días disponibles también
                      muestran un nivel preventivo mayor. Úsalo para revisar descanso y carga de trabajo.
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
                      Separa empleados activos e inactivos. Los registros inactivos pueden
                      aumentar el nivel preventivo y deben revisarse antes de tomar una decisión.
                    </p>
                  </div>
                </article>

                <article className="ml-panel ml-chart-card">
                  <div className="ml-panel-header">
                    <div>
                      <span>Confiabilidad del resultado</span>
                      <h2>Aciertos y margen de diferencia</h2>
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
                      Muestra cuántas clasificaciones coincidieron y cuánto se alejaron las
                      estimaciones. Más aciertos y menos diferencia indican un resultado más estable.
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
                  <span>Consulta individual</span>
                  <h2>Resultados por persona</h2>
                </div>

                <div className="ml-table-head-actions">
                  <small>
                    {filteredPredicciones.length} de {personnelPredictions.length} personas
                  </small>
                  <button type="button" onClick={() => exportarCSV('todo')}>
                    Descargar todos
                  </button>
                  <button type="button" className="secondary" onClick={() => exportarCSV('filtrado')}>
                    Descargar vista
                  </button>
                </div>
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
                  <option value="score_desc">Mayor puntuación preventiva</option>
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
                      <th>Puntuación preventiva</th>
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
                <span className="ml-section-tag">Transparencia del análisis</span>
                <h2>Cómo se obtienen las predicciones</h2>
                <p>
                  Esta sección explica qué información se considera, cómo se genera el resultado
                  y cuáles son sus límites. Así puedes interpretar cada predicción antes de tomar
                  una decisión de Recursos Humanos.
                </p>
              </section>

              <section className="ml-model-grid-pro">
                <article className="ml-panel">
                  <span className="ml-section-tag">Resultado principal</span>
                  <h3>Qué calcula</h3>
                  <p>
                    El sistema estima qué personas podrían requerir seguimiento y cuántas
                    ausencias podrían presentarse. El resultado se muestra como nivel bajo,
                    medio o alto.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Información anterior</span>
                  <h3>Aprende de registros previos</h3>
                  <p>
                    El cálculo toma como referencia registros anteriores para reconocer
                    situaciones parecidas en la información actual.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Comparación</span>
                  <h3>Busca casos similares</h3>
                  <p>
                    Cada persona se compara con registros de características similares. Esa
                    comparación ayuda a asignar un nivel bajo, medio o alto.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Estimación</span>
                  <h3>Calcula ausencias posibles</h3>
                  <p>
                    La estimación considera la puntuación preventiva, la antigüedad y los días
                    disponibles para presentar una cantidad aproximada de ausencias.
                  </p>
                </article>
              </section>

              <section className="ml-variable-section">
                <article className="ml-panel">
                  <div className="ml-panel-header">
                    <div>
                      <span>Información considerada</span>
                      <h2>Datos que influyen en el resultado</h2>
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
                      <strong>Puntuación preventiva</strong>
                      <p>Valor que reúne distintas señales disponibles en el sistema.</p>
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
                  <h3>Reunir</h3>
                  <p>Se consulta la información disponible de las personas registradas.</p>
                </article>

                <article>
                  <span>02</span>
                  <h3>Depurar</h3>
                  <p>Se excluyen cuentas eliminadas o generales que no representan personal activo.</p>
                </article>

                <article>
                  <span>03</span>
                  <h3>Preparar</h3>
                  <p>Se ordenan antigüedad, vacaciones y señales preventivas.</p>
                </article>

                <article>
                  <span>04</span>
                  <h3>Calcular</h3>
                  <p>Se asigna un nivel y una probabilidad estimada para cada persona.</p>
                </article>

                <article>
                  <span>05</span>
                  <h3>Comprobar</h3>
                  <p>Se revisa cuántos resultados coinciden y qué tan grandes son las diferencias.</p>
                </article>

                <article>
                  <span>06</span>
                  <h3>Revisar</h3>
                  <p>Recursos Humanos valida el contexto antes de tomar cualquier decisión.</p>
                </article>
              </section>

              <section className="ml-metrics-explain-grid">
                <article className="ml-panel">
                  <span className="ml-section-tag">Aciertos del análisis</span>
                  <h3>{formatNumber(evaluacion?.accuracy, 2)}%</h3>
                  <p>
                    Indica qué porcentaje de resultados coincidió con la clasificación esperada.
                    Un porcentaje mayor representa más coincidencias.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Diferencia promedio</span>
                  <h3>{formatNumber(evaluacion?.mae, 4)}</h3>
                  <p>
                    Indica cuánto se alejan, en promedio, las estimaciones del valor esperado.
                    Un número menor es preferible.
                  </p>
                </article>

                <article className="ml-panel">
                  <span className="ml-section-tag">Diferencias importantes</span>
                  <h3>{formatNumber(evaluacion?.mse, 4)}</h3>
                  <p>
                    Da mayor peso a las diferencias grandes. Sirve para detectar cuando una
                    estimación se aleja demasiado de lo esperado.
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
                  <span>Puntuación preventiva</span>
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
