import {
  useState,
} from 'react';

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  api,
} from '../../services/api';


type LocationState = {
  correo?: string;
  adminAccessToken?: string;
};


export default function AdminLogin() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const state =
    (
      location.state ||
      {}
    ) as LocationState;

  const correo =
    String(
      state.correo ||
      ''
    )
      .trim()
      .toLowerCase();

  const adminAccessToken =
    String(
      state.adminAccessToken ||
      ''
    )
      .trim();

  const [
    contrasena,
    setContrasena,
  ] =
    useState(
      ''
    );

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  if (
    !correo ||
    !adminAccessToken
  ) {
    return (
      <Navigate
        to="/admin/acceso"
        replace
      />
    );
  }


  async function submit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(
      ''
    );

    if (!contrasena) {
      setError(
        'Ingresa la contraseña administrativa.'
      );

      return;
    }

    try {
      setLoading(
        true
      );

      const {
        data,
      } =
        await api.post(
          '/auth/admin-login',
          {
            correo,
            contrasena,
          },
          {
            headers: {
              Authorization:
                `Bearer ${adminAccessToken}`,
            },
          }
        );

      if (
        !data?.ok ||
        !data?.requires2FA ||
        !data?.challengeId
      ) {
        setError(
          data?.message ||
          'No fue posible iniciar el segundo factor.'
        );

        return;
      }

      navigate(
        '/verify-login-code',
        {
          replace:
            true,

          state: {
            correo:
              data?.correo ||
              correo,

            challengeId:
              data.challengeId,

            message:
              data?.message,

            adminFlow:
              true,
          },
        }
      );

    } catch (
      err: any
    ) {
      setError(
        err?.response?.data?.message ||
        'Acceso administrativo inválido o expirado.'
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  return (
    <div className="auth-page auth-page-premium">
      <Link
        to="/admin/acceso"
        className="auth-back-home"
      >
        ← Volver a la autorización
      </Link>

      <div className="auth-premium-grid">
        <div className="auth-showcase-card">
          <div className="auth-showcase-badge">
            Identidad administrativa verificada
          </div>

          <h1 className="auth-showcase-title">
            SMART RH
          </h1>

          <p className="auth-showcase-text">
            La autorización por correo fue validada.
            Ahora ingresa la contraseña de la misma cuenta.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>Correo vinculado</h3>
                <p>
                  La contraseña solo se acepta para la cuenta
                  que completó la preautorización.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>2FA obligatorio</h3>
                <p>
                  Una contraseña válida no entrega una sesión:
                  todavía falta el segundo código.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-wrapper auth-wrapper-premium">
          <form
            className="auth-card auth-card-premium"
            onSubmit={submit}
          >
            <div className="auth-card-header">
              <div>
                <p className="auth-eyebrow">
                  Inicio administrativo
                </p>

                <h2 className="auth-title">
                  Contraseña
                </h2>
              </div>

              <div className="auth-card-icon">
                ↗
              </div>
            </div>

            <p className="auth-description">
              Cuenta administrativa previamente autorizada:
            </p>

            <div className="auth-email-chip">
              {correo}
            </div>

            <label className="auth-label">
              Contraseña
            </label>

            <input
              className="auth-input"
              type="password"
              value={contrasena}
              onChange={
                (
                  event
                ) =>
                  setContrasena(
                    event.target.value
                  )
              }
              placeholder="Contraseña"
              autoComplete="current-password"
              autoFocus
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? 'Validando...'
                  : 'Continuar con 2FA'}
              </span>

              <span className="auth-submit-icon">
                →
              </span>
            </button>

            {error && (
              <p className="auth-error">
                {error}
              </p>
            )}

            <div className="auth-footer-links">
              <Link
                to="/admin/acceso"
                className="auth-link primary"
              >
                Solicitar nueva autorización
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
