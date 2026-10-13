import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import SmartRhIcon, { SmartRhIconName } from '../../components/SmartRhIcon';

type ModuleCard = {
  path: string;
  title: string;
  description: string;
  icon: SmartRhIconName;
  group: 'operacion' | 'expediente' | 'gestion' | 'analitica';
  adminOnly?: boolean;
};

type PriorityCard = {
  title: string;
  detail: string;
  path: string;
  icon: SmartRhIconName;
  meta: string;
};

const modules: ModuleCard[] = [
  {
    path: '/portal/asistencia',
    title: 'Asistencia',
    description: 'Registros, pendientes, evidencia y validación de jornada.',
    icon: 'attendance',
    group: 'operacion',
  },
  {
    path: '/portal/calendario',
    title: 'Calendario',
    description: 'Agenda laboral, ausencias, vacaciones e incapacidades.',
    icon: 'calendar',
    group: 'operacion',
  },
  {
    path: '/portal/vacaciones',
    title: 'Vacaciones',
    description: 'Saldos, solicitudes y seguimiento de descansos.',
    icon: 'vacation',
    group: 'operacion',
  },
  {
    path: '/portal/incapacidades',
    title: 'Incapacidades',
    description: 'Comprobantes, revisión y decisión administrativa.',
    icon: 'health',
    group: 'operacion',
    adminOnly: true,
  },
  {
    path: '/portal/documentacion',
    title: 'Documentos',
    description: 'Expediente digital, credencial y archivos laborales.',
    icon: 'documents',
    group: 'expediente',
  },
  {
    path: '/portal/contratos',
    title: 'Contratos',
    description: 'Vigencia contractual y documentación asociada.',
    icon: 'contracts',
    group: 'expediente',
  },
  {
    path: '/portal/nomina',
    title: 'Nómina',
    description: 'Periodos, comprobantes y registros económicos.',
    icon: 'payroll',
    group: 'expediente',
  },
  {
    path: '/portal/usuarios',
    title: 'Usuarios',
    description: 'Altas, permisos, módulos y administración de acceso.',
    icon: 'users',
    group: 'gestion',
  },
  {
    path: '/portal/soporte',
    title: 'Soporte',
    description: 'Tickets, incidencias y seguimiento con contexto.',
    icon: 'support',
    group: 'gestion',
    adminOnly: true,
  },
  {
    path: '/portal/etl',
    title: 'ETL',
    description: 'Carga, limpieza y preparación de información.',
    icon: 'data',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/dashboard-analitico',
    title: 'Analítica',
    description: 'Lecturas ejecutivas y gráficas de operación.',
    icon: 'chart',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/analisis-supervisado',
    title: 'ML',
    description: 'Modelos supervisados para evaluación y predicción.',
    icon: 'chart',
    group: 'analitica',
    adminOnly: true,
  },
];

const moduleGroups = [
  {
    id: 'operacion',
    label: 'Operación diaria',
    description: 'Jornada, agenda, ausencias y decisiones de asistencia.',
  },
  {
    id: 'expediente',
    label: 'Expediente laboral',
    description: 'Documentos, contratos y comprobantes del empleado.',
  },
  {
    id: 'gestion',
    label: 'Gestión interna',
    description: 'Accesos, permisos, soporte y seguimiento administrativo.',
  },
  {
    id: 'analitica',
    label: 'Información',
    description: 'Datos preparados para revisar tendencias y decisiones.',
  },
] as const;

const adminPriorities: PriorityCard[] = [
  {
    title: 'Revisar asistencia pendiente',
    detail: 'Empieza por registros con evidencia incompleta, jornada distinta o comentario del empleado.',
    path: '/portal/asistencia',
    icon: 'attendance',
    meta: 'Control diario',
  },
  {
    title: 'Validar ausencias sensibles',
    detail: 'Vacaciones e incapacidades requieren comprobar fecha, documento y responsable.',
    path: '/portal/incapacidades',
    icon: 'health',
    meta: 'Revisión RH',
  },
  {
    title: 'Cerrar casos con Max',
    detail: 'Cuando un caso no queda resuelto, prepara un ticket con contexto antes de escalar.',
    path: '/portal/soporte',
    icon: 'support',
    meta: 'Soporte',
  },
];

const employeePriorities: PriorityCard[] = [
  {
    title: 'Revisar mi expediente',
    detail: 'Consulta credencial, contrato y documentos disponibles sin perder tu sesión.',
    path: '/portal/documentacion',
    icon: 'documents',
    meta: 'Documentos',
  },
  {
    title: 'Confirmar mi asistencia',
    detail: 'Valida tus registros y cualquier pendiente relacionado con tu jornada.',
    path: '/portal/asistencia',
    icon: 'attendance',
    meta: 'Jornada',
  },
  {
    title: 'Planear vacaciones',
    detail: 'Revisa saldo, solicitudes y seguimiento de descansos disponibles.',
    path: '/portal/vacaciones',
    icon: 'vacation',
    meta: 'Planeación',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [activePriority, setActivePriority] = useState(0);
  const isAdmin = user?.role === 'admin';

  const firstName = useMemo(() => {
    const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`.trim();
    return fullName.split(' ')[0] || 'Usuario';
  }, [user]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).format(new Date()),
    []
  );

  const visibleModules = useMemo(
    () => modules.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  const groupedModules = useMemo(
    () =>
      moduleGroups
        .map((group) => ({
          ...group,
          modules: visibleModules.filter((module) => module.group === group.id),
        }))
        .filter((group) => group.modules.length > 0),
    [visibleModules]
  );

  const priorities = isAdmin ? adminPriorities : employeePriorities;
  const currentPriority = priorities[activePriority] || priorities[0];

  return (
    <div className="srh-command-center">
      <section className="srh-command-hero">
        <div className="srh-command-copy">
          <span className="srh-kicker">Inicio operativo</span>
          <h1>{isAdmin ? `Buen día, ${firstName}` : `Hola, ${firstName}`}</h1>
          <p>
            Un tablero para entrar rápido al trabajo real: revisar pendientes,
            encontrar el módulo correcto y mantener la operación de Recursos Humanos en orden.
          </p>

          <div className="srh-command-actions">
            <Link to={currentPriority.path} className="srh-primary-action">
              Abrir prioridad
            </Link>
            <Link to={isAdmin ? '/portal/usuarios' : '/portal/documentacion'} className="srh-secondary-action">
              {isAdmin ? 'Gestionar personal' : 'Ver expediente'}
            </Link>
          </div>
        </div>

        <div className="srh-command-carousel" aria-label="Prioridades de trabajo">
          <div className="srh-carousel-meta">
            <span>{currentPriority.meta}</span>
            <strong>{String(activePriority + 1).padStart(2, '0')}</strong>
          </div>

          <div className="srh-carousel-main">
            <SmartRhIcon name={currentPriority.icon} />
            <div>
              <h2>{currentPriority.title}</h2>
              <p>{currentPriority.detail}</p>
            </div>
          </div>

          <div className="srh-priority-tabs">
            {priorities.map((item, index) => (
              <button
                key={item.title}
                className={index === activePriority ? 'is-active' : ''}
                type="button"
                onClick={() => setActivePriority(index)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {item.meta}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="srh-day-panel" aria-label="Resumen de jornada">
        <article>
          <span>Hoy</span>
          <strong>{todayLabel}</strong>
          <p>Usa el tablero como entrada a tu jornada.</p>
        </article>

        <article>
          <span>Modo de trabajo</span>
          <strong>{isAdmin ? 'Operación RH' : 'Autoservicio'}</strong>
          <p>{isAdmin ? 'Permisos administrativos activos.' : 'Accesos personales disponibles.'}</p>
        </article>

        <article>
          <span>Max</span>
          <strong>Disponible</strong>
          <p>Úsalo para ubicar pasos, módulo y contexto del caso.</p>
        </article>
      </section>

      <section className="srh-path-board">
        <div className="srh-section-heading">
          <span>Ruta sugerida</span>
          <h2>{isAdmin ? 'Cómo revisar sin perder contexto' : 'Tu información laboral en orden'}</h2>
        </div>

        <div className="srh-path-steps">
          <article>
            <b>01</b>
            <strong>Identifica el caso</strong>
            <p>Empleado, fecha, solicitud o documento. Ese dato define el módulo correcto.</p>
          </article>
          <article>
            <b>02</b>
            <strong>Confirma evidencia</strong>
            <p>Revisa comprobante, jornada, archivo o autorización antes de decidir.</p>
          </article>
          <article>
            <b>03</b>
            <strong>Deja seguimiento</strong>
            <p>Guarda el cambio o prepara el ticket con Max si requiere soporte.</p>
          </article>
        </div>
      </section>

      <section className="srh-module-lab">
        <div className="srh-section-heading">
          <span>Módulos</span>
          <h2>Accesos por flujo de trabajo</h2>
        </div>

        <div className="srh-module-columns">
          {groupedModules.map((group) => (
            <section className="srh-module-column" key={group.id}>
              <div className="srh-module-column-head">
                <div>
                  <strong>{group.label}</strong>
                  <p>{group.description}</p>
                </div>
                <span>{group.modules.length}</span>
              </div>

              <div className="srh-module-pills">
                {group.modules.map((module) => (
                  <Link key={module.path} to={module.path} className="srh-module-pill">
                    <SmartRhIcon name={module.icon} />
                    <div>
                      <strong>{module.title}</strong>
                      <span>{module.description}</span>
                    </div>
                    <small>Abrir</small>
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
