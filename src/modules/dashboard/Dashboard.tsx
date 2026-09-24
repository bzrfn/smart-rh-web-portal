import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';

type ModuleCard = {
  path: string;
  title: string;
  description: string;
  code: string;
  accent: 'blue' | 'teal' | 'gold' | 'danger';
  adminOnly?: boolean;
};

const modules: ModuleCard[] = [
  {
    path: '/usuarios',
    title: 'Usuarios',
    description: 'Gestión de personal, perfiles, roles y permisos de módulos.',
    code: 'US',
    accent: 'blue',
  },
  {
    path: '/asistencia',
    title: 'Asistencia',
    description: 'Registros laborales, entradas, salidas y control operativo.',
    code: 'AS',
    accent: 'teal',
  },
    {
    path: '/portal/terminal-autorizacion',
    title: 'Autorizar Terminal',
    description: 'Aprueba o rechaza solicitudes de acceso de la terminal de asistencia.',
    code: 'AT',
    accent: 'teal',
  },
  {
    path: '/documentacion',
    title: 'Documentación',
    description: 'Foto de perfil, contrato PDF, credencial y expediente digital.',
    code: 'DC',
    accent: 'blue',
  },
  {
    path: '/contratos',
    title: 'Contratos',
    description: 'Información contractual, vigencia y documentos asociados.',
    code: 'CT',
    accent: 'blue',
  },
  {
    path: '/nomina',
    title: 'Nómina',
    description: 'Pagos, periodos, registros y datos económicos del empleado.',
    code: 'NM',
    accent: 'teal',
  },
  {
    path: '/vacaciones',
    title: 'Vacaciones',
    description: 'Solicitudes, días disponibles y seguimiento administrativo.',
    code: 'VC',
    accent: 'gold',
  },
  {
    path: '/soporte',
    title: 'Soporte',
    description: 'Tickets, incidencias, respuestas administrativas y seguimiento.',
    code: 'SP',
    accent: 'teal',
    adminOnly: true,
  },
  {
    path: '/etl',
    title: 'Proceso ETL',
    description: 'Extracción, transformación, carga, análisis y reportes de datos.',
    code: 'ETL',
    accent: 'blue',
    adminOnly: true,
  },
  {
    path: '/dashboard-analitico',
    title: 'Dashboard analítico',
    description:
      'Visualización de datos con gráficas de asistencia, nómina, vacaciones, contratos y K-means.',
    code: 'DA',
    accent: 'gold',
    adminOnly: true,
  },
  {
    path: '/analisis-supervisado',
    title: 'Análisis supervisado',
    description: 'Predicción y evaluación con modelos de Machine Learning.',
    code: 'ML',
    accent: 'blue',
    adminOnly: true,
  },
  {
    path: '/analisis-kmeans',
    title: 'K-means',
    description:
      'Agrupación no supervisada de empleados con método del codo e índice de silueta.',
    code: 'KM',
    accent: 'teal',
    adminOnly: true,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const visibleModules = modules.filter((item) => !item.adminOnly || isAdmin);

  const kpis = [
    {
      label: 'Modelo de datos',
      value: 'Híbrido',
      detail: 'MySQL + MongoDB',
      accent: 'blue',
    },
    {
      label: 'Módulos activos',
      value: String(visibleModules.length),
      detail: 'Disponibles en portal',
      accent: 'teal',
    },
    {
      label: 'Analítica',
      value: isAdmin ? 'Visual + ML' : 'Operativa',
      detail: isAdmin
        ? 'Dashboard, supervisado y K-means'
        : 'Vista de usuario',
      accent: 'gold',
    },
    {
      label: 'Soporte',
      value: isAdmin ? 'Admin' : 'Usuario',
      detail: 'Seguimiento operativo',
      accent: 'blue',
    },
  ];

  const userName = `${user?.nombre || ''} ${user?.apellido || ''}`.trim();

  return (
    <div className="enterprise-dashboard">
      <section className="enterprise-hero">
        <div className="enterprise-hero-copy">
          <span className="enterprise-chip">Panel ejecutivo</span>
          <h1>Bienvenido a SMART RH</h1>
          <p>
            Controla la operación de Recursos Humanos desde una vista centralizada:
            usuarios, asistencia, documentación, nómina, vacaciones, soporte,
            procesos ETL, visualización de datos y análisis inteligente con
            Machine Learning.
          </p>

          <div className="enterprise-hero-actions">
            <Link to="/usuarios" className="enterprise-primary-action">
              Gestionar usuarios
            </Link>

            <Link
              to={isAdmin ? '/dashboard-analitico' : '/documentacion'}
              className="enterprise-secondary-action"
            >
              {isAdmin ? 'Ver dashboard analítico' : 'Ver documentos'}
            </Link>
          </div>
        </div>

        <div className="enterprise-profile-card">
          <div className="enterprise-profile-top">
            <span className="enterprise-profile-role">{user?.role}</span>
            <span className="enterprise-profile-status">Sesión activa</span>
          </div>

          <h2>{userName || 'Usuario SMART RH'}</h2>
          <p>{user?.correo}</p>

          <div className="enterprise-profile-grid">
            <div>
              <span>Portal</span>
              <strong>Web</strong>
            </div>

            <div>
              <span>Acceso</span>
              <strong>{isAdmin ? 'Admin' : 'Empleado'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="enterprise-kpi-grid">
        {kpis.map((item) => (
          <article key={item.label} className={`enterprise-kpi-card ${item.accent}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="enterprise-layout-grid">
        <div className="enterprise-main-panel">
          <div className="enterprise-section-header">
            <div>
              <span>Módulos del sistema</span>
              <h2>Centro de operación</h2>
            </div>

            <p>{visibleModules.length} módulos disponibles</p>
          </div>

          <div className="enterprise-module-grid">
            {visibleModules.map((module) => (
              <Link
                key={module.path}
                to={module.path}
                className={`enterprise-module-card ${module.accent}`}
              >
                <div className="enterprise-module-code">{module.code}</div>

                <div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                </div>

                <span className="enterprise-module-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="enterprise-side-panel">
          <div className="enterprise-side-card">
            <span className="enterprise-side-label">Estado del sistema</span>
            <h3>Operación estable</h3>
            <p>
              El portal integra base transaccional, auditoría, notificaciones,
              documentación laboral, soporte, procesos ETL, dashboards visuales y
              análisis de datos.
            </p>

            <div className="enterprise-health-list">
              <div>
                <span />
                MySQL operativo
              </div>
              <div>
                <span />
                MongoDB operativo
              </div>
              <div>
                <span />
                Archivos y documentos
              </div>
              <div>
                <span />
                Portal + App móvil + Wear OS
              </div>
              {isAdmin && (
                <div>
                  <span />
                  Dashboard analítico
                </div>
              )}
              {isAdmin && (
                <div>
                  <span />
                  ML supervisado + K-means
                </div>
              )}
            </div>
          </div>

          <div className="enterprise-side-card">
            <span className="enterprise-side-label">Accesos rápidos</span>

            <div className="enterprise-quick-links">
              <Link to="/documentacion">Documentación</Link>
              <Link to="/asistencia">Asistencia</Link>
              <Link to="/vacaciones">Vacaciones</Link>
              {isAdmin && <Link to="/dashboard-analitico">Dashboard analítico</Link>}
              {isAdmin && <Link to="/etl">Proceso ETL</Link>}
              {isAdmin && <Link to="/analisis-supervisado">Análisis supervisado</Link>}
              {isAdmin && <Link to="/analisis-kmeans">K-means</Link>}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}