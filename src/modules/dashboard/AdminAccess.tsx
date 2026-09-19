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
    correo,
    setCorreo,
  ] =
    useState(
      ''
    );

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

    const normalizedEmail =
      correo
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setError(
        'Ingresa el correo administrativo.'
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
          '/auth/admin-access/request',
          {
            correo:
              normalizedEmail,
          }
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
          'No fue posible iniciar la verificación administrativa.'
        );

        return;
      }

      setCorreo(
        normalizedEmail
      );

      setChallengeId(
        nextChallengeId
      );

      setInfo(
        data?.message ||
        'Revisa tu correo e ingresa el código de autorización.'
      );

    } catch (
      err: any
    ) {
      setError(
        err?.response?.data?.message ||
        'No fue posible iniciar la verificación administrativa.'
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
        'Ingresa el código de 6 dígitos.'
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

      if (!adminAccessToken) {
        setError(
          'La preautorización no entregó un token administrativo válido.'
        );

        return;
      }

      /*
       * El token de preautorización NO se persiste.
       * Solo viaja por state hasta el login administrativo.
       */
      navigate(
        '/admin/login',
        {
          replace:
            true,

          state: {
            correo:
              correo
                .trim()
                .toLowerCase(),

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

      <div className="auth-premium-grid">
        <div className="auth-showcase-card">
          <div className="auth-showcase-badge">
            Acceso administrativo protegido
          </div>

          <h1 className="auth-showcase-title">
            SMART RH
          </h1>

          <p className="auth-showcase-text">
            Antes de solicitar la contraseña administrativa,
            confirma que tienes acceso al correo autorizado.
          </p>

          <div className="auth-showcase-points">
            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>1. Correo autorizado</h3>
                <p>
                  SMART RH envía un código temporal únicamente
                  al administrador habilitado.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>2. Contraseña</h3>
                <p>
                  Solo después de validar el correo se habilita
                  el inicio de sesión administrativo.
                </p>
              </div>
            </div>

            <div className="auth-showcase-point">
              <span className="auth-showcase-dot" />
              <div>
                <h3>3. Segundo factor</h3>
                <p>
                  La contraseña correcta todavía requiere el
                  código 2FA normal antes de entregar la sesión.
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
                  {challengeId
                    ? 'Verificar autorización'
                    : 'Solicitar autorización'}
                </h2>
              </div>

              <div className="auth-card-icon">
                ↗
              </div>
            </div>

            {!challengeId ? (
              <>
                <p className="auth-description">
                  Ingresa el correo de la cuenta administrativa.
                </p>

                <label className="auth-label">
                  Correo administrativo
                </label>

                <input
                  className="auth-input"
                  value={correo}
                  onChange={
                    (
                      event
                    ) =>
                      setCorreo(
                        event.target.value
                      )
                  }
                  placeholder="admin@empresa.com"
                  autoComplete="email"
                />
              </>
            ) : (
              <>
                <p className="auth-description">
                  Ingresa el código enviado al correo autorizado.
                </p>

                <div className="auth-email-chip">
                  {correo}
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
                {loading
                  ? 'Validando...'
                  : challengeId
                  ? 'Validar y continuar'
                  : 'Enviar código'}
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
                to="/login"
                className="auth-link"
              >
                Acceso de empleado
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
