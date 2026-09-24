import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import axios from 'axios';

import {
  terminalApi,
} from '../../services/terminalApi';

type TerminalAccessStatus =
  | 'idle'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'consumed'
  | 'authorized';

type RequestResponse = {
  challengeId: string;
  sessionProof: string;
  status: 'pending';
  expiresInMinutes: number;
};

type StatusResponse = {
  challengeId: string;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'expired'
    | 'consumed';
};

type SessionResponse = {
  token: string;
  tokenType: 'Bearer';
  terminalId: string;
};

type TerminalQrResponse = {
  token: string;
  expiresAt: string;
  dataUrl: string;
};

function readError(
  error: unknown,
  fallback: string
): string {
  if (
    axios.isAxiosError(
      error
    )
  ) {
    const message =
      error.response?.data?.message;

    if (
      typeof message ===
        'string' &&
      message.trim()
    ) {
      return message;
    }
  }

  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

export default function TerminalAttendance() {
  const [
    terminalId,
    setTerminalId,
  ] =
    useState(
      'terminal-asistencia-01'
    );

  const [
    challengeId,
    setChallengeId,
  ] =
    useState('');

  /*
   * IMPORTANTE:
   * sessionProof vive únicamente en memoria React.
   * Nunca se persiste en localStorage/sessionStorage.
   */
  const [
    sessionProof,
    setSessionProof,
  ] =
    useState('');

  /*
   * IMPORTANTE:
   * terminalToken vive únicamente en memoria React.
   * Al cerrar/recargar esta página desaparece.
   */
  const [
    terminalToken,
    setTerminalToken,
  ] =
    useState('');

  const [
    accessStatus,
    setAccessStatus,
  ] =
    useState<TerminalAccessStatus>(
      'idle'
    );

  const [
    expiresInMinutes,
    setExpiresInMinutes,
  ] =
    useState<number | null>(
      null
    );

  const [
    qrDataUrl,
    setQrDataUrl,
  ] =
    useState('');

  const [
    qrExpiresAt,
    setQrExpiresAt,
  ] =
    useState('');

  const [
    requesting,
    setRequesting,
  ] =
    useState(false);

  const [
    loadingQr,
    setLoadingQr,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const exchangeInFlight =
    useRef(false);

  const requestAccess =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const cleanTerminalId =
        terminalId.trim();

      if (!cleanTerminalId) {
        setError(
          'Ingresa un identificador para esta terminal.'
        );

        return;
      }

      setRequesting(
        true
      );

      setError(
        ''
      );

      setChallengeId(
        ''
      );

      setSessionProof(
        ''
      );

      setTerminalToken(
        ''
      );

      setQrDataUrl(
        ''
      );

      setQrExpiresAt(
        ''
      );

      setAccessStatus(
        'idle'
      );

      exchangeInFlight.current =
        false;

      try {
        const {
          data,
        } =
          await terminalApi.post<RequestResponse>(
            '/auth/terminal-access/request',
            {
              terminalId:
                cleanTerminalId,
            }
          );

        if (
          !data?.challengeId ||
          !data?.sessionProof
        ) {
          throw new Error(
            'El servidor no devolvió una autorización de terminal válida.'
          );
        }

        setChallengeId(
          data.challengeId
        );

        setSessionProof(
          data.sessionProof
        );

        setExpiresInMinutes(
          Number(
            data.expiresInMinutes
          ) || null
        );

        setAccessStatus(
          'pending'
        );

      } catch (
        requestError
      ) {
        setError(
          readError(
            requestError,
            'No se pudo solicitar autorización para esta terminal.'
          )
        );

      } finally {
        setRequesting(
          false
        );
      }
    };

  /*
   * Canjea challenge + sessionProof solamente después de que
   * el administrador autorizado haya aprobado la solicitud.
   */
  const createTerminalSession =
    useCallback(
      async () => {
        if (
          !challengeId ||
          !sessionProof ||
          exchangeInFlight.current
        ) {
          return;
        }

        exchangeInFlight.current =
          true;

        try {
          const {
            data,
          } =
            await terminalApi.post<SessionResponse>(
              '/auth/terminal-access/session',
              {
                challengeId,
                sessionProof,
              }
            );

          if (
            !data?.token ||
            data.tokenType !==
              'Bearer'
          ) {
            throw new Error(
              'El servidor no devolvió una sesión terminal válida.'
            );
          }

          /*
           * Se elimina el proof de memoria inmediatamente
           * después del consumo exitoso.
           */
          setSessionProof(
            ''
          );

          setTerminalToken(
            data.token
          );

          setAccessStatus(
            'authorized'
          );

          setError(
            ''
          );

        } catch (
          sessionError
        ) {
          setError(
            readError(
              sessionError,
              'No se pudo crear la sesión de esta terminal.'
            )
          );

        } finally {
          exchangeInFlight.current =
            false;
        }
      },
      [
        challengeId,
        sessionProof,
      ]
    );

  /*
   * Polling público del challenge.
   * La terminal nunca llama /decision.
   */
  useEffect(
    () => {
      if (
        !challengeId ||
        !sessionProof ||
        terminalToken ||
        accessStatus !==
          'pending'
      ) {
        return;
      }

      let cancelled =
        false;

      const checkStatus =
        async () => {
          try {
            const {
              data,
            } =
              await terminalApi.get<StatusResponse>(
                '/auth/terminal-access/status',
                {
                  params: {
                    challengeId,
                  },
                }
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              data.status ===
                'approved'
            ) {
              await createTerminalSession();

              return;
            }

            if (
              data.status ===
                'rejected' ||
              data.status ===
                'expired' ||
              data.status ===
                'consumed'
            ) {
              setAccessStatus(
                data.status
              );

              if (
                data.status !==
                  'consumed'
              ) {
                setSessionProof(
                  ''
                );
              }
            }

          } catch (
            statusError
          ) {
            if (
              !cancelled
            ) {
              setError(
                readError(
                  statusError,
                  'No se pudo consultar el estado de autorización.'
                )
              );
            }
          }
        };

      void checkStatus();

      const intervalId =
        window.setInterval(
          () => {
            void checkStatus();
          },
          2000
        );

      return () => {
        cancelled =
          true;

        window.clearInterval(
          intervalId
        );
      };
    },
    [
      accessStatus,
      challengeId,
      createTerminalSession,
      sessionProof,
      terminalToken,
    ]
  );

  /*
   * GET protegido exclusivamente con Bearer terminal.
   */
  const generateQr =
    useCallback(
      async () => {
        if (
          !terminalToken
        ) {
          return;
        }

        setLoadingQr(
          true
        );

        try {
          const {
            data,
          } =
            await terminalApi.get<TerminalQrResponse>(
              '/terminal/qr',
              {
                headers: {
                  Authorization:
                    `Bearer ${terminalToken}`,
                },
              }
            );

          if (
            !data?.dataUrl ||
            !data?.expiresAt
          ) {
            throw new Error(
              'El servidor no devolvió un QR válido.'
            );
          }

          setQrDataUrl(
            data.dataUrl
          );

          setQrExpiresAt(
            data.expiresAt
          );

          setError(
            ''
          );

        } catch (
          qrError
        ) {
          setError(
            readError(
              qrError,
              'No se pudo generar el QR de asistencia.'
            )
          );

        } finally {
          setLoadingQr(
            false
          );
        }
      },
      [
        terminalToken,
      ]
    );

  /*
   * Primer QR inmediato y renovación mientras la sesión
   * permanezca viva en memoria.
   */
  useEffect(
    () => {
      if (
        !terminalToken
      ) {
        return;
      }

      void generateQr();

      const intervalId =
        window.setInterval(
          () => {
            void generateQr();
          },
          9000
        );

      return () => {
        window.clearInterval(
          intervalId
        );
      };
    },
    [
      generateQr,
      terminalToken,
    ]
  );

  const resetTerminal =
    () => {
      setChallengeId(
        ''
      );

      setSessionProof(
        ''
      );

      setTerminalToken(
        ''
      );

      setAccessStatus(
        'idle'
      );

      setExpiresInMinutes(
        null
      );

      setQrDataUrl(
        ''
      );

      setQrExpiresAt(
        ''
      );

      setError(
        ''
      );

      exchangeInFlight.current =
        false;
    };

  const statusText =
    accessStatus ===
      'pending'
      ? 'Esperando aprobación administrativa'
      : accessStatus ===
          'authorized'
        ? 'Terminal autorizada'
        : accessStatus ===
            'rejected'
          ? 'Solicitud rechazada'
          : accessStatus ===
              'expired'
            ? 'Solicitud expirada'
            : accessStatus ===
                'consumed'
              ? 'Solicitud ya utilizada'
              : 'Sin autorización activa';

  return (
    <main
      style={{
        minHeight:
          '100vh',

        background:
          '#f8fafc',

        color:
          '#0f172a',

        padding:
          '32px 20px',

        fontFamily:
          'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width:
            'min(1080px, 100%)',

          margin:
            '0 auto',
        }}
      >
        <header
          style={{
            marginBottom:
              24,
          }}
        >
          <p
            style={{
              margin:
                '0 0 8px',

              color:
                '#15803d',

              fontWeight:
                700,

              letterSpacing:
                '.08em',

              textTransform:
                'uppercase',

              fontSize:
                12,
            }}
          >
            SMART RH · Terminal independiente
          </p>

          <h1
            style={{
              margin:
                0,

              fontSize:
                'clamp(28px, 4vw, 44px)',
            }}
          >
            Terminal de asistencia
          </h1>

          <p
            style={{
              color:
                '#475569',

              maxWidth:
                720,

              lineHeight:
                1.6,
            }}
          >
            Esta pantalla opera fuera del portal administrativo.
            Requiere autorización temporal antes de mostrar códigos
            QR para registrar entrada y salida.
          </p>
        </header>

        <section
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(300px, 1fr))',

            gap:
              20,
          }}
        >
          <article
            style={{
              background:
                '#ffffff',

              border:
                '1px solid #e2e8f0',

              borderRadius:
                18,

              padding:
                24,

              boxShadow:
                '0 18px 50px rgba(15,23,42,.06)',
            }}
          >
            <h2
              style={{
                marginTop:
                  0,
              }}
            >
              Autorización
            </h2>

            <p
              style={{
                color:
                  '#475569',
              }}
            >
              Estado: <strong>{statusText}</strong>
            </p>

            {expiresInMinutes && accessStatus === 'pending' ? (
              <p
                style={{
                  color:
                    '#475569',
                }}
              >
                La solicitud vence aproximadamente en{' '}
                {expiresInMinutes} minutos.
              </p>
            ) : null}

            {!terminalToken ? (
              <form
                onSubmit={
                  requestAccess
                }
              >
                <label
                  htmlFor="terminalId"
                  style={{
                    display:
                      'block',

                    marginBottom:
                      8,

                    fontWeight:
                      600,
                  }}
                >
                  Identificador de terminal
                </label>

                <input
                  id="terminalId"
                  value={
                    terminalId
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setTerminalId(
                        event.target.value
                      )
                  }
                  disabled={
                    requesting ||
                    accessStatus ===
                      'pending'
                  }
                  maxLength={
                    64
                  }
                  autoComplete="off"
                  style={{
                    width:
                      '100%',

                    boxSizing:
                      'border-box',

                    padding:
                      '12px 14px',

                    borderRadius:
                      10,

                    border:
                      '1px solid #cbd5e1',

                    marginBottom:
                      14,
                  }}
                />

                {accessStatus !==
                'pending' ? (
                  <button
                    type="submit"
                    disabled={
                      requesting
                    }
                    style={{
                      border:
                        0,

                      borderRadius:
                        10,

                      padding:
                        '12px 18px',

                      background:
                        '#16a34a',

                      color:
                        '#ffffff',

                      fontWeight:
                        700,

                      cursor:
                        'pointer',
                    }}
                  >
                    {requesting
                      ? 'Solicitando...'
                      : 'Solicitar autorización'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      resetTerminal
                    }
                    style={{
                      border:
                        '1px solid #cbd5e1',

                      borderRadius:
                        10,

                      padding:
                        '12px 18px',

                      background:
                        '#ffffff',

                      fontWeight:
                        700,

                      cursor:
                        'pointer',
                    }}
                  >
                    Cancelar espera local
                  </button>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={
                  resetTerminal
                }
                style={{
                  border:
                    '1px solid #cbd5e1',

                  borderRadius:
                    10,

                  padding:
                    '12px 18px',

                  background:
                    '#ffffff',

                  fontWeight:
                    700,

                  cursor:
                    'pointer',
                }}
              >
                Cerrar sesión de terminal
              </button>
            )}

            {error ? (
              <div
                role="alert"
                style={{
                  marginTop:
                    18,

                  padding:
                    12,

                  borderRadius:
                    10,

                  background:
                    '#fef2f2',

                  color:
                    '#991b1b',
                }}
              >
                {error}
              </div>
            ) : null}
          </article>

          <article
            style={{
              background:
                '#ffffff',

              border:
                '1px solid #e2e8f0',

              borderRadius:
                18,

              padding:
                24,

              minHeight:
                420,

              display:
                'flex',

              flexDirection:
                'column',

              alignItems:
                'center',

              justifyContent:
                'center',

              textAlign:
                'center',

              boxShadow:
                '0 18px 50px rgba(15,23,42,.06)',
            }}
          >
            <h2>
              QR de asistencia
            </h2>

            {qrDataUrl ? (
              <>
                <img
                  src={
                    qrDataUrl
                  }
                  alt="Código QR temporal de asistencia"
                  width={
                    280
                  }
                  height={
                    280
                  }
                  style={{
                    maxWidth:
                      '100%',

                    height:
                      'auto',
                  }}
                />

                <p
                  style={{
                    color:
                      '#475569',

                    marginBottom:
                      4,
                  }}
                >
                  QR activo para escaneo
                </p>

                {qrExpiresAt ? (
                  <small
                    style={{
                      color:
                        '#64748b',
                    }}
                  >
                    Vigencia del QR:{' '}
                    {new Date(
                      qrExpiresAt
                    ).toLocaleTimeString()}
                  </small>
                ) : null}

                <button
                  type="button"
                  onClick={
                    () =>
                      void generateQr()
                  }
                  disabled={
                    loadingQr
                  }
                  style={{
                    marginTop:
                      18,

                    border:
                      '1px solid #cbd5e1',

                    borderRadius:
                      10,

                    padding:
                      '10px 16px',

                    background:
                      '#ffffff',

                    fontWeight:
                      700,

                    cursor:
                      'pointer',
                  }}
                >
                  {loadingQr
                    ? 'Actualizando...'
                    : 'Actualizar QR'}
                </button>
              </>
            ) : (
              <p
                style={{
                  color:
                    '#64748b',

                  maxWidth:
                    380,

                  lineHeight:
                    1.6,
                }}
              >
                El QR aparecerá únicamente cuando esta terminal
                haya sido aprobada y cuente con una sesión
                dedicada.
              </p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
