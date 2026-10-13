import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import SmartRhIcon, { SmartRhIconName } from '../../components/SmartRhIcon';

type ModuleCard = {
  path: string;
  title: string;
  description: string;
  code: string;
  icon: SmartRhIconName;
  group: 'operacion' | 'talento' | 'documentos' | 'analitica';
  adminOnly?: boolean;
};

const modules: ModuleCard[] = [
  {
    path: '/portal/usuarios',
    title: 'Usuarios y permisos',
    description: 'Altas, roles, módulos habilitados y cambios de acceso.',
    code: 'US',
    icon: 'users',
    group: 'talento',
  },
  {
    path: '/portal/asistencia',
    title: 'Asistencia',
    description: 'Registros, pendientes y validación de jornadas.',
    code: 'AS',
    icon: 'attendance',
    group: 'operacion',
  },
  {
    path: '/portal/calendario',
    title: 'Calendario laboral',
    description: 'Agenda de asistencia, vacaciones e incapacidades.',
    code: 'CL',
    icon: 'calendar',
    group: 'operacion',
  },
  {
    path: '/portal/terminal-autorizacion',
    title: 'Terminal QR',
    description: 'Autoriza el acceso a la terminal de asistencia.',
    code: 'QR',
    icon: 'check',
    group: 'operacion',
  },
  {
    path: '/portal/documentacion',
    title: 'Documentación',
    description: 'Expediente digital, credencial y archivos laborales.',
    code: 'DC',
    icon: 'documents',
    group: 'documentos',
  },
  {
    path: '/portal/contratos',
    title: 'Contratos',
    description: 'Información contractual, vigencia y comprobantes.',
    code: 'CT',
    icon: 'contracts',
    group: 'documentos',
  },
  {
    path: '/portal/nomina',
    title: 'Nómina',
    description: 'Periodos, pagos y registros económicos del empleado.',
    code: 'NM',
    icon: 'payroll',
    group: 'documentos',
  },
  {
    path: '/portal/vacaciones',
    title: 'Vacaciones',
    description: 'Saldos, solicitudes y seguimiento de descansos.',
    code: 'VC',
    icon: 'vacation',
    group: 'operacion',
  },
  {
    path: '/portal/incapacidades',
    title: 'Incapacidades',
    description: 'Comprobantes, revisión y decisión administrativa.',
    code: 'IN',
    icon: 'health',
    group: 'operacion',
    adminOnly: true,
  },
  {
    path: '/portal/soporte',
    title: 'Soporte',
    description: 'Tickets, incidencias y seguimiento con contexto.',
    code: 'SP',
    icon: 'support',
    group: 'talento',
    adminOnly: true,
  },
  {
    path: '/portal/etl',
    title: 'Proceso ETL',
    description: 'Carga, limpieza y preparación de información.',
    code: 'ETL',
    icon: 'data',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/dashboard-analitico',
    title: 'Dashboard analítico',
    description: 'Gráficas para revisión administrativa y seguimiento.',
    code: 'DA',
    icon: 'chart',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/analisis-supervisado',
    title: 'Análisis supervisado',
    description: 'Predicción y evaluación con modelos de ML.',
    code: 'ML',
    icon: 'chart',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/analisis-kmeans',
    title: 'K-means',
    description: 'Agrupación de empleados para análisis exploratorio.',
    code: 'KM',
    icon: 'data',
    group: 'analitica',
    adminOnly: true,
  },
];

const moduleGroups = [
  {
    id: 'operacion',
    label: 'Operación diaria',
    description: 'Asistencia, calendario, ausencias y terminal QR.',
  },
  {
    id: 'talento',
    label: 'Administración de talento',
    description: 'Usuarios, permisos y seguimiento de incidencias.',
  },
  {
    id: 'documentos',
    label: 'Expediente y pagos',
    description: 'Documentos laborales, contratos y nómina.',
  },
  {
    id: 'analitica',
    label: 'Información y análisis',
    description: 'Reportes, ETL y módulos de inteligencia.',
  },
] as const;

const adminFocus = [
  {
    title: 'Pendientes operativos',
    detail: 'Asistencia, incapacidades y autorizaciones que requieren revisión.',
    path: '/portal/asistencia',
    icon: 'attendance' as const,
  },
  {
    title: 'Gestión de usuarios',
    detail: 'Roles, permisos y módulos asignados a cada colaborador.',
    path: '/portal/usuarios',
    icon: 'users' as const,
  },
  {
    title: 'Documentación laboral',
    detail: 'Contratos, credenciales y expedientes listos para consulta.',
    path: '/portal/documentacion',
    icon: 'documents' as const,
  },
];

const employeeFocus = [
  {
    title: 'Mi asistencia',
    detail: 'Consulta registros y seguimiento de tu jornada.',
    path: '/portal/asistencia',
    icon: 'attendance' as const,
  },
  {
    title: 'Mis documentos',
    detail: 'Credencial, contrato y expediente personal.',
    path: '/portal/documentacion',
    icon: 'documents' as const,
  },
  {
    title: 'Vacaciones',
    detail: 'Revisa tu saldo y solicitudes disponibles.',
    path: '/portal/vacaciones',
    icon: 'vacation' as const,
  },
];

const adminWorkRail = [
  {
    label: 'Primero',
    title: 'Asistencia pendiente',
    detail: 'Valida registros con evidencia antes de aprobar o rechazar.',
    path: '/portal/asistencia',
    icon: 'attendance' as const,
  },
  {
    label: 'Después',
    title: 'Solicitudes sensibles',
    detail: 'Incapacidades, vacaciones y cambios de permisos requieren contexto.',
    path: '/portal/incapacidades',
    icon: 'health' as const,
  },
  {
    label: 'Cierre',
    title: 'Soporte con contexto',
    detail: 'Cuando un caso no queda resuelto, Max puede preparar el ticket.',
    path: '/portal/soporte',
    icon: 'support' as const,
  },
];

const employeeWorkRail = [
  {
    label: 'Inicio',
    title: 'Mi expediente',
    detail: 'Consulta credencial, contrato y documentos disponibles.',
    path: '/portal/documentacion',
    icon: 'documents' as const,
  },
  {
    label: 'Jornada',
    title: 'Asistencia',
    detail: 'Revisa registros y pendientes relacionados con tu día laboral.',
    path: '/portal/asistencia',
    icon: 'attendance' as const,
  },
  {
    label: 'Planeación',
    title: 'Vacaciones',
    detail: 'Consulta saldo y seguimiento de solicitudes.',
    path: '/portal/vacaciones',
    icon: 'vacation' as const,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const visibleModules = modules.filter((item) => !item.adminOnly || isAdmin);
  const focusItems = isAdmin ? adminFocus : employeeFocus;
  const groupedModules = moduleGroups
    .map((group) => ({
      ...group,
      modules: visibleModules.filter((module) => module.group === group.id),
    }))
    .filter((group) => group.modules.length > 0);

  const userName = `${user?.nombre || ''} ${user?.apellido || ''}`.trim();
  const firstName = userName.split(' ')[0] || 'Usuario';
  const workRail = isAdmin ? adminWorkRail : employeeWorkRail;
  const todayLabel = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return (
    <div className="enterprise-dashboard srh-dashboard-v3">
      <section className="srh-dashboard-hero">
        <div className="srh-hero-copy">
          <span className="srh-kicker">Panel de trabajo</span>
          <h1>{isAdmin ? `Hola, ${firstName}` : `Bienvenido, ${firstName}`}</h1>
          <p>
            Una vista pensada para trabajar: prioridades claras, módulos organizados por
            flujo de Recursos Humanos y accesos rápidos sin perder contexto.
          </p>

          <div className="srh-hero-actions">
            <Link to={isAdmin ? '/portal/asistencia' : '/portal/documentacion'} className="srh-primary-action">
              {isAdmin ? 'Revisar operación' : 'Ver mi expediente'}
            </Link>
            <Link to={isAdmin ? '/portal/usuarios' : '/portal/vacaciones'} className="srh-secondary-action">
              {isAdmin ? 'Gestionar usuarios' : 'Consultar vacaciones'}
            </Link>
          </div>
        </div>

        <div className="srh-hero-brief">
          <div className="srh-brief-head">
            <span>{isAdmin ? 'Prioridad admin' : 'Resumen personal'}</span>
            <strong>{isAdmin ? 'Qué revisar primero' : 'Accesos principales'}</strong>
          </div>

          <div className="srh-brief-list">
            {focusItems.map((item) => (
              <Link key={item.title} to={item.path}>
                <SmartRhIcon name={item.icon} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="srh-dashboard-strip" aria-label="Información rápida">
        <article>
          <span>Vista activa</span>
          <strong>{isAdmin ? 'Administrador' : 'Empleado'}</strong>
          <p>La navegación se adapta a tus permisos.</p>
        </article>
        <article>
          <span>Hoy</span>
          <strong>{todayLabel}</strong>
          <p>Usa esta pantalla como punto de entrada a tu jornada.</p>
        </article>
        <article>
          <span>Asistente</span>
          <strong>Max</strong>
          <p>Ayuda con pasos, contexto y tickets.</p>
        </article>
      </section>

      <section className="srh-work-board">
        <div className="srh-work-copy">
          <span>Lectura rápida</span>
          <h2>{isAdmin ? 'Qué conviene revisar antes de moverte de pantalla' : 'Tu día laboral en tres accesos'}</h2>
          <p>
            El portal ya no depende de una lista plana: cada acceso explica la acción,
            el criterio de revisión y el siguiente punto lógico.
          </p>
        </div>

        <div className="srh-work-rail">
          {workRail.map((item) => (
            <Link key={item.title} to={item.path} className="srh-work-card">
              <div>
                <span>{item.label}</span>
                <SmartRhIcon name={item.icon} />
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="srh-workflow-panel">
        <div className="srh-section-title">
          <span>Forma de trabajo</span>
          <h2>Menos ruido, más decisión</h2>
        </div>

        <div className="srh-workflow-cards">
          <article>
            <b>01</b>
            <strong>Ubica el caso</strong>
            <p>Empleado, fecha, documento o solicitud. Ese dato define el módulo correcto.</p>
          </article>
          <article>
            <b>02</b>
            <strong>Revisa evidencia</strong>
            <p>Antes de aprobar, confirma comprobante, jornada, permiso o archivo asociado.</p>
          </article>
          <article>
            <b>03</b>
            <strong>Deja seguimiento</strong>
            <p>Guarda el cambio o usa Max para levantar un ticket con el contexto mínimo.</p>
          </article>
        </div>
      </section>

      <section className="srh-module-catalog">
        <div className="srh-section-title">
          <span>Módulos SMART RH</span>
          <h2>Accesos organizados por trabajo real</h2>
        </div>

        <div className="srh-module-groups">
          {groupedModules.map((group) => (
            <section className="srh-module-group" key={group.id}>
              <div className="srh-module-group-head">
                <div>
                  <strong>{group.label}</strong>
                  <span>{group.description}</span>
                </div>
                <b>{group.modules.length}</b>
              </div>

              <div className="srh-module-list">
                {group.modules.map((module) => (
                  <Link key={module.path} to={module.path} className="srh-module-row">
                    <span className="srh-module-icon">
                      <SmartRhIcon name={module.icon} />
                    </span>
                    <div>
                      <small>{module.code}</small>
                      <strong>{module.title}</strong>
                      <p>{module.description}</p>
                    </div>
                    <span className="srh-module-open">Abrir</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
