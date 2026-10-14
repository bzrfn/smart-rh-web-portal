import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import SmartRhIcon, { SmartRhIconName } from '../../components/SmartRhIcon';

type ModuleCard = {
  path: string;
  title: string;
  description: string;
  cue: string;
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
    cue: 'Control diario',
    icon: 'attendance',
    group: 'operacion',
  },
  {
    path: '/portal/calendario',
    title: 'Calendario',
    description: 'Agenda laboral, ausencias, vacaciones e incapacidades.',
    cue: 'Agenda',
    icon: 'calendar',
    group: 'operacion',
  },
  {
    path: '/portal/vacaciones',
    title: 'Vacaciones',
    description: 'Saldos, solicitudes y seguimiento de descansos.',
    cue: 'Solicitudes',
    icon: 'vacation',
    group: 'operacion',
  },
  {
    path: '/portal/incapacidades',
    title: 'Incapacidades',
    description: 'Comprobantes, revisión y decisión administrativa.',
    cue: 'Evidencia',
    icon: 'health',
    group: 'operacion',
    adminOnly: true,
  },
  {
    path: '/portal/documentacion',
    title: 'Documentos',
    description: 'Expediente digital, credencial y archivos laborales.',
    cue: 'Expediente',
    icon: 'documents',
    group: 'expediente',
  },
  {
    path: '/portal/contratos',
    title: 'Contratos',
    description: 'Vigencia contractual y documentación asociada.',
    cue: 'Vigencia',
    icon: 'contracts',
    group: 'expediente',
  },
  {
    path: '/portal/nomina',
    title: 'Nómina',
    description: 'Periodos, comprobantes y registros económicos.',
    cue: 'Periodos',
    icon: 'payroll',
    group: 'expediente',
  },
  {
    path: '/portal/usuarios',
    title: 'Usuarios',
    description: 'Altas, permisos, módulos y administración de acceso.',
    cue: 'Permisos',
    icon: 'users',
    group: 'gestion',
  },
  {
    path: '/portal/soporte',
    title: 'Soporte',
    description: 'Tickets, incidencias y seguimiento con contexto.',
    cue: 'Tickets',
    icon: 'support',
    group: 'gestion',
    adminOnly: true,
  },
  {
    path: '/portal/etl',
    title: 'ETL',
    description: 'Carga, limpieza y preparación de información.',
    cue: 'Datos',
    icon: 'data',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/dashboard-analitico',
    title: 'Analítica',
    description: 'Lecturas ejecutivas y gráficas de operación.',
    cue: 'Lectura',
    icon: 'chart',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/analisis-supervisado',
    title: 'ML',
    description: 'Modelos supervisados para evaluación y predicción.',
    cue: 'Modelos',
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

const adminSignals = [
  {
    label: 'Entrada',
    title: 'Pendientes filtrados',
    detail: 'Asistencia, ausencias y solicitudes se revisan por prioridad operativa.',
  },
  {
    label: 'Criterio',
    title: 'Evidencia primero',
    detail: 'Cada decisión parte de fecha, empleado, comprobante y responsable.',
  },
  {
    label: 'Salida',
    title: 'Seguimiento claro',
    detail: 'Guardar, escalar con Max o continuar al módulo correspondiente.',
  },
];

const employeeSignals = [
  {
    label: 'Entrada',
    title: 'Información personal',
    detail: 'Expediente, asistencia y vacaciones disponibles en el mismo tablero.',
  },
  {
    label: 'Criterio',
    title: 'Consulta por estado',
    detail: 'Cada sección indica qué revisar antes de enviar o dar seguimiento.',
  },
  {
    label: 'Salida',
    title: 'Acción directa',
    detail: 'Entrar al módulo correcto sin recorrer menús innecesarios.',
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

const adminReviewNotes = [
  {
    title: 'Qué revisar primero',
    detail: 'Registros con comentario, evidencia incompleta o cambio de jornada.',
  },
  {
    title: 'Cómo decidir',
    detail: 'Cruza empleado, fecha, documento y responsable antes de aprobar o rechazar.',
  },
  {
    title: 'Cuándo escalar',
    detail: 'Si falta contexto, abre Soporte o pide a Max preparar el caso.',
  },
];

const employeeReviewNotes = [
  {
    title: 'Qué consultar primero',
    detail: 'Credencial, asistencia reciente y vacaciones disponibles.',
  },
  {
    title: 'Cómo dar seguimiento',
    detail: 'Entra al módulo correcto y revisa el estado actualizado.',
  },
  {
    title: 'Cuándo pedir ayuda',
    detail: 'Si algo no coincide, Max te orienta o prepara un ticket.',
  },
];

function getModuleAction(group: ModuleCard['group']) {
  if (group === 'gestion') return 'Gestionar';
  if (group === 'analitica') return 'Analizar';
  if (group === 'expediente') return 'Consultar';
  return 'Revisar';
}

function getModuleMode(group: ModuleCard['group']) {
  if (group === 'gestion') return 'Permisos y seguimiento';
  if (group === 'analitica') return 'Lectura ejecutiva';
  if (group === 'expediente') return 'Archivo laboral';
  return 'Operación del día';
}

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
  const workSignals = isAdmin ? adminSignals : employeeSignals;
  const reviewNotes = isAdmin ? adminReviewNotes : employeeReviewNotes;

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

          <div className="srh-command-proof">
            {workSignals.map((item) => (
              <article key={item.title}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="srh-hero-brief">
            <span>Lectura rápida</span>
            <p>
              {isAdmin
                ? 'Prioriza lo que afecta la jornada de hoy, deja evidencia clara y evita cambiar de módulo sin cerrar el caso.'
                : 'Consulta tu información laboral desde un punto de entrada claro, con documentos y solicitudes ordenadas por estado.'}
            </p>
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

          <div className="srh-priority-checklist">
            <span>Antes de cerrar</span>
            <ul>
              <li>Empleado y fecha identificados.</li>
              <li>Evidencia o documento revisado.</li>
              <li>Acción guardada o escalada con contexto.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="srh-day-panel" aria-label="Resumen de jornada">
        <article>
          <SmartRhIcon name="calendar" />
          <span>Hoy</span>
          <strong>{todayLabel}</strong>
          <p>{isAdmin ? 'Inicia con pendientes que requieren decisión.' : 'Revisa tu estado laboral sin buscar en varios lugares.'}</p>
        </article>

        <article>
          <SmartRhIcon name={isAdmin ? 'users' : 'documents'} />
          <span>Modo de trabajo</span>
          <strong>{isAdmin ? 'Operación RH' : 'Autoservicio'}</strong>
          <p>{isAdmin ? 'Herramientas para personal, permisos y seguimiento.' : 'Accesos personales disponibles para consulta.'}</p>
        </article>

        <article>
          <SmartRhIcon name="spark" />
          <span>Max</span>
          <strong>Disponible</strong>
          <p>Úsalo para ubicar pasos, módulo y contexto antes de escalar.</p>
        </article>
      </section>

      <section className="srh-path-board">
        <div className="srh-section-heading">
          <span>Ruta sugerida</span>
          <h2>{isAdmin ? 'Cómo revisar sin perder contexto' : 'Tu información laboral en orden'}</h2>
        </div>

        <div className="srh-path-steps">
          <article>
            <div>
              <b>01</b>
              <strong>Identifica el caso</strong>
            </div>
            <p>Empleado, fecha, solicitud o documento. Ese dato define el módulo correcto.</p>
          </article>
          <article>
            <div>
              <b>02</b>
              <strong>Confirma evidencia</strong>
            </div>
            <p>Revisa comprobante, jornada, archivo o autorización antes de decidir.</p>
          </article>
          <article>
            <div>
              <b>03</b>
              <strong>Deja seguimiento</strong>
            </div>
            <p>Guarda el cambio o prepara el ticket con Max si requiere soporte.</p>
          </article>
        </div>

        <div className="srh-review-notes">
          {reviewNotes.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="srh-module-lab">
        <div className="srh-section-heading">
          <span>Módulos</span>
          <h2>Accesos por flujo de trabajo</h2>
          <p>Organizados por intención: primero revisas el tipo de caso, después entras al módulo correcto.</p>
        </div>

        <div className="srh-module-columns">
          {groupedModules.map((group) => (
            <section className="srh-module-column" key={group.id}>
              <div className="srh-module-column-head">
                <div>
                  <em>{getModuleMode(group.id)}</em>
                  <strong>{group.label}</strong>
                  <p>{group.description}</p>
                </div>
                <span>{group.modules.length}</span>
              </div>

              <div className="srh-module-pills">
                {group.modules.map((module) => (
                  <Link key={module.path} to={module.path} className="srh-module-pill">
                    <SmartRhIcon name={module.icon} />
                    <div className="srh-module-main">
                      <em>{module.cue}</em>
                      <strong>{module.title}</strong>
                      <span>{module.description}</span>
                    </div>
                    <div className="srh-module-action">
                      <small>{getModuleAction(module.group)}</small>
                      <SmartRhIcon name="chevronDown" />
                    </div>
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
