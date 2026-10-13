import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ProtectedImage from '../../components/ProtectedImage';
import AsistenteSmartRh from '../../modules/chatbot/AsistenteSmartRh';
import SmartRhIcon, { SmartRhIconName } from '../../components/SmartRhIcon';

type NavItem = {
  path: string;
  label: string;
  icon: SmartRhIconName;
  description: string;
  adminOnly?: boolean;
};

const AUTH_STORAGE_KEY = 'rrhh_auth';

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const headerActionsRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState(
    () => localStorage.getItem('smart_rh_theme') || 'light'
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('smart_rh_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerActionsRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setCalendarOpen(false);
        setQuickOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  /*
    Protección directa del layout privado:
    si AppShell pierde el usuario, se elimina la sesión local
    y se redirige al login.
  */
  useEffect(() => {
    if (!user) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  /*
    Protección contra back/forward cache.
  */
  useEffect(() => {
    const handlePageShow = () => {
      const hasStoredSession = !!localStorage.getItem(AUTH_STORAGE_KEY);

      if (!hasStoredSession) {
        logout();
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [logout, navigate]);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      {
        path: '/portal',
        label: 'Dashboard',
        icon: 'home',
        description: '',
      },
      {
        path: '/portal/usuarios',
        label: 'Usuarios',
        icon: 'users',
        description: 'Personal y accesos',
      },
      {
        path: '/portal/asistencia',
        label: 'Asistencia',
        icon: 'attendance',
        description: 'Registros laborales',
      },
      {
        path: '/portal/calendario',
        label: 'Calendario',
        icon: 'calendar',
        description: 'Agenda laboral',
      },
      {
        path: '/portal/documentacion',
        label: 'Documentos',
        icon: 'documents',
        description: 'Expediente digital',
      },
      {
        path: '/portal/contratos',
        label: 'Contratos',
        icon: 'contracts',
        description: 'Gestión contractual',
      },
      {
        path: '/portal/nomina',
        label: 'Nómina',
        icon: 'payroll',
        description: 'Pagos y periodos',
      },
      {
        path: '/portal/vacaciones',
        label: 'Vacaciones',
        icon: 'vacation',
        description: 'Solicitudes y saldos',
      },
      {
        path: '/portal/incapacidades',
        label: 'Incapacidades',
        icon: 'health',
        description: 'Solicitudes médicas',
        adminOnly: true,
      },
      {
        path: '/portal/soporte',
        label: 'Soporte',
        icon: 'support',
        description: 'Tickets e incidencias',
        adminOnly: true,
      },
      {
        path: '/portal/analisis-supervisado',
        label: 'ML',
        icon: 'chart',
        description: 'Predicción supervisada',
        adminOnly: true,
      },
      {
        path: '/portal/etl',
        label: 'ETL',
        icon: 'data',
        description: 'Análisis de datos',
        adminOnly: true,
      },
    ];

    return items.filter(
      (item) => !item.adminOnly || user?.role === 'admin'
    );
  }, [user?.role]);

  const activeItem = useMemo(() => {
    return (
      navItems.find((item) => item.path === location.pathname) ||
      navItems[0]
    );
  }, [location.pathname, navItems]);

  const navGroups = useMemo(
    () => [
      {
        title: 'Inicio',
        detail: 'Tablero principal',
        items: navItems.filter((item) => item.path === '/portal'),
      },
      {
        title: 'Operación diaria',
        detail: 'Asistencia, agenda y ausencias',
        items: navItems.filter((item) =>
          [
            '/portal/usuarios',
            '/portal/asistencia',
            '/portal/calendario',
            '/portal/vacaciones',
            '/portal/incapacidades',
          ].includes(item.path)
        ),
      },
      {
        title: 'Expediente laboral',
        detail: 'Documentos, contratos y nómina',
        items: navItems.filter((item) =>
          ['/portal/documentacion', '/portal/contratos', '/portal/nomina'].includes(item.path)
        ),
      },
      {
        title: 'Seguimiento',
        detail: 'Soporte, analítica y datos',
        items: navItems.filter((item) =>
          ['/portal/soporte', '/portal/analisis-supervisado', '/portal/etl'].includes(item.path)
        ),
      },
    ].filter((group) => group.items.length > 0),
    [navItems]
  );

  const quickActions = useMemo(
    () => [
      {
        path: '/portal/calendario',
        label: 'Calendario',
        detail: 'Agenda laboral',
        icon: 'calendar' as const,
      },
      {
        path: '/portal/documentacion',
        label: 'Documentos',
        detail: 'Expediente digital',
        icon: 'documents' as const,
      },
      {
        path: '/portal/vacaciones',
        label: 'Vacaciones',
        detail: 'Saldos y solicitudes',
        icon: 'vacation' as const,
      },
    ],
    []
  );

  const notificationItems = useMemo(
    () => [
      {
        title: 'Revisión operativa',
        detail: location.pathname === '/portal/asistencia'
          ? 'Estás dentro de asistencia.'
          : 'Revisa asistencia pendiente cuando termines tu flujo actual.',
        path: '/portal/asistencia',
      },
      {
        title: 'Documentación',
        detail: 'Mantén expediente, contratos y credencial al día.',
        path: '/portal/documentacion',
      },
      {
        title: 'Max disponible',
        detail: 'Puedes pedirle contexto de cualquier módulo desde el botón flotante.',
        path: '/portal',
      },
    ],
    [location.pathname]
  );

  const calendarItems = useMemo(
    () => [
      {
        label: 'Hoy',
        title: 'Seguimiento de asistencia',
        detail: 'Confirma registros pendientes y jornadas del día.',
        path: '/portal/asistencia',
        icon: 'attendance' as const,
      },
      {
        label: 'Semana',
        title: 'Ausencias y vacaciones',
        detail: 'Revisa solicitudes próximas antes de cierre operativo.',
        path: '/portal/vacaciones',
        icon: 'vacation' as const,
      },
      {
        label: 'Control',
        title: 'Incapacidades',
        detail: user?.role === 'admin'
          ? 'Valida comprobantes y casos médicos pendientes.'
          : 'Consulta el estado de tus solicitudes registradas.',
        path: '/portal/incapacidades',
        icon: 'health' as const,
      },
    ],
    [user?.role]
  );

  const miniCalendar = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      return {
        key: date.toISOString(),
        day: date.getDate(),
        muted: date.getMonth() !== month,
        today: date.toDateString() === today.toDateString(),
      };
    });
  }, []);

  const userInitials = useMemo(() => {
    const nombre = user?.nombre?.[0] || 'S';
    const apellido = user?.apellido?.[0] || 'R';

    return `${nombre}${apellido}`.toUpperCase();
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    localStorage.removeItem(AUTH_STORAGE_KEY);

    navigate('/login', { replace: true });

    setTimeout(() => {
      window.history.replaceState(null, '', '/login');
    }, 0);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="top-shell">
      <header className="top-shell-header">
        <div className="top-brand">
          <button
            className="top-menu-trigger"
            type="button"
            aria-label="Abrir navegación"
            onClick={() => setNavigationOpen(true)}
          >
            <SmartRhIcon name="menu" />
          </button>

          <Link to="/portal" className="top-logo">
            SRH
          </Link>

          <div>
            <h1>SMART RH</h1>
            <p>Suite empresarial de Recursos Humanos</p>
          </div>
        </div>

        <div className="top-header-center">
          <span>Portal administrativo</span>
          <h2>{activeItem?.label || 'Dashboard'}</h2>
          <p>{activeItem?.description || ''}</p>
        </div>

        <div className="top-user-area" ref={headerActionsRef}>
          <div className="top-quick-actions" aria-label="Accesos rápidos">
            <Link
              to="/portal"
              className="top-icon-btn"
              aria-label="Ir al inicio"
              title="Inicio"
            >
              <SmartRhIcon name="home" />
            </Link>

            <button
              className={`top-icon-btn ${calendarOpen ? 'is-active' : ''}`}
              type="button"
              aria-label="Abrir calendario rápido"
              title="Calendario"
              onClick={() => {
                setCalendarOpen((value) => !value);
                setNotificationsOpen(false);
                setQuickOpen(false);
                setProfileOpen(false);
              }}
            >
              <SmartRhIcon name="calendar" />
            </button>

            <button
              className={`top-icon-btn ${notificationsOpen ? 'is-active' : ''}`}
              type="button"
              aria-label="Abrir notificaciones"
              title="Notificaciones"
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setCalendarOpen(false);
                setQuickOpen(false);
                setProfileOpen(false);
              }}
            >
              <SmartRhIcon name="bell" />
            </button>

            <button
              className="top-icon-btn"
              type="button"
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <SmartRhIcon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>

            <button
              className={`top-icon-btn ${quickOpen ? 'is-active' : ''}`}
              type="button"
              aria-label="Abrir más accesos"
              title="Más accesos"
              onClick={() => {
                setQuickOpen((value) => !value);
                setCalendarOpen(false);
                setNotificationsOpen(false);
                setProfileOpen(false);
              }}
            >
              <SmartRhIcon name="spark" />
            </button>
          </div>

          {calendarOpen ? (
            <div className="top-popover top-popover-calendar">
              <div className="top-popover-header">
                <span>Calendario</span>
                <strong>{new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</strong>
              </div>

              <div className="top-mini-calendar" aria-label="Mini calendario">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                  <span key={`${day}-${index}`} className="top-mini-calendar-dayname">
                    {day}
                  </span>
                ))}

                {miniCalendar.map((date) => (
                  <span
                    key={date.key}
                    className={`top-mini-calendar-date ${date.muted ? 'is-muted' : ''} ${date.today ? 'is-today' : ''}`}
                  >
                    {date.day}
                  </span>
                ))}
              </div>

              <div className="top-popover-list">
                {calendarItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.path}
                    className="top-calendar-item"
                    onClick={() => setCalendarOpen(false)}
                  >
                    <SmartRhIcon name={item.icon} />
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                to="/portal/calendario"
                className="top-calendar-full-link"
                onClick={() => setCalendarOpen(false)}
              >
                Abrir calendario completo
              </Link>
            </div>
          ) : null}

          {notificationsOpen ? (
            <div className="top-popover top-popover-notifications">
              <div className="top-popover-header">
                <span>Notificaciones</span>
                <strong>Centro rápido</strong>
              </div>
              <div className="top-popover-list">
                {notificationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.path}
                    className="top-popover-item"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    <span />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {quickOpen ? (
            <div className="top-popover top-popover-quick">
              <div className="top-popover-header">
                <span>Accesos</span>
                <strong>Trabajo frecuente</strong>
              </div>
              <div className="top-popover-stair">
                {quickActions.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="top-stair-action"
                    onClick={() => setQuickOpen(false)}
                  >
                    <SmartRhIcon name={item.icon} />
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <button
            className={`top-user-card ${profileOpen ? 'is-active' : ''}`}
            type="button"
            onClick={() => {
              setProfileOpen((value) => !value);
              setCalendarOpen(false);
              setNotificationsOpen(false);
              setQuickOpen(false);
            }}
          >
            <div className="top-user-avatar">
              {user.foto_perfil_url ? (
                <ProtectedImage
                  src={user.foto_perfil_url}
                  alt="Foto de perfil"
                  fallback={<span>{userInitials}</span>}
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>

            <div>
              <strong>{user.nombre || 'Usuario'}</strong>
              <small>{user.role || 'empleado'}</small>
            </div>

            <SmartRhIcon className="top-user-chevron" name="chevronDown" />
          </button>

          {profileOpen ? (
            <div className="top-popover top-popover-profile">
              <div className="top-profile-summary">
                <div className="top-user-avatar">
                  {user.foto_perfil_url ? (
                    <ProtectedImage
                      src={user.foto_perfil_url}
                      alt="Foto de perfil"
                      fallback={<span>{userInitials}</span>}
                    />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>
                <div>
                  <span>Bienvenido</span>
                  <strong>{`${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Usuario SMART RH'}</strong>
                  <p>{user.correo}</p>
                </div>
              </div>

              <div className="top-profile-links">
                <Link to="/portal/documentacion" onClick={() => setProfileOpen(false)}>
                  <SmartRhIcon name="documents" />
                  <span>Mi expediente</span>
                </Link>
                <Link to="/portal/asistencia" onClick={() => setProfileOpen(false)}>
                  <SmartRhIcon name="attendance" />
                  <span>Asistencia</span>
                </Link>
              </div>

              <button
                className="top-logout-btn"
                type="button"
                onClick={handleLogout}
              >
                <SmartRhIcon name="logout" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {navigationOpen ? (
        <button
          className="portal-nav-backdrop"
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setNavigationOpen(false)}
        />
      ) : null}

      <aside className={`portal-side-nav ${navigationOpen ? 'is-open' : ''}`} aria-hidden={!navigationOpen}>
        <div className="portal-side-nav-head">
          <div className="top-logo">SRH</div>
          <div>
            <span>Navegación</span>
            <strong>SMART RH</strong>
          </div>
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setNavigationOpen(false)}
          >
            <SmartRhIcon name="close" />
          </button>
        </div>

        <div className="portal-side-nav-current">
          <SmartRhIcon name={activeItem.icon} />
          <div>
            <span>Estás en</span>
            <strong>{activeItem.label}</strong>
          </div>
        </div>

        <div className="portal-side-nav-groups">
          {navGroups.map((group) => (
            <section key={group.title}>
              <div className="portal-nav-group-title">
                <strong>{group.title}</strong>
                <span>{group.detail}</span>
              </div>

              <div className="portal-side-nav-list">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`portal-side-nav-item ${isActive(item.path) ? 'active' : ''}`}
                  >
                    <span>
                      <SmartRhIcon name={item.icon} />
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      {item.description ? <small>{item.description}</small> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>

      <main className="top-shell-main">
        <Outlet />
      </main>

      <AsistenteSmartRh />
    </div>
  );
}
