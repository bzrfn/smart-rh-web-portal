import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';
import PasswordField from '../../components/PasswordField';
import SmartRhIcon from '../../components/SmartRhIcon';

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('smart_rh_theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('smart_rh_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setInfo('');

    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio || !contrasena.trim()) {
      setError('Ingresa correo y contraseña.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post('/auth/login', {
        correo: correoLimpio,
        contrasena,
      });

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo iniciar sesión.');
        return;
      }

      if (data?.requiresEmailVerification) {
        navigate('/verify-account', {
          state: {
            correo: data?.correo || correoLimpio,
            message: data?.message,
          },
        });
        return;
      }

      if (data?.requires2FA) {
        if (!data?.challengeId) {
          setError(
            'No se recibió el identificador de seguridad del segundo factor.'
          );
          return;
        }

        navigate('/verify-login-code', {
          state: {
            correo: data?.correo || correoLimpio,
            challengeId: data.challengeId,
            message: data?.message,
          },
        });
        return;
      }

      if (data?.token && data?.user) {
        setAuthToken(data.token);
        setAuth({ token: data.token, user: data.user });
        navigate('/portal', { replace: true });
        return;
      }

      setInfo('Se requiere verificación por correo para continuar.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-premium">
      <button className="auth-theme-toggle" type="button" onClick={toggleTheme}>
        <span className="auth-theme-toggle-icon">
          <SmartRhIcon name={theme === 'dark' ? 'sun' : 'moon'} />
        </span>
        <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>

      <Link to="/" className="auth-back-home">
        ← Volver al sitio principal
      </Link>

      <div className="bg-shape bg-shape-top-left-large" />
      <div className="bg-shape bg-shape-top-left-small" />
      <div className="bg-shape bg-shape-bottom-right-large" />
      <div className="bg-shape bg-shape-bottom-right-small" />

      <div className="auth-premium-grid">
        <div className="auth-showcase-card">
          <div className="auth-showcase-badge">Portal administrativo</div>

          <h1 className="auth-showcase-title">SMART RH</h1>

          <p className="auth-showcase-text">
            Una entrada limpia al ecosistema SMART RH: portal, asistencia,
            documentos, solicitudes, soporte y análisis desde un mismo flujo.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Trabajo diario</h3>
                <p>
                  Entra a asistencia, documentos, vacaciones e incapacidades sin
                  perder el contexto de tu jornada.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Gestión administrativa</h3>
                <p>
                  Administra usuarios, permisos, solicitudes y soporte con módulos
                  claros para cada responsabilidad.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Max integrado</h3>
                <p>
                  Usa el asistente para resolver dudas, ordenar contexto y preparar
                  tickets cuando el caso lo necesite.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-wrapper auth-wrapper-premium">
          <div className="auth-brand-block">
            <h1 className="auth-brand">SMART RH</h1>
            <p className="auth-brand-subtitle">Tecnología en recursos humanos</p>
          </div>

          <form className="auth-card auth-card-premium" onSubmit={submit}>
            <div className="auth-card-header">
              <div>
                <p className="auth-eyebrow">Acceso seguro</p>
                <h2 className="auth-title">Iniciar sesión</h2>
              </div>

              <div className="auth-card-icon">↗</div>
            </div>

            <p className="auth-description">
              Ingresa tus credenciales para continuar al portal de SMART RH.
            </p>

            <label className="auth-label">Correo</label>
            <input
              className="auth-input"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Email"
              autoComplete="username"
            />

            <PasswordField
              label="Contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
            />

            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? 'Validando...' : 'Entrar al portal'}</span>
              <span className="auth-submit-icon">→</span>
            </button>

            {error && <p className="auth-error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}

            <div className="auth-footer-links">
              <Link to="/forgot-password" className="auth-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
