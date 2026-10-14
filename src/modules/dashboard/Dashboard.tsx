import { useEffect, useMemo, useState } from 'react';
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
    description: 'Entradas, salidas, comentarios y casos pendientes de revisión.',
    cue: 'Jornada diaria',
    icon: 'attendance',
    group: 'operacion',
  },
  {
    path: '/portal/calendario',
    title: 'Calendario',
    description: 'Fechas laborales, descansos, vacaciones e incapacidades en un solo lugar.',
    cue: 'Fechas clave',
    icon: 'calendar',
    group: 'operacion',
  },
  {
    path: '/portal/vacaciones',
    title: 'Vacaciones',
    description: 'Días disponibles, solicitudes y seguimiento de descansos del personal.',
    cue: 'Descansos',
    icon: 'vacation',
    group: 'operacion',
  },
  {
    path: '/portal/incapacidades',
    title: 'Incapacidades',
    description: 'Justificantes médicos, estado de revisión y decisión del área responsable.',
    cue: 'Justificantes',
    icon: 'health',
    group: 'operacion',
    adminOnly: true,
  },
  {
    path: '/portal/documentacion',
    title: 'Documentos',
    description: 'Archivos del empleado, credencial y documentos laborales disponibles.',
    cue: 'Archivos',
    icon: 'documents',
    group: 'expediente',
  },
  {
    path: '/portal/contratos',
    title: 'Contratos',
    description: 'Contratos activos, fechas importantes y documentos relacionados.',
    cue: 'Acuerdos',
    icon: 'contracts',
    group: 'expediente',
  },
  {
    path: '/portal/nomina',
    title: 'Nómina',
    description: 'Recibos, periodos de pago y comprobantes disponibles para consulta.',
    cue: 'Recibos',
    icon: 'payroll',
    group: 'expediente',
  },
  {
    path: '/portal/usuarios',
    title: 'Usuarios',
    description: 'Personas registradas, permisos de acceso y módulos habilitados.',
    cue: 'Personas',
    icon: 'users',
    group: 'gestion',
  },
  {
    path: '/portal/soporte',
    title: 'Soporte',
    description: 'Solicitudes de ayuda, dudas reportadas y seguimiento hasta cierre.',
    cue: 'Ayuda',
    icon: 'support',
    group: 'gestion',
    adminOnly: true,
  },
  {
    path: '/portal/etl',
    title: 'Datos',
    description: 'Organiza información para que los reportes se mantengan claros y actualizados.',
    cue: 'Preparación',
    icon: 'data',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/dashboard-analitico',
    title: 'Reportes',
    description: 'Gráficas e indicadores para entender el comportamiento de la operación.',
    cue: 'Indicadores',
    icon: 'chart',
    group: 'analitica',
    adminOnly: true,
  },
  {
    path: '/portal/analisis-supervisado',
    title: 'Predicciones',
    description: 'Señales que ayudan a anticipar riesgos o tendencias del personal.',
    cue: 'Tendencias',
    icon: 'chart',
    group: 'analitica',
    adminOnly: true,
  },
];

const moduleGroups = [
  {
    id: 'operacion',
    label: 'Operación diaria',
    description: 'Lo que se revisa durante el día: asistencia, fechas y solicitudes.',
  },
  {
    id: 'expediente',
    label: 'Expediente laboral',
    description: 'Información laboral que debe estar disponible y ordenada.',
  },
  {
    id: 'gestion',
    label: 'Gestión interna',
    description: 'Herramientas para administrar personas, permisos y solicitudes de ayuda.',
  },
  {
    id: 'analitica',
    label: 'Reportes y datos',
    description: 'Lecturas claras para tomar decisiones sin revisar archivos sueltos.',
  },
] as const satisfies ReadonlyArray<{
  id: ModuleCard['group'];
  label: string;
  description: string;
}>;

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
  if (group === 'analitica') return 'Ver reporte';
  if (group === 'expediente') return 'Consultar';
  return 'Revisar';
}

function getModuleMode(group: ModuleCard['group']) {
  if (group === 'gestion') return 'Administración';
  if (group === 'analitica') return 'Reportes claros';
  if (group === 'expediente') return 'Consulta laboral';
  return 'Trabajo diario';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activePriority, setActivePriority] = useState(0);
  const [openModuleGroups, setOpenModuleGroups] = useState<ModuleCard['group'][]>(() =>
    moduleGroups.map((group) => group.id)
  );
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

  useEffect(() => {
    setActivePriority(0);
  }, [isAdmin]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActivePriority((current) => (current + 1) % priorities.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [priorities.length]);

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

          <div className="srh-priority-dots" aria-label="Cambiar prioridad del carrusel">
            {priorities.map((item, index) => (
              <button
                key={item.title}
                className={index === activePriority ? 'is-active' : ''}
                type="button"
                aria-label={`Mostrar ${item.meta}`}
                onClick={() => setActivePriority(index)}
              >
                <span className="srh-priority-dot" aria-hidden="true" />
                <span className="srh-priority-label">{item.meta}</span>
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
          <h2>Accesos organizados por necesidad</h2>
          <p>Primero identifica qué necesitas revisar; después entra al apartado correspondiente sin depender de términos técnicos.</p>
        </div>

        <div className="srh-module-columns srh-module-accordion">
          {groupedModules.map((group) => {
            const isOpen = openModuleGroups.includes(group.id);
            const panelId = `module-group-${group.id}`;

            return (
              <section className={`srh-module-column${isOpen ? ' is-open' : ''}`} key={group.id}>
                <button
                  className="srh-module-column-head"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenModuleGroups((current) =>
                      current.includes(group.id)
                        ? current.filter((item) => item !== group.id)
                        : [...current, group.id]
                    )
                  }
                >
                  <span className="srh-module-group-copy">
                    <em>{getModuleMode(group.id)}</em>
                    <strong>{group.label}</strong>
                    <span>{group.description}</span>
                  </span>
                  <span className="srh-module-group-controls" aria-hidden="true">
                    <span className="srh-module-group-count">{group.modules.length}</span>
                    <span className="srh-module-group-toggle">
                      <SmartRhIcon name="chevronDown" />
                    </span>
                  </span>
                </button>

                <div
                  className="srh-module-collapse"
                  id={panelId}
                  aria-hidden={!isOpen}
                >
                  <div className="srh-module-collapse-inner">
                    <div className="srh-module-pills">
                      {group.modules.map((module) => (
                        <Link
                          key={module.path}
                          to={module.path}
                          className="srh-module-pill"
                          tabIndex={isOpen ? 0 : -1}
                        >
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
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
