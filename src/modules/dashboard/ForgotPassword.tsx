import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setInfo('');

    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio) {
      setError('Ingresa tu correo.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post('/auth/forgot-password', {
        correo: correoLimpio,
      });

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo enviar el código.');
        return;
      }

      setInfo(data?.message ?? 'Código enviado al correo.');

      navigate('/reset-password', {
        state: {
          correo: correoLimpio,
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
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
          <div className="auth-showcase-badge">Recuperación segura</div>

          <h1 className="auth-showcase-title">Recuperar acceso</h1>

          <p className="auth-showcase-text">
            Recibe un código temporal por correo para restablecer tu contraseña
            de forma segura.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Código por email</h3>
                <p>El código llegará al correo asociado con tu cuenta SMART RH.</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Vigencia limitada</h3>
                <p>El código es temporal y solo puede usarse una vez.</p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Confirmación automática</h3>
                <p>Al actualizar la contraseña recibirás un correo de confirmación.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-wrapper auth-wrapper-premium">
          <div className="auth-brand-block">
            <h1 className="auth-brand">SMART RH</h1>
            <p className="auth-brand-subtitle">Recuperación de acceso</p>
          </div>

          <form className="auth-card auth-card-premium" onSubmit={submit}>
            <div className="auth-card-header">
              <div>
                <p className="auth-eyebrow">Soporte de acceso</p>
                <h2 className="auth-title">Enviar código</h2>
              </div>

              <div className="auth-card-icon">⟳</div>
            </div>

            <p className="auth-description">
              Ingresa el correo de la cuenta para recibir un código temporal.
            </p>

            <label className="auth-label">Correo</label>
            <input
              className="auth-input"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@empresa.com"
              autoComplete="email"
            />

            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? 'Enviando...' : 'Enviar código'}</span>
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