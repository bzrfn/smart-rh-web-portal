import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

type LocationState = {
  correo?: string;
  challengeId?: string;
  message?: string;
};

export default function VerifyLoginCode() {
  const { setAuth, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || {}) as LocationState;
  const correo = state.correo || '';
  const challengeId = state.challengeId || '';

  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(state.message || 'Ingresa el código enviado a tu correo.');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/portal" replace />;
  }

  if (!correo || !challengeId) {
    return <Navigate to="/login" replace />;
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setInfo('');

    if (!codigo.trim()) {
      setError('Ingresa el código de acceso.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post('/auth/verify-login-code', {
        challengeId,
        codigo: codigo.trim(),
      });

      if (!data?.ok || !data?.token || !data?.user) {
        setError(data?.message ?? 'No se pudo verificar el código.');
        return;
      }

      setAuthToken(data.token);
      setAuth({ token: data.token, user: data.user });
      navigate('/portal', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const normalizeCode = (value: string) => {
    setCodigo(value.replace(/\D/g, '').slice(0, 6));
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
          <div className="auth-showcase-badge">Acceso 2FA</div>

          <h1 className="auth-showcase-title">Código de acceso</h1>

          <p className="auth-showcase-text">
            Para proteger el portal administrativo, SMART RH solicita un código de un solo uso
            enviado al correo asociado a la cuenta.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Verificación temporal</h3>
                <p>El código es válido solo por unos minutos y se consume al usarlo.</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Correo asociado</h3>
                <p>El código fue enviado a: {correo}</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Acceso protegido</h3>
                <p>Solo después de validar el código se entrega la sesión administrativa.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-wrapper auth-wrapper-premium">
          <div className="auth-brand-block">
            <h1 className="auth-brand">SMART RH</h1>
            <p className="auth-brand-subtitle">Autenticación de dos factores</p>
          </div>

          <form className="auth-card auth-card-premium" onSubmit={submit}>
            <div className="auth-card-header">
              <div>
                <p className="auth-eyebrow">Verificación segura</p>
                <h2 className="auth-title">Código 2FA</h2>
              </div>

              <div className="auth-card-icon"></div>
            </div>

            <p className="auth-description">
              Escribe el código de 6 dígitos enviado a tu correo.
            </p>

            <div className="auth-email-chip">{correo}</div>

            <label className="auth-label">Código</label>
            <input
              className="auth-input auth-code-input"
              value={codigo}
              onChange={(e) => normalizeCode(e.target.value)}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />

            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? 'Verificando...' : 'Verificar y entrar'}</span>
              <span className="auth-submit-icon">→</span>
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