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

  const adminAccessToken =
    String(
      state.adminAccessToken ||
      ''
    )
      .trim();

  const [
    correo,
    setCorreo,
  ] =
    useState(
      ''
    );

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


  /*
   * No se permite abrir directamente /admin/login.
   * Es obligatorio haber completado antes la autorización central.
   */
  if (!adminAccessToken) {
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

    const normalizedEmail =
      correo
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail ||
      !contrasena
    ) {
      setError(
        'Ingresa correo y contraseña administrativos.'
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
            correo:
              normalizedEmail,

            contrasena,
          },
          {
            headers: {
              Authorization:
                `Bearer ${adminAccessToken}`,
            },
          }
        );

      const challengeId =
        String(
          data?.challengeId ||
          ''
        )
          .trim()
          .toLowerCase();

      /*
       * Una contraseña correcta NO puede entregar sesión.
       * Debe producir un challenge 2FA.
       */
      if (
        data?.requires2FA &&
        /^[a-f0-9]{64}$/.test(
          challengeId
        )
      ) {
        navigate(
          '/verify-login-code',
          {
            replace:
              true,

            state: {
              correo:
                data?.correo ||
                normalizedEmail,

              challengeId,

              message:
                data?.message,
            },
          }
        );

        return;
      }

      setError(
        'No fue posible iniciar la verificación 2FA administrativa.'
      );

    } catch (
      err: any
    ) {
      setError(
        err?.response?.data?.message ||
        'No fue posible iniciar sesión.'
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
        to="/"
        className="auth-back-home"
      >
        ← Volver al sitio principal
      </Link>

      <div className="bg-shape bg-shape-top-left-large" />
      <div className="bg-shape bg-shape-top-left-small" />
      <div className="bg-shape bg-shape-bottom-right-large" />
      <div className="bg-shape bg-shape-bottom-right-small" />

      <div className="auth-premium-grid">
        <div className="auth-showcase-card">
          <div className="auth-showcase-badge">
            Autorización central validada
          </div>

          <h1 className="auth-showcase-title">
            SMART RH
          </h1>

          <p className="auth-showcase-text">
            El administrador general autorizó este intento.
            Ahora debes identificarte con tus propias
            credenciales administrativas.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  Autorización central
                </h3>

                <p>
                  El código anterior únicamente autorizó
                  continuar con el proceso.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  Identidad individual
                </h3>

                <p>
                  Ingresa el correo y la contraseña de tu
                  propia cuenta administrativa.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  2FA obligatorio
                </h3>

                <p>
                  Después de validar la contraseña recibirás
                  un segundo código en tu correo personal.
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
                  Identifica tu cuenta
                </h2>
              </div>

              <div className="auth-card-icon">
                ↗
              </div>
            </div>

            <p className="auth-description">
              La autorización general fue validada.
              Ingresa ahora tus credenciales personales.
            </p>

            <label className="auth-label">
              Correo administrativo
            </label>

            <input
              className="auth-input"
              type="email"
              value={correo}
              onChange={
                (
                  event
                ) =>
                  setCorreo(
                    event.target.value
                  )
              }
              placeholder="tu@empresa.com"
              autoComplete="username"
              autoFocus
            />

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
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {
                  loading
                    ? 'Validando...'
                    : 'Continuar con 2FA'
                }
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
                to="/forgot-password"
                className="auth-link primary"
              >
                ¿Olvidaste tu contraseña?
              </Link>

              <Link
                to="/admin/acceso"
                className="auth-link"
              >
                Solicitar otra autorización
              </Link>

              <Link
                to="/"
                className="auth-link"
              >
                Sitio principal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
