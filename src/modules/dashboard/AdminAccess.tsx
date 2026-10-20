import {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  api,
} from '../../services/api';


export default function AdminAccess() {
  const navigate =
    useNavigate();

  const [
    challengeId,
    setChallengeId,
  ] =
    useState(
      ''
    );

  const [
    codigo,
    setCodigo,
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

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );

  const [
    info,
    setInfo,
  ] =
    useState(
      ''
    );


  async function requestAccess(
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

    setInfo(
      ''
    );

    try {
      setLoading(
        true
      );

      /*
       * El navegador NO envía ningún correo.
       *
       * El backend decide exclusivamente qué administrador
       * general recibe el código.
       */
      const {
        data,
      } =
        await api.post(
          '/auth/admin-access/request',
          {}
        );

      const nextChallengeId =
        String(
          data?.challengeId ||
          ''
        )
          .trim()
          .toLowerCase();

      if (
        !data?.accepted ||
        !/^[a-f0-9]{64}$/.test(
          nextChallengeId
        )
      ) {
        setError(
          'No fue posible iniciar la autorización administrativa.'
        );

        return;
      }

      setChallengeId(
        nextChallengeId
      );

      setInfo(
        data?.message ||
        'La solicitud fue enviada al administrador general de SMART RH.'
      );

    } catch (
      err: any
    ) {
      setError(
        err?.response?.data?.message ||
        'No fue posible solicitar la autorización administrativa.'
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  async function verifyAccess(
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

    if (
      !challengeId ||
      !/^\d{6}$/.test(
        codigo
      )
    ) {
      setError(
        'Ingresa el código de autorización de 6 dígitos.'
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
          '/auth/admin-access/verify',
          {
            challengeId,
            codigo,
          }
        );

      const adminAccessToken =
        String(
          data?.adminAccessToken ||
          ''
        )
          .trim();

      if (
        !data?.authorized ||
        !adminAccessToken
      ) {
        setError(
          'La autorización administrativa no es válida.'
        );

        return;
      }

      /*
       * Seguridad:
       * adminAccessToken NO se persiste.
       *
       * No localStorage.
       * No sessionStorage.
       *
       * Solo viaja por React Router state hacia
       * el login administrativo.
       */
      navigate(
        '/admin/login',
        {
          replace:
            true,

          state: {
            adminAccessToken,
          },
        }
      );

    } catch (
      err: any
    ) {
      setError(
        err?.response?.data?.message ||
        'Código administrativo inválido o expirado.'
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  function normalizeCode(
    value: string
  ) {
    setCodigo(
      value
        .replace(
          /\D/g,
          ''
        )
        .slice(
          0,
          6
        )
    );
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
            Acceso administrativo protegido
          </div>

          <h1 className="auth-showcase-title">
            SMART RH
          </h1>

          <p className="auth-showcase-text">
            Antes de iniciar sesión, el administrador general debe
            autorizar el acceso mediante un código temporal.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  1. Solicita el acceso
                </h3>

                <p>
                  SMART RH envía un código temporal al administrador
                  general responsable de aprobar el ingreso.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  2. Ingresa tu cuenta
                </h3>

                <p>
                  Después de validar la autorización,
                  cada administrador debe ingresar su propio
                  correo y contraseña.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />

              <div>
                <h3>
                  3. Confirma el segundo código
                </h3>

                <p>
                  Después de la contraseña, escribe el segundo
                  código enviado a tu correo personal.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-wrapper auth-wrapper-premium">
          <form
            className="auth-card auth-card-premium"
            onSubmit={
              challengeId
                ? verifyAccess
                : requestAccess
            }
          >
            <div className="auth-card-header">
              <div>
                <p className="auth-eyebrow">
                  Portal administrativo
                </p>

                <h2 className="auth-title">
                  {
                    challengeId
                      ? 'Código de autorización'
                      : 'Solicitar autorización'
                  }
                </h2>
              </div>

              <div className="auth-card-icon">
                ↗
              </div>
            </div>

            {!challengeId ? (
              <>
                <p className="auth-description">
                  Envía una solicitud al administrador general para continuar.
                </p>

                <div className="auth-email-chip">
                  El administrador general recibirá el código
                </div>
              </>
            ) : (
              <>
                <p className="auth-description">
                  Pide al administrador general el código que recibió para esta solicitud.
                </p>

                <div className="auth-email-chip">
                  Solicitud enviada al administrador general
                </div>

                <label className="auth-label">
                  Código de autorización
                </label>

                <input
                  className="auth-input auth-code-input"
                  value={codigo}
                  onChange={
                    (
                      event
                    ) =>
                      normalizeCode(
                        event.target.value
                      )
                  }
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {
                  loading
                    ? 'Procesando...'
                    : challengeId
                      ? 'Confirmar código y continuar'
                    : 'Solicitar autorización'
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

            {info && (
              <p className="auth-info">
                {info}
              </p>
            )}

            <div className="auth-footer-links">
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
