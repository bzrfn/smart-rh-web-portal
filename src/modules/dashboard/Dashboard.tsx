import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import SmartRhIcon, { SmartRhIconName } from '../../components/SmartRhIcon';

type ModuleCard = {
  path: string;
  title: string;
  description: string;
  code: string;
  icon: SmartRhIconName;
  group: 'trabajo' | 'documentos' | 'administracion' | 'analitica';
  accent: 'blue' | 'teal' | 'gold' | 'danger';
  adminOnly?: boolean;
};

const modules: ModuleCard[] = [
  {
    path: '/portal/usuarios',
    title: 'Usuarios',
    description: 'Gestión de personal, perfiles, roles y permisos de módulos.',
    code: 'US',
    icon: 'users',
    group: 'administracion',
    accent: 'blue',
  },
  {
    path: '/portal/asistencia',
    title: 'Asistencia',
    description: 'Registros laborales, entradas, salidas y control operativo.',
    code: 'AS',
    icon: 'attendance',
    group: 'trabajo',
    accent: 'teal',
  },
  {
    path: '/portal/calendario',
    title: 'Calendario laboral',
    description: 'Vista mensual de asistencia, vacaciones e incapacidades.',
    code: 'CL',
    icon: 'calendar',
    group: 'trabajo',
    accent: 'blue',
  },
  {
    path: '/portal/terminal-autorizacion',
    title: 'Autorizar Terminal',
    description: 'Aprueba o rechaza solicitudes de acceso de la terminal de asistencia.',
    code: 'AT',
    icon: 'check',
    group: 'administracion',
    accent: 'teal',
  },
  {
    path: '/portal/documentacion',
    title: 'Documentación',
    description: 'Foto de perfil, contrato PDF, credencial y expediente digital.',
    code: 'DC',
    icon: 'documents',
    group: 'documentos',
    accent: 'blue',
  },
  {
    path: '/portal/contratos',
    title: 'Contratos',
    description: 'Información contractual, vigencia y documentos asociados.',
    code: 'CT',
    icon: 'contracts',
    group: 'documentos',
    accent: 'blue',
  },
  {
    path: '/portal/nomina',
    title: 'Nómina',
    description: 'Pagos, periodos, registros y datos económicos del empleado.',
    code: 'NM',
    icon: 'payroll',
    group: 'documentos',
    accent: 'teal',
  },
  {
    path: '/portal/vacaciones',
    title: 'Vacaciones',
    description: 'Solicitudes, días disponibles y seguimiento administrativo.',
    code: 'VC',
    icon: 'vacation',
    group: 'trabajo',
    accent: 'gold',
  },
  {
    path: '/portal/incapacidades',
    title: 'Incapacidades',
    description: 'Solicitudes médicas, comprobantes, revisión y seguimiento administrativo.',
    code: 'IN',
    icon: 'health',
    group: 'trabajo',
    accent: 'danger',
    adminOnly: true,
  },
  {
    path: '/portal/soporte',
    title: 'Soporte',
    description: 'Tickets, incidencias, respuestas administrativas y seguimiento.',
    code: 'SP',
    icon: 'support',
    group: 'administracion',
    accent: 'teal',
    adminOnly: true,
  },
  {
    path: '/portal/etl',
    title: 'Proceso ETL',
    description: 'Extracción, transformación, carga, análisis y reportes de datos.',
    code: 'ETL',
    icon: 'data',
    group: 'analitica',
    accent: 'blue',
    adminOnly: true,
  },
  {
    path: '/portal/dashboard-analitico',
    title: 'Dashboard analítico',
    description:
      'Visualización de datos con gráficas de asistencia, nómina, vacaciones, contratos y K-means.',
    code: 'DA',
    icon: 'chart',
    group: 'analitica',
    accent: 'gold',
    adminOnly: true,
  },
  {
    path: '/portal/analisis-supervisado',
    title: 'Análisis supervisado',
    description: 'Predicción y evaluación con modelos de Machine Learning.',
    code: 'ML',
    icon: 'chart',
    group: 'analitica',
    accent: 'blue',
    adminOnly: true,
  },
  {
    path: '/portal/analisis-kmeans',
    title: 'K-means',
    description:
      'Agrupación no supervisada de empleados con método del codo e índice de silueta.',
    code: 'KM',
    icon: 'data',
    group: 'analitica',
    accent: 'teal',
    adminOnly: true,
  },
];

const moduleGroups = [
  {
    id: 'trabajo',
    label: 'Trabajo diario',
    description: 'Asistencia, agenda, ausencias y salud laboral.',
  },
  {
    id: 'documentos',
    label: 'Documentos y cuenta',
    description: 'Expediente, contratos, nómina y credenciales.',
  },
  {
    id: 'administracion',
    label: 'Administración',
    description: 'Usuarios, permisos, soporte y autorizaciones.',
  },
  {
    id: 'analitica',
    label: 'Inteligencia de datos',
    description: 'ETL, dashboards y análisis inteligente.',
  },
] as const;

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const visibleModules = modules.filter((item) => !item.adminOnly || isAdmin);
  const groupedModules = moduleGroups
    .map((group) => ({
      ...group,
      modules: visibleModules.filter((module) => module.group === group.id),
    }))
    .filter((group) => group.modules.length > 0);

  const kpis = [
    {
      label: 'Modelo de datos',
      value: 'Seguro',
      detail: 'Portal web conectado',
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
      value: isAdmin ? 'Visual + ML' : 'Operación',
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
  const firstName = userName ? userName.split(' ')[0] : 'Equipo';

  const commandHighlights = [
    {
      label: 'Prioridad',
      title: isAdmin ? 'Operación administrativa' : 'Tu jornada laboral',
      detail: isAdmin
        ? 'Revisa asistencia, usuarios y solicitudes antes de cerrar el día.'
        : 'Consulta asistencia, documentos y solicitudes desde una vista clara.',
      metric: isAdmin ? 'Admin' : 'Empleado',
      path: isAdmin ? '/portal/asistencia' : '/portal/documentacion',
      icon: isAdmin ? 'attendance' : 'documents',
    },
    {
      label: 'Flujo recomendado',
      title: 'Documentar antes de escalar',
      detail: 'Max puede ayudarte a ordenar contexto antes de crear tickets o revisar módulos.',
      metric: 'Max',
      path: '/portal/soporte',
      icon: 'spark',
    },
    {
      label: 'Control semanal',
      title: 'Ausencias y calendario',
      detail: 'Ten a la mano vacaciones, incapacidades y agenda laboral sin perder navegación.',
      metric: 'Agenda',
      path: '/portal/calendario',
      icon: 'calendar',
    },
  ] satisfies Array<{
    label: string;
    title: string;
    detail: string;
    metric: string;
    path: string;
    icon: SmartRhIconName;
  }>;

  const systemChecks = [
    'Base transaccional activa',
    'Archivos protegidos en S3',
    'Portal, app móvil y asistencia conectados',
    isAdmin ? 'Analítica y ML disponibles' : 'Vista personal protegida',
  ];

  const quickLinks = [
    { label: 'Documentación', path: '/portal/documentacion', icon: 'documents' },
    { label: 'Asistencia', path: '/portal/asistencia', icon: 'attendance' },
    { label: 'Vacaciones', path: '/portal/vacaciones', icon: 'vacation' },
    ...(isAdmin
      ? [
          { label: 'Incapacidades', path: '/portal/incapacidades', icon: 'health' as const },
          { label: 'Analítica', path: '/portal/dashboard-analitico', icon: 'chart' as const },
          { label: 'ETL', path: '/portal/etl', icon: 'data' as const },
        ]
      : []),
  ] satisfies Array<{
    label: string;
    path: string;
    icon: SmartRhIconName;
  }>;

  return (
    <div className="enterprise-dashboard">
      <section className="enterprise-hero">
        <div className="enterprise-hero-copy">
          <span className="enterprise-chip">Centro operativo</span>
          <h1>{`Hola, ${firstName}`}</h1>
          <p>
            Tu tablero combina operación, documentos y soporte en una lectura
            más clara: qué revisar, a dónde entrar y qué dejar listo antes de
            cambiar de módulo.
          </p>

          <div className="enterprise-hero-actions">
            <Link to={isAdmin ? '/portal/usuarios' : '/portal/asistencia'} className="enterprise-primary-action">
              <SmartRhIcon name={isAdmin ? 'users' : 'attendance'} />
              <span>{isAdmin ? 'Gestionar usuarios' : 'Ir a asistencia'}</span>
            </Link>

            <Link
              to={isAdmin ? '/portal/dashboard-analitico' : '/portal/documentacion'}
              className="enterprise-secondary-action"
            >
              <SmartRhIcon name={isAdmin ? 'chart' : 'documents'} />
              <span>{isAdmin ? 'Ver analítica' : 'Ver documentos'}</span>
            </Link>
          </div>

          <div className="enterprise-hero-brief" aria-label="Resumen operativo">
            <div>
              <span>Modo</span>
              <strong>{isAdmin ? 'Administración' : 'Empleado'}</strong>
            </div>
            <div>
              <span>Módulos</span>
              <strong>{visibleModules.length}</strong>
            </div>
            <div>
              <span>Asistente</span>
              <strong>Max listo</strong>
            </div>
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

          <div className="enterprise-profile-note">
            <SmartRhIcon name="check" />
            <p>
              Recomendación: atiende primero asistencia/documentos, después
              soporte o analítica si el caso necesita seguimiento.
            </p>
          </div>
        </div>
      </section>

      <section className="enterprise-command-strip" aria-label="Información importante">
        {commandHighlights.map((item) => (
          <Link to={item.path} className="enterprise-command-card" key={item.title}>
            <div className="enterprise-command-icon">
              <SmartRhIcon name={item.icon} />
            </div>
            <div>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
            <strong>{item.metric}</strong>
          </Link>
        ))}
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

          <div className="enterprise-module-sections">
            {groupedModules.map((group) => (
              <section className="enterprise-module-section" key={group.id}>
                <div className="enterprise-module-section-head">
                  <div>
                    <span>{group.label}</span>
                    <p>{group.description}</p>
                  </div>
                  <strong>{group.modules.length}</strong>
                </div>

                <div className="enterprise-module-grid">
                  {group.modules.map((module) => (
                    <Link
                      key={module.path}
                      to={module.path}
                      className={`enterprise-module-card ${module.accent}`}
                    >
                      <div className="enterprise-module-code">
                        <SmartRhIcon name={module.icon} />
                      </div>

                      <div>
                        <span>{module.code}</span>
                        <h3>{module.title}</h3>
                        <p>{module.description}</p>
                      </div>

                      <span className="enterprise-module-arrow">
                        <SmartRhIcon name="send" />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="enterprise-side-panel">
          <div className="enterprise-side-card">
            <span className="enterprise-side-label">Estado del sistema</span>
            <h3>Operación conectada</h3>
            <p>
              Lectura corta del estado general para no llenar el tablero de
              ruido técnico, pero mantener confianza operativa.
            </p>

            <div className="enterprise-system-list">
              {systemChecks.map((item) => (
                <div key={item}>
                  <span />
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="enterprise-side-card">
            <span className="enterprise-side-label">Accesos rápidos</span>

            <div className="enterprise-quick-links">
              {quickLinks.map((item) => (
                <Link to={item.path} key={item.path}>
                  <SmartRhIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
