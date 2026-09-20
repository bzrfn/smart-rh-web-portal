import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

type LocationState = {
  correo?: string;
  resetToken?: string;
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || {}) as LocationState;

  const [token, setToken] = useState(state.resetToken ?? '');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const correo = state.correo || '';

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setInfo('');

    if (!correo.trim()) {
      setError('La sesión de recuperación no es válida. Solicita un nuevo código.');
      return;
    }

    if (!token.trim() || !nuevaContrasena.trim() || !confirmarContrasena.trim()) {
      setError('Ingresa código, nueva contraseña y confirmación.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post('/auth/reset-password', {
        correo: correo.trim(),
        codigo: token.trim(),
        nuevaContrasena,
      });

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo actualizar la contraseña.');
        return;
      }

      setInfo(data?.message ?? 'Contraseña actualizada correctamente.');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1400);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const normalizeCode = (value: string) => {
    setToken(value.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <div className="auth-page auth-page-premium">
      <Link to="/" className="auth-back-home">
        ← Volver al sitio principal
      </Link>

      <div className="bg-shape bg-shape-top-left-large" />
      <div className="bg-shape bg-shape-top-left-small" />
      <div className="bg-shape bg-shape-bottom-right-large" />
      <div className="bg-shape bg-shape-bottom-right-small" />

      <div className="auth-premium-grid">
        <div className="auth-showcase-card">
          <div className="auth-showcase-badge">Restablecimiento</div>

          <h1 className="auth-showcase-title">Actualizar contraseña</h1>

          <p className="auth-showcase-text">
            Restablece el acceso de forma segura utilizando el código temporal enviado
            al correo de la cuenta.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Control por código</h3>
                <p>Validación previa antes de permitir la actualización de credenciales.</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Proceso guiado</h3>
                <p>Interfaz clara para completar el restablecimiento sin ambigüedad.</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Confirmación por email</h3>
                <p>SMART RH enviará un aviso cuando la contraseña sea actualizada.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-wrapper auth-wrapper-premium">
          <div className="auth-brand-block">
            <h1 className="auth-brand">SMART RH</h1>
            <p className="auth-brand-subtitle">Restablecer contraseña</p>
          </div>

          <form className="auth-card auth-card-premium" onSubmit={submit}>
            <div className="auth-card-header">
              <div>
                <p className="auth-eyebrow">Actualización de acceso</p>
                <h2 className="auth-title">Nueva contraseña</h2>
              </div>

              <div className="auth-card-icon">✓</div>
            </div>

            <p className="auth-description">
              Ingresa el código recibido por correo y define una nueva contraseña.
            </p>

            {correo && <div className="auth-email-chip">{correo}</div>}

            <label className="auth-label">Código</label>
            <input
              className="auth-input auth-code-input"
              value={token}
              onChange={(e) => normalizeCode(e.target.value)}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
            />

            <label className="auth-label">Nueva contraseña</label>
            <input
              className="auth-input"
              type="password"
              value={nuevaContrasena}
              onChange={(e) => setNuevaContrasena(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <label className="auth-label">Confirmar contraseña</label>
            <input
              className="auth-input"
              type="password"
              value={confirmarContrasena}
              onChange={(e) => setConfirmarContrasena(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? 'Actualizando...' : 'Actualizar contraseña'}</span>
              <span className="auth-submit-icon">✓</span>
            </button>

            {error && <p className="auth-error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}

            <div className="auth-footer-links">
              <Link to="/login" className="auth-link primary">
                Volver al login
              </Link>

              <Link to="/" className="auth-link">
                Ir al sitio principal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}