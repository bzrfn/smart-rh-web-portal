import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode.react';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

const AUTO_REFRESH_SECONDS = 15;
const CLEANUP_INTERVAL_SECONDS = 30;

export default function QrGenerator() {
  const { token, user } = useAuth();

  const [qrToken, setQrToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REFRESH_SECONDS);
  const [lastGeneratedAt, setLastGeneratedAt] = useState('');

  const mountedRef = useRef(false);
  const generatingRef = useRef(false);
  const cleaningRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const canUseModule = Boolean(token) && user?.role === 'admin';

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const cleanupExpiredQrs = useCallback(async (silent = false) => {
    if (!token || cleaningRef.current) return;

    try {
      cleaningRef.current = true;
      if (!silent && mountedRef.current) {
        setCleanupLoading(true);
      }

      await api.delete('/asistencia/qr/expired', authConfig);
    } catch {
      // limpieza silenciosa
    } finally {
      cleaningRef.current = false;
      if (!silent && mountedRef.current) {
        setCleanupLoading(false);
      }
    }
  }, [token, authConfig]);

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

      if (generatingRef.current) return;

      try {
        generatingRef.current = true;

        if (!silent && mountedRef.current) {
          setLoading(true);
        }

        if (mountedRef.current) {
          setError('');
        }

        const { data } = await api.post('/asistencia/qr', {}, authConfig);

        if (!mountedRef.current) return;

        setQrToken(String(data?.token ?? ''));
        setExpiresAt(String(data?.expiresAt ?? ''));
        setLastGeneratedAt(new Date().toISOString());
        setSecondsLeft(AUTO_REFRESH_SECONDS);
      } catch (e: any) {
        if (!mountedRef.current) return;
        setError(e?.response?.data?.message ?? 'Error al generar QR');
      } finally {
        generatingRef.current = false;

        if (!silent && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [token, user?.role, authConfig]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!canUseModule) return;
    if (initialLoadDoneRef.current) return;

    initialLoadDoneRef.current = true;

    const runInitialLoad = async () => {
      await cleanupExpiredQrs(true);
      await generate(true);
    };

    runInitialLoad();
  }, [canUseModule, cleanupExpiredQrs, generate]);

  useEffect(() => {
    if (!canUseModule) return;

    const countdownInterval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          generate(true);
          return AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [canUseModule, generate]);

  useEffect(() => {
    if (!canUseModule) return;

    const cleanupInterval = window.setInterval(() => {
      cleanupExpiredQrs(true);
    }, CLEANUP_INTERVAL_SECONDS * 1000);

    return () => {
      window.clearInterval(cleanupInterval);
    };
  }, [canUseModule, cleanupExpiredQrs]);

  const formattedExpiresAt = useMemo(() => {
    if (!expiresAt) return 'Pendiente';
    return new Date(expiresAt).toLocaleString();
  }, [expiresAt]);

  const formattedLastGeneratedAt = useMemo(() => {
    if (!lastGeneratedAt) return 'Pendiente';
    return new Date(lastGeneratedAt).toLocaleString();
  }, [lastGeneratedAt]);

  return (
    <div className="qr-admin-layout">
      <div className="qr-admin-card">
        <div className="qr-card-header">
          <div>
            <p className="module-eyebrow">Operación</p>
            <h3 className="qr-card-title">Generador de QR</h3>
            <p className="qr-card-subtitle">
              Crea un código QR temporal para registrar entrada y salida desde la app móvil.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            marginTop: 12,
            marginBottom: 18,
          }}
        >
          <div className="qr-detail-box">
            <span className="qr-meta-label">Estado</span>
            <p>{qrToken ? 'QR activo' : 'Sin QR generado'}</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">Expira</span>
            <p>{formattedExpiresAt}</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">Última generación</span>
            <p>{formattedLastGeneratedAt}</p>
          </div>

          <div className="qr-detail-box">
            <span className="qr-meta-label">Próximo refresh</span>
            <p>{secondsLeft}s</p>
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
            {loading ? 'Generando...' : 'Generar QR ahora'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => cleanupExpiredQrs(false)}
            disabled={cleanupLoading}
            type="button"
          >
            {cleanupLoading ? 'Limpiando...' : 'Limpiar expirados'}
          </button>
        </div>

        {error && (
          <p className="module-error" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}

        {qrToken && (
          <div className="qr-token-panel">
            <span className="qr-meta-label">Token generado</span>
            <p className="qr-token-text">{qrToken}</p>
          </div>
        )}
      </div>

      <div className="qr-preview-card">
        <div className="qr-preview-inner">
          {qrToken ? (
            <>
              <QRCode value={qrToken} size={220} />
              <p className="qr-preview-caption">QR listo para escaneo</p>
              <p
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: '#5B6B81',
                  textAlign: 'center',
                }}
              >
                Se actualiza automáticamente cada {AUTO_REFRESH_SECONDS} segundos.
              </p>
            </>
          ) : (
            <>
              <div className="qr-placeholder-icon">QR</div>
              <p className="qr-preview-empty-title">Sin código generado</p>
              <p className="qr-preview-empty-text">
                Genera un QR para visualizarlo aquí.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}