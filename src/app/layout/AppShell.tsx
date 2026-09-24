import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ProtectedImage from '../../components/ProtectedImage';

type NavItem = {
  path: string;
  label: string;
  icon: string;
  description: string;
  adminOnly?: boolean;
};

const AUTH_STORAGE_KEY = 'rrhh_auth';

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(
    () => localStorage.getItem('smart_rh_theme') || 'light'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('smart_rh_theme', theme);
  }, [theme]);

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
        icon: '▦',
        description: '',
      },
      {
        path: '/portal/usuarios',
        label: 'Usuarios',
        icon: 'US',
        description: 'Personal y accesos',
      },
      {
        path: '/portal/asistencia',
        label: 'Asistencia',
        icon: 'AS',
        description: 'Registros laborales',
      },
            {
        path: '/portal/documentacion',
        label: 'Documentos',
        icon: 'DC',
        description: 'Expediente digital',
      },
      {
        path: '/portal/contratos',
        label: 'Contratos',
        icon: 'CT',
        description: 'Gestión contractual',
      },
      {
        path: '/portal/nomina',
        label: 'Nómina',
        icon: 'NM',
        description: 'Pagos y periodos',
      },
      {
        path: '/portal/vacaciones',
        label: 'Vacaciones',
        icon: 'VC',
        description: 'Solicitudes y saldos',
      },
      {
        path: '/portal/soporte',
        label: 'Soporte',
        icon: 'SP',
        description: 'Tickets e incidencias',
        adminOnly: true,
      },
      {
        path: '/portal/analisis-supervisado',
        label: 'ML',
        icon: 'ML',
        description: 'Predicción supervisada',
        adminOnly: true,
      },
      {
        path: '/portal/etl',
        label: 'ETL',
        icon: 'ETL',
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

        <div className="top-user-area">
          <div className="top-user-card">
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
          </div>

          <button
            className="top-theme-btn"
            type="button"
            onClick={() =>
              setTheme(theme === 'dark' ? 'light' : 'dark')
            }
          >
            {theme === 'dark' ? 'Claro' : 'Oscuro'}
          </button>

          <button
            className="top-logout-btn"
            type="button"
            onClick={handleLogout}
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="top-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`top-nav-item ${
              isActive(item.path) ? 'active' : ''
            }`}
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
          </Link>
        ))}
      </nav>

      <main className="top-shell-main">
        <Outlet />
      </main>
    </div>
  );
}
