import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode.react';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

const QR_REFRESH_SECONDS = 10;
const QR_REFRESH_MS = QR_REFRESH_SECONDS * 1000;

export default function QrGenerator() {
  const { token, user } = useAuth();

  const [qrToken, setQrToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QR_REFRESH_SECONDS);
  const [lastGeneratedAt, setLastGeneratedAt] = useState('');
  const [nextRefreshAt, setNextRefreshAt] = useState(0);

  const mountedRef = useRef(false);
  const generatingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const canUseModule =
    Boolean(token) &&
    user?.role === 'admin';

  const generate = useCallback(
    async (silent = false) => {
      if (!token) {
        if (!silent && mountedRef.current) {
          setError('No hay sesión activa.');
        }

        return;
      }

      if (user?.role !== 'admin') {
        if (!silent && mountedRef.current) {
          setError('No tienes permisos para generar QR.');
        }

        return;
      }

      if (generatingRef.current) {
        return;
      }

      try {
        generatingRef.current = true;

        if (mountedRef.current) {
          setError('');

          if (!silent) {
            setLoading(true);
          }
        }

        const { data } = await api.post('/asistencia/qr', {});

        if (!mountedRef.current) {
          return;
        }

        const nextToken = String(data?.token ?? '');
        const nextExpiresAt = String(data?.expiresAt ?? '');

        if (!nextToken) {
          throw new Error(
            'El servidor no devolvió un código QR válido.'
          );
        }

        if (!nextExpiresAt) {
          throw new Error(
            'El servidor no devolvió la vigencia del código QR.'
          );
        }

        const expirationTime =
          new Date(nextExpiresAt).getTime();

        if (Number.isNaN(expirationTime)) {
          throw new Error(
            'El servidor devolvió una vigencia QR inválida.'
          );
        }

        /*
          expiresAt es la fuente de verdad.

          El backend comienza a contar la vigencia cuando genera
          el QR, por lo que no debemos iniciar otros 10 segundos
          adicionales al recibir la respuesta HTTP.
        */
        const remainingMilliseconds =
          expirationTime - Date.now();

        if (remainingMilliseconds <= 0) {
          setQrToken('');
          setExpiresAt('');
          setSecondsLeft(0);
          setNextRefreshAt(Date.now());

          return;
        }

        setQrToken(nextToken);
        setExpiresAt(nextExpiresAt);
        setLastGeneratedAt(new Date().toISOString());

        setNextRefreshAt(expirationTime);

        setSecondsLeft(
          Math.max(
            0,
            Math.ceil(
              remainingMilliseconds /
                1000
            )
          )
        );
      } catch (e: any) {
        if (!mountedRef.current) {
          return;
        }

        setError(
          e?.response?.data?.message ??
            e?.message ??
            'No se pudo generar el QR.'
        );

        /*
          Si falla una renovación automática, se vuelve a intentar
          después de otros 10 segundos.
        */
        if (silent) {
          const retryAt = Date.now() + QR_REFRESH_MS;

          setNextRefreshAt(retryAt);
          setSecondsLeft(QR_REFRESH_SECONDS);
        }
      } finally {
        generatingRef.current = false;

        if (!silent && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [token, user?.role]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
    Al entrar al módulo se genera inmediatamente el primer QR.
  */
  useEffect(() => {
    if (!canUseModule) {
      return;
    }

    if (initialLoadDoneRef.current) {
      return;
    }

    initialLoadDoneRef.current = true;
    generate(true);
  }, [canUseModule, generate]);

  /*
    Cuenta regresiva visual hasta la siguiente renovación.
  */
  useEffect(() => {
    if (!canUseModule || !nextRefreshAt) {
      return;
    }

    const updateCountdown = () => {
      if (!mountedRef.current) {
        return;
      }

      const remaining = Math.max(
        0,
        Math.ceil((nextRefreshAt - Date.now()) / 1000)
      );

      setSecondsLeft(remaining);
    };

    updateCountdown();

    const intervalId = window.setInterval(
      updateCountdown,
      250
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canUseModule, nextRefreshAt]);

  /*
    El QR mostrado en pantalla se renueva cada 10 segundos.
  */
  useEffect(() => {
    if (!canUseModule || !nextRefreshAt) {
      return;
    }

    const delay = Math.max(
      0,
      nextRefreshAt - Date.now()
    );

    const timeoutId = window.setTimeout(() => {
      /*
        El código actual deja de mostrarse justo al alcanzar
        la vigencia definida por el servidor.

        Mientras llega el siguiente QR no dejamos visible
        un código que ya no puede utilizarse.
      */
      setQrToken('');
      setExpiresAt('');
      setSecondsLeft(0);
      setNextRefreshAt(0);

      generate(true);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canUseModule, nextRefreshAt, generate]);

  const formattedExpiresAt = useMemo(() => {
    if (!expiresAt) {
      return 'No disponible';
    }

    const date = new Date(expiresAt);

    if (Number.isNaN(date.getTime())) {
      return 'No disponible';
    }

    return date.toLocaleString();
  }, [expiresAt]);

  const formattedLastGeneratedAt = useMemo(() => {
    if (!lastGeneratedAt) {
      return 'Pendiente';
    }

    return new Date(lastGeneratedAt).toLocaleString();
  }, [lastGeneratedAt]);

  return (
    <div className="qr-admin-layout">
      <div className="qr-admin-card">
        <div className="qr-card-header">
          <div>
            <p className="module-eyebrow">
              Operación
            </p>

            <h3 className="qr-card-title">
              Generador de QR
            </h3>

            <p className="qr-card-subtitle">
              Genera un código QR dinámico para el registro
              de asistencia desde la aplicación móvil.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            marginTop: 12,
            marginBottom: 18,
          }}
        >
          <div className="qr-detail-box">
            <span className="qr-meta-label">
              Estado
            </span>

            <p>
              {qrToken
                ? 'QR activo'
                : 'Generando'}
            </p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">
              Renovación
            </span>

            <p>{secondsLeft}s</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">
              Última generación
            </span>

            <p>{formattedLastGeneratedAt}</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">
              Vigencia del servidor
            </span>

            <p>{formattedExpiresAt}</p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <button
            className="btn qr-main-btn"
            onClick={() => generate(false)}
            disabled={loading}
            type="button"
          >
            {loading
              ? 'Generando...'
              : 'Generar nuevo QR'}
          </button>
        </div>

        {error && (
          <p
            className="module-error"
            style={{ marginTop: 8 }}
          >
            {error}
          </p>
        )}
      </div>

      <div className="qr-preview-card">
        <div className="qr-preview-inner">
          {qrToken ? (
            <>
              <QRCode
                value={qrToken}
                size={220}
              />

              <p className="qr-preview-caption">
                QR listo para escaneo
              </p>

              <p
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: '#5B6B81',
                  textAlign: 'center',
                }}
              >
                El código se renueva automáticamente cada
                {` ${QR_REFRESH_SECONDS} segundos`}.
              </p>
            </>
          ) : (
            <>
              <div className="qr-placeholder-icon">
                QR
              </div>

              <p className="qr-preview-empty-title">
                Generando código
              </p>

              <p className="qr-preview-empty-text">
                Espera mientras se genera el código QR.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
