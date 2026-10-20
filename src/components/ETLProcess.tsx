/*
  Componente: ETLProcess
  Propósito: Ejecutar y mostrar un reporte ETL (usuarios, nómina, vacaciones)
  Notas: Este archivo contiene presentaciones visuales (gráficas) y texto
  interpretativo generado a partir del resultado del hook `useETL`.
*/
import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ComposedChart,
} from 'recharts';
import { useETL } from '../hooks/useETL';
import AnalyticsModuleNav from './AnalyticsModuleNav';
import './ETLProcess.css';

const COLORS = ['#38bdf8', '#2dd4bf', '#0a57a4', '#f59e0b', '#ef4444', '#7dd3fc'];

type ETLTab = 'resumen' | 'estadisticas' | 'analisis' | 'graficas';

function formatCurrency(value: number) {
  // Formatea números como moneda mexicana (MXN)
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value: number) {
  // Formatea números según la localización española (México) sin decimales forzados
  return new Intl.NumberFormat('es-MX').format(value || 0);
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha';

  try {
    // Intenta convertir una cadena a una fecha legible según la localización
    return new Date(value).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

export function ETLProcess() {
  // Obtiene funciones y estado del hook personalizado `useETL`
  const { ejecutarETL, loading, result: report, error } = useETL();
  const [activeTab, setActiveTab] = useState<ETLTab>('resumen');

  const handleETL = async () => {
    await ejecutarETL();
    setActiveTab('resumen');
  };

  const usuariosActividadData = useMemo(() => {
    if (!report) return [];

    return [
      { name: 'Activos', value: report.usuarios.activos },
      { name: 'Inactivos', value: report.usuarios.inactivos },
      { name: 'Con foto', value: report.usuarios.conFoto },
      { name: 'Sin foto', value: report.usuarios.sinFoto },
    ];
  }, [report]);

  const volumenFuentesData = useMemo(() => {
    if (!report) return [];

    return [
      { name: 'Usuarios', registros: report.resumen.totalUsuarios },
      { name: 'Nómina', registros: report.resumen.totalNominas },
      { name: 'Vacaciones', registros: report.resumen.totalSolicitudesVacaciones },
    ];
  }, [report]);

  const nominaComparativaData = useMemo(() => {
    if (!report) return [];

    return [
      {
        name: 'Salario base',
        value: report.nomina.totalSalarioBase,
      },
      {
        name: 'Bonos',
        value: report.nomina.totalBonos,
      },
      {
        name: 'Deducciones',
        value: report.nomina.totalDeducciones,
      },
      {
        name: 'Total pagado',
        value: report.resumen.totalPagadoNomina,
      },
    ];
  }, [report]);

  const eficienciaNominaData = useMemo(() => {
    if (!report) return [];

    return [
      {
        indicador: 'Base',
        valor: report.nomina.totalSalarioBase || 0,
      },
      {
        indicador: 'Bonos',
        valor: report.nomina.totalBonos || 0,
      },
      {
        indicador: 'Deducciones',
        valor: report.nomina.totalDeducciones || 0,
      },
      {
        indicador: 'Neto',
        valor: report.resumen.totalPagadoNomina || 0,
      },
    ];
  }, [report]);

  const vacacionesBalanceData = useMemo(() => {
    if (!report) return [];

    return [
      {
        name: 'Solicitados',
        value: report.resumen.totalDiasSolicitados,
      },
      {
        name: 'Promedio solicitado',
        value: Number(report.vacaciones.promedioDiasSolicitados.toFixed(1)),
      },
      {
        name: 'Pendientes',
        value: report.vacaciones.pendientes,
      },
      {
        name: 'Aprobadas',
        value: report.vacaciones.aprobadas,
      },
      {
        name: 'Rechazadas',
        value: report.vacaciones.rechazadas,
      },
    ];
  }, [report]);

  const radarData = useMemo(() => {
    if (!report) return [];

    return [
      {
        indicador: 'Usuarios',
        valor: report.resumen.totalUsuarios,
      },
      {
        indicador: 'Nóminas',
        valor: report.resumen.totalNominas,
      },
      {
        indicador: 'Vacaciones',
        valor: report.resumen.totalSolicitudesVacaciones,
      },
      {
        indicador: 'Pendientes',
        valor: report.resumen.vacacionesPendientes,
      },
      {
        indicador: 'Días solicitados',
        valor: report.resumen.totalDiasSolicitados,
      },
    ];
  }, [report]);

  const analisisEjecutivo = useMemo(() => {
    if (!report) return [];

    const usuarios = report.resumen.totalUsuarios || 0;
    const usuariosActivos = report.usuarios.activos || 0;
    const usuariosInactivos = report.usuarios.inactivos || 0;
    const usuariosSinFoto = report.usuarios.sinFoto || 0;
    const usuariosConFoto = report.usuarios.conFoto || 0;

    const totalNomina = report.resumen.totalPagadoNomina || 0;
    const totalSalarioBase = report.nomina.totalSalarioBase || 0;
    const totalBonos = report.nomina.totalBonos || 0;
    const totalDeducciones = report.nomina.totalDeducciones || 0;
    const promedioSalario = report.nomina.promedioSalarioBase || 0;

    const vacacionesTotal = report.resumen.totalSolicitudesVacaciones || 0;
    const vacacionesPendientes = report.vacaciones.pendientes || 0;
    const vacacionesAprobadas = report.vacaciones.aprobadas || 0;
    const vacacionesRechazadas = report.vacaciones.rechazadas || 0;
    const diasSolicitados = report.resumen.totalDiasSolicitados || 0;
    const promedioDias = report.vacaciones.promedioDiasSolicitados || 0;

    const porcentajeActivos = usuarios > 0 ? (usuariosActivos / usuarios) * 100 : 0;
    const porcentajePerfilCompleto = usuarios > 0 ? (usuariosConFoto / usuarios) * 100 : 0;
    const porcentajePendientes = vacacionesTotal > 0 ? (vacacionesPendientes / vacacionesTotal) * 100 : 0;
    const pesoDeducciones = totalSalarioBase > 0 ? (totalDeducciones / totalSalarioBase) * 100 : 0;
    const pesoBonos = totalSalarioBase > 0 ? (totalBonos / totalSalarioBase) * 100 : 0;

    // Genera un conjunto de observaciones textuales interpretativas
    // que sirven para presentar un análisis ejecutivo dentro del UI.
    return [
      {
        categoria: 'Capital humano',
        titulo: 'Cobertura operativa del personal',
        nivel: porcentajeActivos >= 90 ? 'Estable' : porcentajeActivos >= 70 ? 'Atención' : 'Crítico',
        descripcion:
          `Hay ${usuarios} usuario(s) registrados y ${usuariosActivos} activo(s), equivalentes al ${porcentajeActivos.toFixed(1)}% del total. ` +
          `Este dato muestra cuántas personas pueden usar asistencia, documentos, pagos y vacaciones.`,
        impacto:
          usuariosInactivos > 0
            ? `Hay ${usuariosInactivos} usuario(s) inactivo(s). Revisa si son bajas de personal o cuentas que ya no deben tener acceso.`
            : 'No hay usuarios inactivos pendientes de revisión.',
        decision:
          usuariosInactivos > 0
            ? 'Revisar si los usuarios inactivos deben conservarse como historial o bloquearse definitivamente.'
            : 'Mantener control periódico de altas y bajas para evitar cuentas innecesarias.',
      },
      {
        categoria: 'Expediente digital',
        titulo: 'Calidad de identificación del personal',
        nivel: porcentajePerfilCompleto >= 90 ? 'Estable' : porcentajePerfilCompleto >= 60 ? 'Atención' : 'Crítico',
        descripcion:
          `El ${porcentajePerfilCompleto.toFixed(1)}% de los perfiles tiene foto: ${usuariosConFoto} con foto y ${usuariosSinFoto} sin foto. ` +
          `La foto ayuda a identificar al personal en su perfil, credencial y documentos.`,
        impacto:
          usuariosSinFoto > 0
            ? `Los ${usuariosSinFoto} perfil(es) sin foto reducen la calidad del expediente digital y pueden afectar la presentación profesional del sistema.`
            : 'Todos los usuarios cuentan con foto de perfil y pueden identificarse correctamente.',
        decision:
          usuariosSinFoto > 0
            ? 'Completar perfiles faltantes antes de generar reportes formales o credenciales digitales.'
            : 'Conservar este estándar como requisito para nuevos registros de usuario.',
      },
      {
        categoria: 'Nómina',
        titulo: 'Lectura económica de pagos',
        nivel: totalNomina > 0 ? 'Estable' : 'Atención',
        descripcion:
          `Los pagos incluidos suman ${formatCurrency(totalNomina)}, con ${formatCurrency(totalSalarioBase)} de salario base ` +
          `y un promedio de ${formatCurrency(promedioSalario)} por persona.`,
        impacto:
          `Los bonos representan aproximadamente ${pesoBonos.toFixed(1)}% del salario base, mientras que las deducciones representan ${pesoDeducciones.toFixed(1)}%. ` +
          `Esta comparación ayuda a entender si el pago neto está siendo impulsado por compensaciones o reducido por descuentos.`,
        decision:
          totalDeducciones > totalBonos
            ? 'Validar las deducciones, ya que superan los bonos y podrían tener mayor impacto en la percepción final del empleado.'
            : 'Revisar si los bonos corresponden a políticas internas, incentivos o pagos extraordinarios.',
      },
      {
        categoria: 'Compensaciones',
        titulo: 'Relación entre bonos y deducciones',
        nivel: totalDeducciones > totalBonos ? 'Atención' : 'Estable',
        descripcion:
          `Se identifican ${formatCurrency(totalBonos)} en bonos y ${formatCurrency(totalDeducciones)} en deducciones. ` +
          `La diferencia entre ambos conceptos permite evaluar si la nómina tiene una tendencia positiva por compensaciones o una carga mayor por descuentos.`,
        impacto:
          totalDeducciones > totalBonos
            ? `Las deducciones superan a los bonos por ${formatCurrency(totalDeducciones - totalBonos)}. Esto puede afectar la percepción del pago neto y debe revisarse por consistencia.`
            : `Los bonos superan a las deducciones por ${formatCurrency(totalBonos - totalDeducciones)}. Esto puede reflejar incentivos o beneficios adicionales al personal.`,
        decision:
          'Comparar estos valores contra políticas internas de nómina para validar si el comportamiento es esperado.',
      },
      {
        categoria: 'Vacaciones',
        titulo: 'Carga administrativa de ausencias',
        nivel: vacacionesPendientes > 0 ? 'Atención' : 'Estable',
        descripcion:
          `Hay ${vacacionesTotal} solicitud(es) de vacaciones: ${vacacionesPendientes} pendiente(s), ${vacacionesAprobadas} aprobada(s) y ${vacacionesRechazadas} rechazada(s). ` +
          `El ${porcentajePendientes.toFixed(1)}% todavía necesita una respuesta.`,
        impacto:
          vacacionesPendientes > 0
            ? 'Las solicitudes pendientes pueden generar retrasos en la planeación operativa, especialmente si el periodo solicitado está próximo.'
            : 'No existen solicitudes pendientes, por lo que el flujo de aprobación se encuentra al día.',
        decision:
          vacacionesPendientes > 0
            ? 'Priorizar revisión de solicitudes pendientes para evitar acumulación y mejorar el tiempo de respuesta.'
            : 'Mantener el seguimiento del módulo para conservar bajo el tiempo de respuesta.',
      },
      {
        categoria: 'Planeación operativa',
        titulo: 'Impacto de días solicitados',
        nivel: promedioDias >= 5 ? 'Atención' : 'Estable',
        descripcion:
          `El total de días solicitados es de ${diasSolicitados}, con un promedio de ${promedioDias.toFixed(1)} día(s) por solicitud. ` +
          `Este indicador ayuda a estimar el impacto de ausencias sobre la operación diaria y la continuidad del área.`,
        impacto:
          promedioDias >= 5
            ? 'El promedio solicitado es considerable, por lo que conviene revisar si las fechas se empalman con actividades críticas o periodos de alta carga laboral.'
            : 'El promedio de días solicitados es moderado, por lo que el impacto operativo puede controlarse con planeación básica.',
        decision:
          'Cruzar vacaciones con asistencia y calendario operativo para anticipar posibles ausencias críticas.',
      },
      {
        categoria: 'Información disponible',
        titulo: 'Una sola lectura para tomar decisiones',
        nivel: 'Informativo',
        descripcion:
          'Esta herramienta reúne usuarios, nómina y vacaciones en un mismo resumen. Así puedes revisar el estado de Recursos Humanos sin abrir cada módulo por separado.',
        impacto:
          'El último resumen permanece disponible y puedes actualizarlo cuando existan movimientos nuevos.',
        decision:
          'Actualiza el resumen después de cambios importantes y revisa primero los apartados marcados para atención.',
      },
    ];
  }, [report]);

  const recomendaciones = useMemo(() => {
    if (!report) return [];

    const usuariosSinFoto = report.usuarios.sinFoto || 0;
    const vacacionesPendientes = report.vacaciones.pendientes || 0;
    const totalDeducciones = report.nomina.totalDeducciones || 0;
    const totalBonos = report.nomina.totalBonos || 0;
    const totalNomina = report.resumen.totalPagadoNomina || 0;
    const totalUsuarios = report.resumen.totalUsuarios || 0;
    const promedioDias = report.vacaciones.promedioDiasSolicitados || 0;

    // Lista de recomendaciones priorizadas derivadas del reporte
    return [
      {
        prioridad: 'Alta',
        area: 'Vacaciones',
        accion:
          vacacionesPendientes > 0
            ? 'Atender las solicitudes pendientes antes de que se acumulen o generen conflictos de disponibilidad.'
            : 'Mantener el flujo de aprobación sin acumulación de solicitudes.',
        beneficio:
          'Reduce retrasos administrativos y mejora la planeación de ausencias del personal.',
      },
      {
        prioridad: usuariosSinFoto > 0 ? 'Media' : 'Baja',
        area: 'Expediente digital',
        accion:
          usuariosSinFoto > 0
            ? 'Solicitar o cargar las fotos faltantes en los perfiles de usuario.'
            : 'Mantener la foto de perfil como requisito para nuevos registros.',
        beneficio:
          'Mejora la calidad de credenciales, documentos laborales y validación visual del empleado.',
      },
      {
        prioridad: totalDeducciones > totalBonos ? 'Alta' : 'Media',
        area: 'Nómina',
        accion:
          totalDeducciones > totalBonos
            ? 'Revisar el origen de las deducciones, ya que actualmente superan el total de bonos.'
            : 'Monitorear periódicamente la relación entre bonos, deducciones y salario base.',
        beneficio:
          'Permite detectar inconsistencias económicas y explicar mejor el pago neto registrado.',
      },
      {
        prioridad: 'Media',
        area: 'Resumen general',
        accion:
          'Actualizar el resumen después de altas de usuarios, cambios de nómina o nuevas solicitudes de vacaciones.',
        beneficio:
          'Mantiene reportes vigentes sin depender de consultas manuales o archivos separados.',
      },
      {
        prioridad: totalNomina > 0 && totalUsuarios > 0 ? 'Media' : 'Baja',
        area: 'Planeación financiera',
        accion:
          'Comparar el total de nómina contra el número de usuarios activos para evaluar el costo promedio operativo.',
        beneficio:
          'Ayuda a dimensionar el gasto de personal y justificar decisiones administrativas.',
      },
      {
        prioridad: promedioDias >= 5 ? 'Media' : 'Baja',
        area: 'Continuidad operativa',
        accion:
          promedioDias >= 5
            ? 'Revisar solicitudes largas de vacaciones contra actividades críticas del área.'
            : 'Mantener seguimiento básico de solicitudes para evitar empalmes futuros.',
        beneficio:
          'Permite anticipar ausencias y reducir riesgos de operación durante periodos sensibles.',
      },
    ];
  }, [report]);

  return (
    <div className="etl-page">
      <AnalyticsModuleNav />

      {/* Sección principal: explicación y acciones primarias del ETL */}
      <section className="etl-hero">
        <div className="etl-hero-content">
          <p className="etl-eyebrow">Resumen de información</p>

          <h2>Revisa la información importante en un solo lugar</h2>

          <p>
            Consulta un resumen de usuarios, nómina y vacaciones. Esta pantalla solo organiza
            la información para facilitar su revisión; no cambia ningún registro del sistema.
          </p>

          <div className="etl-actions">
            <button className="etl-button" onClick={handleETL} disabled={loading}>
              {loading ? 'Actualizando resumen...' : 'Actualizar resumen'}
            </button>

            {report && (
              <span className="etl-last-run">
                Última actualización: {formatDate(report.generatedAt)}
              </span>
            )}
          </div>

          {error && <p className="etl-error">{error}</p>}
        </div>

        <div className="etl-hero-badge">
          <span>Estado del resumen</span>
          <strong>{report ? 'Listo para consultar' : 'Aún no se ha generado'}</strong>
          <small>{report ? 'Incluye la información de la última actualización' : 'Selecciona “Actualizar resumen” para comenzar'}</small>
        </div>
      </section>

      {/* Estado vacío: cuando no existe un reporte aún */}
      {!report && (
        <section className="etl-empty-state">
          <div className="etl-empty-icon">01</div>
          <h3>Genera tu primer resumen</h3>
          <p>
            Selecciona “Actualizar resumen” para consultar la información vigente de usuarios,
            nómina y vacaciones. El resultado seguirá disponible cuando vuelvas a esta página.
          </p>
        </section>
      )}

      {report && (
        <>
          {/* Tarjeta de pestañas para navegar entre vistas del reporte */}
          <section className="etl-tabs-card">
            <div className="etl-tabs-header">
              <div>
                <p className="etl-eyebrow">Información disponible</p>
                <h3>Elige lo que necesitas revisar</h3>
              </div>

              <span className="etl-chip">Último resumen</span>
            </div>

            <div className="etl-tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'resumen'}
                className={`etl-tab-button ${activeTab === 'resumen' ? 'active' : ''}`}
                onClick={() => setActiveTab('resumen')}
              >
                <span>01</span>
                Panorama
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'estadisticas'}
                className={`etl-tab-button ${activeTab === 'estadisticas' ? 'active' : ''}`}
                onClick={() => setActiveTab('estadisticas')}
              >
                <span>02</span>
                Detalles
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'analisis'}
                className={`etl-tab-button ${activeTab === 'analisis' ? 'active' : ''}`}
                onClick={() => setActiveTab('analisis')}
              >
                <span>03</span>
                Qué revisar
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'graficas'}
                className={`etl-tab-button ${activeTab === 'graficas' ? 'active' : ''}`}
                onClick={() => setActiveTab('graficas')}
              >
                <span>04</span>
                Comparaciones
              </button>
            </div>
          </section>

          {/* Vista: Resumen KPI */}
          {activeTab === 'resumen' && (
            <section className="etl-kpi-grid etl-panel-animation">
              <div className="etl-kpi-card">
                <span>Usuarios registrados</span>
                <strong>{formatNumber(report.resumen.totalUsuarios)}</strong>
                <p>{formatNumber(report.resumen.usuariosActivos)} activos en el sistema.</p>
              </div>

              <div className="etl-kpi-card">
                <span>Nómina total</span>
                <strong>{formatCurrency(report.resumen.totalPagadoNomina)}</strong>
                <p>{formatNumber(report.resumen.totalNominas)} pagos incluidos.</p>
              </div>

              <div className="etl-kpi-card">
                <span>Vacaciones</span>
                <strong>{formatNumber(report.resumen.totalSolicitudesVacaciones)}</strong>
                <p>{formatNumber(report.resumen.vacacionesPendientes)} pendiente(s).</p>
              </div>

              <div className="etl-kpi-card">
                <span>Días solicitados</span>
                <strong>{formatNumber(report.resumen.totalDiasSolicitados)}</strong>
                <p>Promedio: {report.vacaciones.promedioDiasSolicitados.toFixed(1)} días.</p>
              </div>
            </section>
          )}

          {/* Vista: Estadísticas individuales */}
          {activeTab === 'estadisticas' && (
            <section className="etl-stats-grid etl-panel-animation">
              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Usuarios activos</span>
                  <strong>{formatNumber(report.usuarios.activos)}</strong>
                  <p>Usuarios disponibles para operar dentro del portal.</p>
                </div>
              </div>

              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Usuarios inactivos</span>
                  <strong>{formatNumber(report.usuarios.inactivos)}</strong>
                  <p>Registros que podrían requerir revisión administrativa.</p>
                </div>
              </div>

              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Perfiles con foto</span>
                  <strong>{formatNumber(report.usuarios.conFoto)}</strong>
                  <p>Usuarios con expediente visual más completo.</p>
                </div>
              </div>

              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Perfiles sin foto</span>
                  <strong>{formatNumber(report.usuarios.sinFoto)}</strong>
                  <p>Registros con expediente visual pendiente.</p>
                </div>
              </div>

              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Promedio salario base</span>
                  <strong>{formatCurrency(report.nomina.promedioSalarioBase)}</strong>
                  <p>Promedio calculado con los registros actuales de nómina.</p>
                </div>
              </div>

              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Total bonos</span>
                  <strong>{formatCurrency(report.nomina.totalBonos)}</strong>
                  <p>Bonificaciones acumuladas en los pagos incluidos.</p>
                </div>
              </div>

              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Total deducciones</span>
                  <strong>{formatCurrency(report.nomina.totalDeducciones)}</strong>
                  <p>Deducciones acumuladas en los pagos incluidos.</p>
                </div>
              </div>

              <div className="etl-stat-card">
                <div className="etl-stat-marker" aria-hidden="true" />
                <div>
                  <span>Vacaciones pendientes</span>
                  <strong>{formatNumber(report.vacaciones.pendientes)}</strong>
                  <p>Solicitudes que todavía requieren aprobación o rechazo.</p>
                </div>
              </div>
            </section>
          )}

          {/* Vista: Análisis ejecutivo y recomendaciones */}
          {activeTab === 'analisis' && (
            <section className="etl-analysis-layout etl-panel-animation">
              <div className="etl-analysis-main">
                <div className="etl-section-header etl-section-header-premium">
                  <div>
                    <p className="etl-eyebrow">Situación actual</p>
                    <h3>Qué significa la información</h3>
                    <p>
                      Una explicación sencilla de los datos más importantes y del seguimiento
                      recomendado para Recursos Humanos.
                    </p>
                  </div>

                  <span className="etl-chip">Explicación sencilla</span>
                </div>

                {/* Grid de tarjetas que muestran cada diagnóstico ejecutivo */}
                <div className="etl-diagnostic-grid">
                  {analisisEjecutivo.slice(0, 4).map((item, index) => (
                    <article className="etl-diagnostic-card" key={index}>
                      <div className="etl-diagnostic-top">
                        <span className="etl-diagnostic-number">{String(index + 1).padStart(2, '0')}</span>

                        <div>
                          <p className="etl-diagnostic-category">{item.categoria}</p>
                          <h4>{item.titulo}</h4>
                        </div>

                        <span
                          className={`etl-risk-pill ${
                            item.nivel === 'Crítico'
                              ? 'critical'
                              : item.nivel === 'Atención'
                                ? 'warning'
                                : item.nivel === 'Informativo'
                                  ? 'strategic'
                                  : 'stable'
                          }`}
                        >
                          {item.nivel}
                        </span>
                      </div>

                      <div className="etl-diagnostic-body">
                        <div>
                          <strong>Qué estás viendo</strong>
                          <p>{item.descripcion}</p>
                        </div>

                        <div>
                          <strong>Por qué importa</strong>
                          <p>{item.impacto}</p>
                        </div>

                        <div>
                          <strong>Qué hacer</strong>
                          <p>{item.decision}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Panel lateral con recomendaciones priorizadas */}
              <div className="etl-recommendation-panel">
                <div className="etl-section-header etl-section-header-premium">
                  <div>
                    <p className="etl-eyebrow">Siguientes pasos</p>
                    <h3>Qué conviene atender primero</h3>
                    <p>
                      Acciones concretas para mejorar control administrativo, calidad de datos
                      y seguimiento operativo.
                    </p>
                  </div>

                  <span className="etl-chip">Acciones sugeridas</span>
                </div>

                <div className="etl-action-list">
                  {recomendaciones.slice(0, 4).map((item, index) => (
                    <article className="etl-action-card" key={index}>
                      <div className="etl-action-header">
                        <span className="etl-action-index">{index + 1}</span>

                        <div>
                          <strong>{item.area}</strong>
                          <small>Prioridad {item.prioridad}</small>
                        </div>
                      </div>

                      <div className="etl-action-content">
                        <p>{item.accion}</p>
                        <div className="etl-benefit-box">
                          <span>Para qué sirve</span>
                          <p>{item.beneficio}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Sección opcional: hallazgos del procesamiento */}
              {report.insights && report.insights.length > 0 && (
                <div className="etl-insights-card etl-analysis-wide etl-raw-insights">
                  <div className="etl-section-header etl-section-header-premium">
                    <div>
                      <p className="etl-eyebrow">Información destacada</p>
                      <h3>Lo más importante de esta actualización</h3>
                      <p>
                        Observaciones generadas con la información incluida en el último resumen.
                      </p>
                    </div>

                    <span className="etl-chip">Resumen actualizado</span>
                  </div>

                  <div className="etl-raw-insights-grid">
                    {report.insights.map((insight, index) => (
                      <div className="etl-raw-insight" key={index}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <p>{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Vista: Gráficas y visualizaciones */}
          {activeTab === 'graficas' && (
            <section className="etl-chart-grid etl-panel-animation">
              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Información incluida en el resumen</h3>
                  <p>Muestra cuántos registros se consultaron de usuarios, nómina y vacaciones.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={volumenFuentesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="registros" radius={[12, 12, 0, 0]} fill="#38bdf8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Usuarios por rol</h3>
                  <p>Sirve para conocer cuántas personas tienen cada tipo de acceso.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={report.usuarios.porRol}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#2dd4bf" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Estado de usuarios</h3>
                  <p>Identifica cuentas activas, inactivas y perfiles que todavía no tienen foto.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={usuariosActividadData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#0a57a4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Vacaciones por estado</h3>
                  <p>Permite saber cuántas solicitudes están pendientes, aprobadas o rechazadas.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={report.vacaciones.porEstado}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={95}
                        label
                      >
                        {report.vacaciones.porEstado.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Balance de vacaciones</h3>
                  <p>Compara solicitudes, días pedidos y casos que todavía requieren respuesta.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vacacionesBalanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#38bdf8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Solicitudes por fecha</h3>
                  <p>Ayuda a detectar las fechas en las que se concentran más solicitudes.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={report.vacaciones.porFecha}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="dias"
                        name="Días solicitados"
                        stroke="#2dd4bf"
                        fill="#2dd4bf"
                        fillOpacity={0.25}
                      />
                      <Area
                        type="monotone"
                        dataKey="solicitudes"
                        name="Solicitudes"
                        stroke="#38bdf8"
                        fill="#38bdf8"
                        fillOpacity={0.18}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Componentes de nómina</h3>
                  <p>Muestra cuánto corresponde a salario, bonos, deducciones y pago final.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report.nomina.componentes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#2dd4bf" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Resumen de pagos</h3>
                  <p>Compara los importes principales para revisar cómo se forma el pago final.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={nominaComparativaData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#38bdf8" />
                      <Line type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Nómina por estado</h3>
                  <p>Permite revisar cuántos pagos están pendientes, procesados u observados.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={report.nomina.porEstado}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#38bdf8"
                        fill="#38bdf8"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card">
                <div className="etl-chart-header">
                  <h3>Cómo se compone la nómina</h3>
                  <p>Facilita comparar salario, bonos, deducciones y total pagado.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={eficienciaNominaData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="indicador" />
                      <PolarRadiusAxis />
                      <Radar
                        name="Valor"
                        dataKey="valor"
                        stroke="#2dd4bf"
                        fill="#2dd4bf"
                        fillOpacity={0.28}
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card etl-chart-card-wide">
                <div className="etl-chart-header">
                  <h3>Nómina por periodo</h3>
                  <p>Muestra cómo cambian los pagos entre un periodo y otro.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={report.nomina.porPeriodo}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="salarioBase" name="Salario base" stroke="#38bdf8" strokeWidth={3} />
                      <Line type="monotone" dataKey="bonos" name="Bonos" stroke="#2dd4bf" strokeWidth={3} />
                      <Line type="monotone" dataKey="deducciones" name="Deducciones" stroke="#f59e0b" strokeWidth={3} />
                      <Line type="monotone" dataKey="total" name="Total pagado" stroke="#0a57a4" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="etl-chart-card etl-chart-card-wide">
                <div className="etl-chart-header">
                  <h3>Cantidad de información por apartado</h3>
                  <p>Compara cuántos registros aporta cada apartado al resumen actual.</p>
                </div>

                <div className="etl-chart-box">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="indicador" />
                      <PolarRadiusAxis allowDecimals={false} />
                      <Radar
                        name="Volumen"
                        dataKey="valor"
                        stroke="#38bdf8"
                        fill="#38bdf8"
                        fillOpacity={0.28}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default ETLProcess;
