import { NavLink } from 'react-router-dom';
import SmartRhIcon from './SmartRhIcon';

const analyticsModules = [
  {
    path: '/portal/etl',
    label: 'Datos',
    description: 'Reunir información',
    icon: 'data' as const,
  },
  {
    path: '/portal/dashboard-analitico',
    label: 'Reportes',
    description: 'Entender resultados',
    icon: 'chart' as const,
  },
  {
    path: '/portal/analisis-supervisado',
    label: 'Predicciones',
    description: 'Detectar casos por revisar',
    icon: 'spark' as const,
  },
];

export default function AnalyticsModuleNav() {
  return (
    <nav className="analytics-module-nav" aria-label="Navegación de reportes y datos">
      <div className="analytics-module-nav-copy">
        <span>Reportes y datos</span>
        <strong>Reunir información, entender resultados y decidir qué revisar</strong>
      </div>

      <div className="analytics-module-nav-links">
        {analyticsModules.map((module) => (
          <NavLink
            key={module.path}
            to={module.path}
            className={({ isActive }) =>
              `analytics-module-nav-link${isActive ? ' is-active' : ''}`
            }
          >
            <span className="analytics-module-nav-icon" aria-hidden="true">
              <SmartRhIcon name={module.icon} />
            </span>
            <span>
              <strong>{module.label}</strong>
              <small>{module.description}</small>
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
