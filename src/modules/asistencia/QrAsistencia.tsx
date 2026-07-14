import QrGenerator from './QrGenerator';
import { useAuth } from '../../app/auth/AuthContext';

export default function QrAsistencia() {
  const { user, token } = useAuth();

  if (!token) {
    return (
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Acceso</p>
            <h2 className="module-title">QR de asistencia</h2>
            <p className="module-subtitle">
              Debes iniciar sesión para acceder al generador de QR.
            </p>
          </div>
        </div>

        <div className="empty-state-card">
          <h3>Sesión requerida</h3>
          <p>Inicia sesión para continuar con el módulo de QR de asistencia.</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="dashboard-page">
        <div className="module-card">
          <div className="module-card-header">
            <div>
              <p className="module-eyebrow">Control administrativo</p>
              <h2 className="module-title">QR de asistencia</h2>
              <p className="module-subtitle">
                Este módulo está disponible únicamente para perfiles administrativos.
              </p>
            </div>
          </div>

          <div className="module-hero-banner">
            <div className="module-hero-copy">
              <h3>Acceso restringido</h3>
              <p>
                No cuentas con permisos para generar códigos QR dinámicos de asistencia.
              </p>
            </div>

            <div className="module-hero-badge module-hero-badge-danger">
              Solo administrador
            </div>
          </div>

          <div className="empty-state-card">
            <h3>Permisos insuficientes</h3>
            <p>
              Solicita acceso al administrador del sistema si este módulo forma parte de
              tus funciones operativas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Control administrativo</p>
            <h2 className="module-title">QR de asistencia</h2>
            <p className="module-subtitle">
              Genera y administra el código QR dinámico utilizado para el registro del
              personal desde la aplicación móvil.
            </p>
          </div>
        </div>

        <div className="module-hero-banner">
          <div className="module-hero-copy">
            <h3>Generación dinámica en tiempo real</h3>
            <p>
              El sistema emite un QR temporal, lo actualiza automáticamente cada 15
              segundos y mantiene limpia la tabla de tokens expirados.
            </p>
          </div>

          <div className="module-hero-badge">Operación en tiempo real</div>
        </div>

        <QrGenerator />
      </div>
    </div>
  );
}