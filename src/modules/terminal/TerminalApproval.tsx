import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  api,
} from '../../services/api';

import './terminalExperience.css';


type Decision =
  | 'approve'
  | 'reject';


export default function TerminalApproval() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const challengeFromUrl =
    String(
      searchParams.get(
        'challengeId'
      ) ??
      ''
    ).trim();

  const [
    challengeId,
    setChallengeId,
  ] =
    useState(
      challengeFromUrl
    );

  const [
    loading,
    setLoading,
  ] =
    useState<Decision | null>(
      null
    );

  const [
    message,
    setMessage,
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

  useEffect(
    () => {
      if (
        challengeFromUrl
      ) {
        setChallengeId(
          challengeFromUrl
        );
      }
    },
    [
      challengeFromUrl,
    ]
  );

  async function decide(
    decision:
      Decision
  ) {
    const normalized =
      challengeId.trim();

    setMessage(
      ''
    );

    setError(
      ''
    );

    if (!normalized) {
      setError(
        'Ingresa el identificador de la solicitud recibido por correo.'
      );

      return;
    }

    setLoading(
      decision
    );

    try {
      const {
        data,
      } =
        await api.post(
          '/auth/terminal-access/decision',
          {
            challengeId:
              normalized,

            decision,
          }
        );

      const status =
        String(
          data?.status ??
          ''
        )
          .trim()
          .toLowerCase();

      if (
        status ===
        'approved'
      ) {
        setMessage(
          'Terminal autorizada correctamente. El dispositivo continuará automáticamente.'
        );

      } else if (
        status ===
        'rejected'
      ) {
        setMessage(
          'Solicitud de terminal rechazada correctamente.'
        );

      } else {
        setMessage(
          'La decisión fue procesada correctamente.'
        );
      }

    } catch (
      requestError:
        unknown
    ) {
      const status =
        Number(
          (
            requestError as {
              response?: {
                status?:
                  number;
              };
            }
          )?.response
            ?.status ??
          0
        );

      if (
        status ===
        403
      ) {
        setError(
          'Solo el administrador general configurado puede autorizar terminales.'
        );

      } else if (
        status ===
        404
      ) {
        setError(
          'No se encontró la solicitud. Verifica el identificador recibido por correo.'
        );

      } else if (
        status ===
        409
      ) {
        setError(
          'La solicitud ya fue procesada o ya no puede modificarse.'
        );

      } else {
        setError(
          'No fue posible procesar la autorización. Intenta nuevamente.'
        );
      }

    } finally {
      setLoading(
        null
      );
    }
  }

  return (
    <main className="terminal-approval-page">
      <section className="terminal-approval-card">
        <header className="terminal-approval-header">
          <span className="terminal-section-eyebrow">
            SMART RH · SEGURIDAD DE TERMINAL
          </span>

          <h1>
            Autorizar Terminal
          </h1>

          <p>
            Confirma o rechaza la solicitud de un dispositivo
            que desea operar el QR dinámico de asistencia.
          </p>
        </header>

        {challengeFromUrl && (
          <div className="terminal-message terminal-message-success">
            <strong>
              Solicitud cargada desde el correo.
            </strong>

            <span>
              Revisa la información y toma una decisión.
            </span>
          </div>
        )}

        <label className="terminal-field">
          <span>
            Identificador de solicitud
          </span>

          <input
            value={
              challengeId
            }
            onChange={
              event =>
                setChallengeId(
                  event.target.value
                )
            }
            placeholder="Solicitud recibida por correo"
            autoComplete="off"
            spellCheck={
              false
            }
            disabled={
              loading !==
              null
            }
          />
        </label>

        {error && (
          <div
            className="terminal-message terminal-message-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="terminal-message terminal-message-success"
            role="status"
          >
            {message}
          </div>
        )}

        <div className="terminal-approval-actions">
          <button
            type="button"
            className="terminal-primary-button"
            disabled={
              loading !==
                null ||
              !challengeId.trim()
            }
            onClick={
              () =>
                void decide(
                  'approve'
                )
            }
          >
            {loading ===
            'approve'
              ? 'Autorizando…'
              : 'Aprobar terminal'}
          </button>

          <button
            type="button"
            className="terminal-danger-button"
            disabled={
              loading !==
                null ||
              !challengeId.trim()
            }
            onClick={
              () =>
                void decide(
                  'reject'
                )
            }
          >
            {loading ===
            'reject'
              ? 'Rechazando…'
              : 'Rechazar solicitud'}
          </button>
        </div>

        <footer className="terminal-approval-footer">
          <Link to="/portal">
            ← Volver al portal administrativo
          </Link>
        </footer>
      </section>
    </main>
  );
}
