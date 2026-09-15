import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode.react';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

export default function QrGenerator() {
  const { token, user } = useAuth();

  const [qrToken, setQrToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lastGeneratedAt, setLastGeneratedAt] = useState('');

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

        /*
          El interceptor central de api.ts agrega el JWT.
          No se construyen headers Authorization manualmente aquí.
        */
        const { data } = await api.post('/asistencia/qr', {});

        if (!mountedRef.current) {
          return;
        }

        const nextToken = String(data?.token ?? '');
        const nextExpiresAt = String(data?.expiresAt ?? '');

        if (!nextToken || !nextExpiresAt) {
          setQrToken('');
          setExpiresAt('');
          setSecondsLeft(0);

          throw new Error(
            'El servidor no devolvió un QR válido con fecha de expiración.'
          );
        }

        const expirationTime = new Date(nextExpiresAt).getTime();

        if (!Number.isFinite(expirationTime)) {
          setQrToken('');
          setExpiresAt('');
          setSecondsLeft(0);

          throw new Error(
            'El servidor devolvió una fecha de expiración inválida.'
          );
        }

        setQrToken(nextToken);
        setExpiresAt(nextExpiresAt);
        setLastGeneratedAt(new Date().toISOString());

        setSecondsLeft(
          Math.max(
            0,
            Math.ceil((expirationTime - Date.now()) / 1000)
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
      } finally {
        generatingRef.current = false;

        if (!silent && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [token, user?.role]
  );

  /*
    Control del montaje para evitar actualizaciones de estado
    después de salir del módulo.
  */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
    Al abrir el módulo se solicita un único QR.
    MongoDB/backend se encargan de la expiración persistente.
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
    El contador visual siempre se calcula desde expiresAt,
    nunca desde una constante del frontend.
  */
  useEffect(() => {
    if (!canUseModule || !expiresAt) {
      setSecondsLeft(0);
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();

    if (!Number.isFinite(expirationTime)) {
      setSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      if (!mountedRef.current) {
        return;
      }

      const remaining = Math.max(
        0,
        Math.ceil((expirationTime - Date.now()) / 1000)
      );

      setSecondsLeft(remaining);
    };

    updateCountdown();

    const intervalId = window.setInterval(
      updateCountdown,
      1000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canUseModule, expiresAt]);

  /*
    La renovación se programa exactamente a partir del expiresAt
    recibido del servidor.

    Añadimos un pequeño margen de 250 ms para no pedir el nuevo QR
    antes de que el anterior haya alcanzado realmente su expiración.
  */
  useEffect(() => {
    if (!canUseModule || !expiresAt) {
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();

    if (!Number.isFinite(expirationTime)) {
      return;
    }

    const delay = Math.max(
      0,
      expirationTime - Date.now() + 250
    );

    const timeoutId = window.setTimeout(async () => {
      if (!mountedRef.current) {
        return;
      }

      /*
        El QR anterior ya venció. Se oculta antes de solicitar
        el siguiente para evitar que el usuario escanee uno expirado.
      */
      setQrToken('');
      setSecondsLeft(0);

      await generate(true);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canUseModule, expiresAt, generate]);

  const formattedExpiresAt = useMemo(() => {
    if (!expiresAt) {
      return 'Pendiente';
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

  const qrStatus = useMemo(() => {
    if (loading) {
      return 'Generando';
    }

    if (!qrToken) {
      return 'Renovando';
    }

    if (secondsLeft <= 0) {
      return 'Expirado';
    }

    return 'QR activo';
  }, [loading, qrToken, secondsLeft]);

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
              Crea un código QR temporal para registrar entrada y
              salida desde la aplicación móvil.
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

            <p>{qrStatus}</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">
              Expira
            </span>

            <p>{formattedExpiresAt}</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">
              Última generación
            </span>

            <p>{formattedLastGeneratedAt}</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">
              Tiempo restante
            </span>

            <p>
              {qrToken
                ? `${secondsLeft}s`
                : 'Pendiente'}
            </p>
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
                Se renovará automáticamente cuando alcance
                la expiración indicada por el servidor.
              </p>
            </>
          ) : (
            <>
              <div className="qr-placeholder-icon">
                QR
              </div>

              <p className="qr-preview-empty-title">
                {expiresAt
                  ? 'Renovando código'
                  : 'Sin código generado'}
              </p>

              <p className="qr-preview-empty-text">
                {expiresAt
                  ? 'Espera mientras se genera el siguiente QR.'
                  : 'Genera un QR para visualizarlo aquí.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
