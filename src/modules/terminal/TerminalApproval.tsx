import React, {
  useState,
} from 'react';

import { api } from '../../services/api';


type Decision =
  'approve' |
  'reject';


export default function TerminalApproval() {
  const [
    challengeId,
    setChallengeId,
  ] =
    useState('');

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
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');


  async function decide(
    decision: Decision
  ) {
    const normalized =
      challengeId.trim();

    setMessage('');
    setError('');

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
          data?.status ||
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

      setChallengeId(
        ''
      );
    } catch (
      requestError:
        any
    ) {
      const status =
        Number(
          requestError
            ?.response
            ?.status ||
          0
        );

      if (
        status === 403
      ) {
        setError(
          'Solo el administrador general configurado puede autorizar terminales.'
        );
      } else if (
        status === 404
      ) {
        setError(
          'No se encontró la solicitud. Verifica el identificador recibido por correo.'
        );
      } else if (
        status === 409
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
    <section
      style={{
        maxWidth:
          760,
        margin:
          '0 auto',
        padding:
          '28px 20px',
      }}
    >
      <div
        style={{
          background:
            'var(--surface, #ffffff)',
          border:
            '1px solid var(--border, #e2e8f0)',
          borderRadius:
            18,
          padding:
            24,
          boxShadow:
            '0 12px 35px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            display:
              'flex',
            flexDirection:
              'column',
            gap:
              8,
            marginBottom:
              24,
          }}
        >
          <span
            style={{
              fontSize:
                13,
              fontWeight:
                700,
              textTransform:
                'uppercase',
              letterSpacing:
                '0.08em',
              color:
                '#15803d',
            }}
          >
            SMART RH
          </span>

          <h1
            style={{
              margin:
                0,
              fontSize:
                28,
            }}
          >
            Autorizar Terminal
          </h1>

          <p
            style={{
              margin:
                0,
              color:
                'var(--text-secondary, #475569)',
              lineHeight:
                1.6,
            }}
          >
            Ingresa el identificador de la solicitud
            recibido en el correo del administrador
            general. La terminal nunca necesita las
            credenciales administrativas.
          </p>
        </div>

        <label
          htmlFor="terminalChallengeId"
          style={{
            display:
              'block',
            fontWeight:
              700,
            marginBottom:
              8,
          }}
        >
          Identificador de solicitud
        </label>

        <input
          id="terminalChallengeId"
          value={
            challengeId
          }
          onChange={
            (
              event
            ) =>
              setChallengeId(
                event
                  .target
                  .value
              )
          }
          placeholder="Pega aquí el identificador recibido por correo"
          autoComplete="off"
          spellCheck={
            false
          }
          disabled={
            loading !==
            null
          }
          style={{
            width:
              '100%',
            boxSizing:
              'border-box',
            border:
              '1px solid var(--border, #cbd5e1)',
            borderRadius:
              12,
            padding:
              '13px 14px',
            fontSize:
              15,
            outline:
              'none',
          }}
        />

        {error && (
          <div
            role="alert"
            style={{
              marginTop:
                16,
              padding:
                12,
              borderRadius:
                10,
              background:
                'rgba(239,68,68,0.10)',
              color:
                '#b91c1c',
              fontWeight:
                600,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              marginTop:
                16,
              padding:
                12,
              borderRadius:
                10,
              background:
                'rgba(22,163,74,0.10)',
              color:
                '#15803d',
              fontWeight:
                600,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display:
              'flex',
            flexWrap:
              'wrap',
            gap:
              12,
            marginTop:
              22,
          }}
        >
          <button
            type="button"
            onClick={
              () =>
                decide(
                  'approve'
                )
            }
            disabled={
              loading !==
              null
            }
            style={{
              border:
                0,
              borderRadius:
                12,
              padding:
                '12px 18px',
              background:
                '#16a34a',
              color:
                '#ffffff',
              fontWeight:
                700,
              cursor:
                loading
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading ===
            'approve'
              ? 'Autorizando...'
              : 'Aprobar terminal'}
          </button>

          <button
            type="button"
            onClick={
              () =>
                decide(
                  'reject'
                )
            }
            disabled={
              loading !==
              null
            }
            style={{
              border:
                '1px solid #ef4444',
              borderRadius:
                12,
              padding:
                '12px 18px',
              background:
                'transparent',
              color:
                '#dc2626',
              fontWeight:
                700,
              cursor:
                loading
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading ===
            'reject'
              ? 'Rechazando...'
              : 'Rechazar solicitud'}
          </button>
        </div>
      </div>
    </section>
  );
}
