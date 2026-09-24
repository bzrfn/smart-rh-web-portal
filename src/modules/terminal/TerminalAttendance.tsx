import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  clearTerminalSessionMemory,
  getTerminalSessionMemory,
  setTerminalSessionMemory,
} from '../../services/terminalSessionMemory';

import './terminalExperience.css';


const viteEnv =
  import.meta.env ??
  {};

const API_BASE_URL =
  String(
    viteEnv.VITE_API_URL ??
    'http://localhost:4000'
  )
    .trim()
    .replace(
      /\/+$/,
      ''
    );

const DEFAULT_TERMINAL_ID =
  'terminal-asistencia-01';


type AccessStatus =
  | 'idle'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';


type JsonObject = {
  [key:
    string]:
    unknown;
};


async function responseJson(
  response:
    Response
): Promise<JsonObject> {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(
      text
    ) as JsonObject;
  } catch {
    return {
      message:
        text,
    };
  }
}


function messageFrom(
  value:
    JsonObject,
  fallback:
    string
) {
  return String(
    value.message ??
    value.error ??
    fallback
  );
}


function parseDateTime(
  value:
    unknown
): number | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      String(
        value
      )
    );

  const time =
    date.getTime();

  return Number.isFinite(
    time
  )
    ? time
    : null;
}


function countdown(
  milliseconds:
    number
) {
  const total =
    Math.max(
      0,
      Math.ceil(
        milliseconds /
        1000
      )
    );

  const minutes =
    Math.floor(
      total /
      60
    );

  const seconds =
    total %
    60;

  return `${String(
    minutes
  ).padStart(
    2,
    '0'
  )}:${String(
    seconds
  ).padStart(
    2,
    '0'
  )}`;
}


function jwtExpiry(
  token:
    string
): number | null {
  try {
    const encoded =
      token.split(
        '.'
      )[1];

    if (!encoded) {
      return null;
    }

    let normalized =
      encoded
        .replace(
          /-/g,
          '+'
        )
        .replace(
          /_/g,
          '/'
        );

    while (
      normalized.length %
        4 !==
      0
    ) {
      normalized +=
        '=';
    }

    const payload =
      JSON.parse(
        window.atob(
          normalized
        )
      ) as {
        exp?:
          number;
      };

    if (
      typeof payload.exp !==
      'number'
    ) {
      return null;
    }

    return (
      payload.exp *
      1000
    );

  } catch {
    return null;
  }
}


export default function TerminalAttendance() {
  const navigate =
    useNavigate();

  const initialSession =
    useMemo(
      () =>
        getTerminalSessionMemory(),
      []
    );

  const [
    terminalId,
    setTerminalId,
  ] =
    useState(
      initialSession
        ?.terminalId ??
      DEFAULT_TERMINAL_ID
    );

  const [
    terminalToken,
    setTerminalToken,
  ] =
    useState(
      initialSession
        ?.token ??
      ''
    );

  const [
    accessStatus,
    setAccessStatus,
  ] =
    useState<AccessStatus>(
      initialSession
        ?.token
        ? 'approved'
        : 'idle'
    );

  const [
    challengeId,
    setChallengeId,
  ] =
    useState(
      ''
    );

  const [
    sessionProof,
    setSessionProof,
  ] =
    useState(
      ''
    );

  const [
    authorizationExpiresAt,
    setAuthorizationExpiresAt,
  ] =
    useState<number | null>(
      null
    );

  const [
    qrDataUrl,
    setQrDataUrl,
  ] =
    useState(
      ''
    );

  const [
    qrExpiresAt,
    setQrExpiresAt,
  ] =
    useState<number | null>(
      null
    );

  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );

  const [
    loadingQr,
    setLoadingQr,
  ] =
    useState(
      false
    );

  const [
    requesting,
    setRequesting,
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
    lastQrUpdate,
    setLastQrUpdate,
  ] =
    useState<number | null>(
      null
    );

  const pollRef =
    useRef<number | null>(
      null
    );

  const refreshRef =
    useRef<number | null>(
      null
    );

  const terminalSessionExpiresAt =
    useMemo(
      () =>
        terminalToken
          ? jwtExpiry(
              terminalToken
            )
          : null,
      [
        terminalToken,
      ]
    );

  useEffect(
    () => {
      const clock =
        window.setInterval(
          () =>
            setNow(
              Date.now()
            ),
          1000
        );

      return () =>
        window.clearInterval(
          clock
        );
    },
    []
  );

  const dateText =
    new Intl.DateTimeFormat(
      'es-MX',
      {
        weekday:
          'long',

        day:
          '2-digit',

        month:
          'long',

        year:
          'numeric',
      }
    ).format(
      new Date(
        now
      )
    );

  const timeText =
    new Intl.DateTimeFormat(
      'es-MX',
      {
        hour:
          '2-digit',

        minute:
          '2-digit',

        second:
          '2-digit',

        hour12:
          true,
      }
    ).format(
      new Date(
        now
      )
    );

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

        setError(
          ''
        );

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/terminal/qr`,
              {
                method:
                  'GET',

                headers: {
                  Authorization:
                    `Bearer ${terminalToken}`,
                },
              }
            );

          const body =
            await responseJson(
              response
            );

          if (!response.ok) {
            if (
              response.status ===
                401 ||
              response.status ===
                403
            ) {
              clearTerminalSessionMemory();

              setTerminalToken(
                ''
              );

              setAccessStatus(
                'idle'
              );

              setQrDataUrl(
                ''
              );
            }

            throw new Error(
              messageFrom(
                body,
                'No fue posible generar el QR.'
              )
            );
          }

          const dataUrl =
            String(
              body.dataUrl ??
              ''
            );

          const expiresAt =
            parseDateTime(
              body.expiresAt
            );

          if (
            !dataUrl ||
            !expiresAt
          ) {
            throw new Error(
              'El servidor entregó un QR incompleto.'
            );
          }

          setQrDataUrl(
            dataUrl
          );

          setQrExpiresAt(
            expiresAt
          );

          setLastQrUpdate(
            Date.now()
          );

        } catch (
          requestError:
            unknown
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible generar el QR.'
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

  useEffect(
    () => {
      if (
        terminalToken
      ) {
        void generateQr();
      }
    },
    [
      terminalToken,
      generateQr,
    ]
  );

  useEffect(
    () => {
      if (
        refreshRef.current
      ) {
        window.clearTimeout(
          refreshRef.current
        );
      }

      if (
        !terminalToken ||
        !qrExpiresAt
      ) {
        return;
      }

      const delay =
        Math.max(
          3000,
          qrExpiresAt -
            Date.now() -
            5000
        );

      refreshRef.current =
        window.setTimeout(
          () =>
            void generateQr(),
          delay
        );

      return () => {
        if (
          refreshRef.current
        ) {
          window.clearTimeout(
            refreshRef.current
          );
        }
      };
    },
    [
      terminalToken,
      qrExpiresAt,
      generateQr,
    ]
  );

  const consumeApprovedRequest =
    useCallback(
      async () => {
        if (
          !challengeId ||
          !sessionProof
        ) {
          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/auth/terminal-access/session`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  challengeId,
                  sessionProof,
                }),
            }
          );

        const body =
          await responseJson(
            response
          );

        if (!response.ok) {
          throw new Error(
            messageFrom(
              body,
              'No fue posible crear la sesión del terminal.'
            )
          );
        }

        const token =
          String(
            body.token ??
            ''
          ).trim();

        const approvedTerminal =
          String(
            body.terminalId ??
            terminalId
          ).trim();

        if (!token) {
          throw new Error(
            'No se recibió el JWT exclusivo de terminal.'
          );
        }

        setTerminalSessionMemory({
          token,
          terminalId:
            approvedTerminal,

          source:
            'approved-device',
        });

        setTerminalId(
          approvedTerminal
        );

        setTerminalToken(
          token
        );

        setAccessStatus(
          'approved'
        );

        setSessionProof(
          ''
        );
      },
      [
        challengeId,
        sessionProof,
        terminalId,
      ]
    );

  useEffect(
    () => {
      if (
        pollRef.current
      ) {
        window.clearInterval(
          pollRef.current
        );
      }

      if (
        accessStatus !==
          'pending' ||
        !challengeId
      ) {
        return;
      }

      pollRef.current =
        window.setInterval(
          async () => {
            try {
              const response =
                await fetch(
                  `${API_BASE_URL}/auth/terminal-access/status?challengeId=${encodeURIComponent(
                    challengeId
                  )}`
                );

              const body =
                await responseJson(
                  response
                );

              if (!response.ok) {
                throw new Error(
                  messageFrom(
                    body,
                    'No fue posible consultar el estado de autorización.'
                  )
                );
              }

              const status =
                String(
                  body.status ??
                  ''
                )
                  .trim()
                  .toLowerCase();

              if (
                status ===
                'approved'
              ) {
                if (
                  pollRef.current
                ) {
                  window.clearInterval(
                    pollRef.current
                  );
                }

                await consumeApprovedRequest();

                return;
              }

              if (
                status ===
                'rejected'
              ) {
                setAccessStatus(
                  'rejected'
                );

                setSessionProof(
                  ''
                );

                return;
              }

              if (
                status ===
                  'expired' ||
                (
                  authorizationExpiresAt !==
                    null &&
                  authorizationExpiresAt <=
                    Date.now()
                )
              ) {
                setAccessStatus(
                  'expired'
                );

                setSessionProof(
                  ''
                );
              }

            } catch (
              statusError:
                unknown
            ) {
              setError(
                statusError instanceof Error
                  ? statusError.message
                  : 'No fue posible consultar la autorización.'
              );
            }
          },
          2000
        );

      return () => {
        if (
          pollRef.current
        ) {
          window.clearInterval(
            pollRef.current
          );
        }
      };
    },
    [
      accessStatus,
      challengeId,
      authorizationExpiresAt,
      consumeApprovedRequest,
    ]
  );

  async function requestAccess() {
    setRequesting(
      true
    );

    setError(
      ''
    );

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/terminal-access/request`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                terminalId:
                  terminalId.trim(),
              }),
          }
        );

      const body =
        await responseJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          messageFrom(
            body,
            'No fue posible solicitar autorización.'
          )
        );
      }

      const nextChallenge =
        String(
          body.challengeId ??
          ''
        ).trim();

      const proof =
        String(
          body.sessionProof ??
          ''
        ).trim();

      if (
        !nextChallenge ||
        !proof
      ) {
        throw new Error(
          'La solicitud de terminal está incompleta.'
        );
      }

      const expiresAt =
        parseDateTime(
          body.expiresAt
        );

      const expiresMinutes =
        Number(
          body.expiresInMinutes ??
          5
        );

      setChallengeId(
        nextChallenge
      );

      setSessionProof(
        proof
      );

      setAuthorizationExpiresAt(
        expiresAt ??
        (
          Date.now() +
          expiresMinutes *
            60 *
            1000
        )
      );

      setAccessStatus(
        'pending'
      );

    } catch (
      requestError:
        unknown
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible solicitar autorización.'
      );

    } finally {
      setRequesting(
        false
      );
    }
  }

  function resetWaiting() {
    if (
      pollRef.current
    ) {
      window.clearInterval(
        pollRef.current
      );
    }

    setChallengeId(
      ''
    );

    setSessionProof(
      ''
    );

    setAuthorizationExpiresAt(
      null
    );

    setAccessStatus(
      'idle'
    );

    setError(
      ''
    );
  }

  function closeTerminal() {
    clearTerminalSessionMemory();

    setTerminalToken(
      ''
    );

    setQrDataUrl(
      ''
    );

    setQrExpiresAt(
      null
    );

    navigate(
      '/admin/destino',
      {
        replace:
          true,
      }
    );
  }

  async function toggleFullscreen() {
    try {
      if (
        document.fullscreenElement
      ) {
        await document.exitFullscreen();

        return;
      }

      await document.documentElement.requestFullscreen();

    } catch {
      setError(
        'El navegador no permitió cambiar a pantalla completa.'
      );
    }
  }

  const qrRemaining =
    qrExpiresAt
      ? countdown(
          qrExpiresAt -
          now
        )
      : '--:--';

  const authorizationRemaining =
    authorizationExpiresAt
      ? countdown(
          authorizationExpiresAt -
          now
        )
      : '--:--';

  const sessionRemaining =
    terminalSessionExpiresAt
      ? countdown(
          terminalSessionExpiresAt -
          now
        )
      : '--:--';

  const active =
    Boolean(
      terminalToken
    );

  return (
    <main className="terminal-experience">
      <header className="terminal-topbar">
        <div className="terminal-brand">
          <span className="terminal-logo-mark">
            RH
          </span>

          <div>
            <span className="terminal-brand-kicker">
              SMART RH · CONTROL DE ASISTENCIA
            </span>

            <h1>
              Terminal QR
            </h1>
          </div>
        </div>

        <div className="terminal-topbar-actions">
          <div className="terminal-topbar-status">
            <span
              className={`terminal-status-dot ${
                active
                  ? 'terminal-status-dot-online'
                  : ''
              }`}
            />

            {active
              ? 'Terminal autorizada'
              : 'Autorización requerida'}
          </div>

          <button
            type="button"
            className="terminal-icon-button"
            onClick={
              () =>
                void toggleFullscreen()
            }
          >
            Pantalla completa
          </button>
        </div>
      </header>

      <section className="terminal-clock-panel">
        <article>
          <span>
            Hora
          </span>

          <strong>
            {timeText}
          </strong>
        </article>

        <article>
          <span>
            Fecha
          </span>

          <strong className="terminal-capitalize">
            {dateText}
          </strong>
        </article>

        <article>
          <span>
            Identificador terminal
          </span>

          <strong>
            {terminalId}
          </strong>
        </article>
      </section>

      {error && (
        <div
          className="terminal-message terminal-message-error"
          role="alert"
        >
          <strong>
            Atención
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {!active ? (
        <section className="terminal-auth-layout">
          <article className="terminal-auth-card">
            <span className="terminal-section-eyebrow">
              AUTORIZACIÓN SEGURA
            </span>

            <h2>
              Activar esta terminal
            </h2>

            <p>
              La terminal utiliza una sesión exclusiva de
              asistencia. Las credenciales administrativas
              nunca se convierten en una sesión QR.
            </p>

            <label className="terminal-field">
              <span>
                Identificador de terminal
              </span>

              <input
                value={
                  terminalId
                }
                maxLength={
                  64
                }
                autoComplete="off"
                disabled={
                  accessStatus ===
                  'pending'
                }
                onChange={
                  event =>
                    setTerminalId(
                      event.target.value
                    )
                }
              />
            </label>

            {accessStatus ===
              'pending' && (
              <div className="terminal-pending-grid">
                <div>
                  <span>
                    Estado
                  </span>

                  <strong>
                    Esperando aprobación
                  </strong>
                </div>

                <div>
                  <span>
                    Tiempo restante
                  </span>

                  <strong>
                    {authorizationRemaining}
                  </strong>
                </div>
              </div>
            )}

            {accessStatus ===
              'rejected' && (
              <div className="terminal-message terminal-message-warning">
                La solicitud fue rechazada por el administrador.
              </div>
            )}

            {accessStatus ===
              'expired' && (
              <div className="terminal-message terminal-message-warning">
                La solicitud venció. Genera una nueva autorización.
              </div>
            )}

            <div className="terminal-button-row">
              {accessStatus !==
              'pending' ? (
                <button
                  type="button"
                  className="terminal-primary-button"
                  disabled={
                    requesting ||
                    terminalId
                      .trim()
                      .length <
                      3
                  }
                  onClick={
                    () =>
                      void requestAccess()
                  }
                >
                  {requesting
                    ? 'Solicitando…'
                    : 'Solicitar autorización'}
                </button>
              ) : (
                <button
                  type="button"
                  className="terminal-secondary-button"
                  onClick={
                    resetWaiting
                  }
                >
                  Cancelar espera local
                </button>
              )}
            </div>
          </article>

          <article className="terminal-auth-help">
            <span className="terminal-section-eyebrow">
              FLUJO SMART RH
            </span>

            <h2>
              Autorización del dispositivo
            </h2>

            <div className="terminal-step-list">
              <div>
                <strong>
                  01
                </strong>

                <span>
                  La terminal solicita autorización.
                </span>
              </div>

              <div>
                <strong>
                  02
                </strong>

                <span>
                  El administrador recibe un correo con
                  el botón para revisar la solicitud.
                </span>
              </div>

              <div>
                <strong>
                  03
                </strong>

                <span>
                  Al aprobarla, este dispositivo obtiene
                  una sesión exclusiva y muestra el QR.
                </span>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section className="terminal-active-layout">
          <article className="terminal-qr-card">
            <header className="terminal-qr-header">
              <div>
                <span className="terminal-section-eyebrow">
                  QR DINÁMICO ACTIVO
                </span>

                <h2>
                  Escanea para registrar asistencia
                </h2>

                <p>
                  Utiliza la aplicación móvil SMART RH.
                </p>
              </div>

              <span className="terminal-live-badge">
                <span />
                EN LÍNEA
              </span>
            </header>

            <div className="terminal-qr-stage">
              <div className="terminal-qr-frame">
                {qrDataUrl ? (
                  <img
                    src={
                      qrDataUrl
                    }
                    alt="Código QR dinámico de asistencia SMART RH"
                  />
                ) : (
                  <div className="terminal-qr-placeholder">
                    {loadingQr
                      ? 'Generando código seguro…'
                      : 'QR no disponible'}
                  </div>
                )}

                <i className="terminal-corner terminal-corner-tl" />
                <i className="terminal-corner terminal-corner-tr" />
                <i className="terminal-corner terminal-corner-bl" />
                <i className="terminal-corner terminal-corner-br" />
              </div>
            </div>

            <footer className="terminal-qr-caption">
              <span>
                Acerca la cámara del teléfono al código.
              </span>

              <strong>
                No compartas capturas del QR.
              </strong>
            </footer>
          </article>

          <aside className="terminal-control-column">
            <article className="terminal-metric-card terminal-metric-card-accent">
              <span>
                Vigencia del QR
              </span>

              <strong>
                {qrRemaining}
              </strong>

              <small>
                Renovación automática antes de vencer
              </small>
            </article>

            <article className="terminal-metric-card">
              <span>
                Sesión de terminal
              </span>

              <strong className="terminal-online-text">
                Activa
              </strong>

              <small>
                Tiempo restante: {sessionRemaining}
              </small>
            </article>

            <article className="terminal-metric-card">
              <span>
                Última actualización
              </span>

              <strong>
                {lastQrUpdate
                  ? new Intl.DateTimeFormat(
                      'es-MX',
                      {
                        hour:
                          '2-digit',

                        minute:
                          '2-digit',

                        second:
                          '2-digit',
                      }
                    ).format(
                      new Date(
                        lastQrUpdate
                      )
                    )
                  : 'Pendiente'}
              </strong>

              <small>
                Sincronización con Backend SMART RH
              </small>
            </article>

            <article className="terminal-control-card">
              <span className="terminal-section-eyebrow">
                CONTROLES
              </span>

              <button
                type="button"
                className="terminal-primary-button"
                disabled={
                  loadingQr
                }
                onClick={
                  () =>
                    void generateQr()
                }
              >
                {loadingQr
                  ? 'Renovando…'
                  : 'Renovar QR'}
              </button>

              <button
                type="button"
                className="terminal-secondary-button"
                onClick={
                  () =>
                    void toggleFullscreen()
                }
              >
                Pantalla completa
              </button>

              <button
                type="button"
                className="terminal-secondary-button"
                onClick={
                  closeTerminal
                }
              >
                Volver al selector
              </button>

              <div className="terminal-auto-refresh">
                <span className="terminal-status-dot terminal-status-dot-online" />

                <div>
                  <strong>
                    Renovación automática
                  </strong>

                  <small>
                    El código cambia antes de que expire.
                  </small>
                </div>
              </div>
            </article>
          </aside>
        </section>
      )}

      <footer className="terminal-footer">
        <span>
          SMART RH · Sistema de Recursos Humanos
        </span>

        <span>
          QR dinámico · Sesión dedicada · Auditoría activa
        </span>
      </footer>
    </main>
  );
}
