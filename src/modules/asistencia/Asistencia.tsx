import { useCallback, useEffect, useMemo, useState } from 'react';
import Aprobaciones from './Aprobaciones';
import { useAuth } from '../../app/auth/AuthContext';
import { api } from '../../services/api';

import { formatAttendanceDate } from './asistenciaDate';

type AsistenciaItem = {
  id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  fecha: string;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  estado:
    | 'pendiente'
    | 'aprobada'
    | 'rechazada'
    | 'INVALIDA_PENDIENTE_REVISION';
  duracion_minima_aplicada_minutos?: number | null;
  duracion_registrada_segundos?: number | null;
  qr_token?: string | null;
};

const PAGE_SIZE = 5;

export default function Asistencia() {
  const { user, token } = useAuth();

  const [items, setItems] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const summary = useMemo(() => {
    const pendientes = items.filter((i) => i.estado === 'pendiente').length;

    const pendientesRevision = items.filter(
      (i) => i.estado === 'INVALIDA_PENDIENTE_REVISION'
    ).length;

    const aprobadas = items.filter((i) => i.estado === 'aprobada').length;
    const rechazadas = items.filter((i) => i.estado === 'rechazada').length;

    return {
      total: items.length,
      pendientes,
      pendientesRevision,
      aprobadas,
      rechazadas,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return items.slice(start, end);
  }, [items, currentPage]);

  const loadAsistencias = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/asistencia');
      const list = Array.isArray(data?.asistencias) ? data.asistencias : [];
      setItems(list);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo cargar el historial de asistencias.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return;
    loadAsistencias();
  }, [token, user?.role, loadAsistencias]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (!token) {
    return (
      <div className="module-card">
        <div className="empty-state-card">
          <h3>Sesión requerida</h3>
          <p>Debes iniciar sesión para acceder al módulo de asistencia.</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return (
      <div className="dashboard-page">
        <div className="module-card">
          <div className="module-card-header">
            <div>
              <p className="module-eyebrow">Operación</p>
              <h2 className="module-title">Asistencia</h2>
              <p className="module-subtitle">
                Gestiona aprobaciones, seguimiento y control operativo del registro de
                asistencia del personal.
              </p>
            </div>
          </div>

          <div className="module-hero-banner">
            <div className="module-hero-copy">
              <h3>Control de trazabilidad operativa</h3>
              <p>
                Supervisa los registros capturados desde la app móvil, valida pendientes y
                mantén consistencia antes de impactar otros módulos.
              </p>
            </div>

            <div className="module-hero-badge">Gestión centralizada</div>
          </div>

          <div className="asistencia-summary-grid">
            <div className="asistencia-summary-card">
              <div className="dashboard-card-accent teal" />
              <h3>Total</h3>
              <p>{summary.total} registros en historial general.</p>
            </div>

            <div className="asistencia-summary-card">
              <div className="dashboard-card-accent blue" />
              <h3>Pendientes</h3>
              <p>{summary.pendientes} registros por revisar.</p>
            </div>

            <div className="asistencia-summary-card">
              <div className="dashboard-card-accent blue" />
              <h3>Pendientes de revisión</h3>
              <p>
                {summary.pendientesRevision} registros requieren validación
                administrativa.
              </p>
            </div>

            <div className="asistencia-summary-card">
              <div className="dashboard-card-accent teal" />
              <h3>Aprobadas</h3>
              <p>{summary.aprobadas} asistencias aprobadas.</p>
            </div>

            <div className="asistencia-summary-card">
              <div className="dashboard-card-accent blue" />
              <h3>Rechazadas</h3>
              <p>{summary.rechazadas} asistencias rechazadas.</p>
            </div>
          </div>
        </div>

        <Aprobaciones />

        <div className="module-card">
          <div className="module-card-header">
            <div>
              <p className="module-eyebrow">Historial</p>
              <h2 className="module-title">Historial general de asistencias</h2>
              <p className="module-subtitle">
                Visualiza todos los registros del sistema con su estado actual.
              </p>
            </div>
          </div>

          {loading && <p className="module-info">Cargando historial...</p>}
          {error && <p className="module-error">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <div className="empty-state-card">
              <h3>Sin registros</h3>
              <p>No hay asistencias registradas por el momento.</p>
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="smart-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                        <th>Duración</th>
                        <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>
                          <div className="table-main-text">
                            {item.nombre} {item.apellido}
                          </div>
                          <div className="table-secondary-text">{item.correo}</div>
                        </td>
                        <td>{formatAttendanceDate(item.fecha)}</td>
                        <td>{item.hora_entrada || 'Sin dato'}</td>
                        <td>{item.hora_salida || 'Sin dato'}</td>

                          <td>
                            <div className="table-main-text">
                              {formatDurationSeconds(
                                item.duracion_registrada_segundos
                              )}
                            </div>

                            <div className="table-secondary-text">
                              Mínimo aplicado:{' '}
                              {formatMinimumMinutes(
                                item.duracion_minima_aplicada_minutos
                              )}
                            </div>
                          </td>

                          <td>
                          <span className={`status-pill ${mapEstadoClass(item.estado)}`}>
                            {formatEstadoLabel(item.estado)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-bar">
                <button
                  className="btn pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  type="button"
                >
                  Anterior
                </button>

                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  className="btn pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Consulta</p>
            <h2 className="module-title">Asistencia</h2>
            <p className="module-subtitle">
              Consulta información relacionada con tus registros de asistencia.
            </p>
          </div>
        </div>

        <div className="module-hero-banner">
          <div className="module-hero-copy">
            <h3>Seguimiento personal</h3>
            <p>
              Aquí se integrará tu historial individual, el estado de validación y el
              seguimiento operativo de tus registros.
            </p>
          </div>

          <div className="module-hero-badge">Vista de usuario</div>
        </div>

        <div className="asistencia-summary-grid">
          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Mi historial</h3>
            <p>Aquí se mostrará tu historial real de asistencias.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Estado de registros</h3>
            <p>Aquí se mostrará el estado de validación de tus asistencias registradas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapEstadoClass(estado: AsistenciaItem['estado']) {
  switch (estado) {
    case 'aprobada':
      return 'active';
    case 'rechazada':
      return 'inactive';
    default:
      return 'admin';
  }
}


function formatEstadoLabel(
  estado: AsistenciaItem['estado']
) {
  switch (estado) {
    case 'INVALIDA_PENDIENTE_REVISION':
      return 'Pendiente de revisión';

    case 'aprobada':
      return 'Aprobada';

    case 'rechazada':
      return 'Rechazada';

    default:
      return 'Pendiente';
  }
}


function formatDurationSeconds(
  value?: number | null
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return 'Sin duración calculada';
  }

  const totalSeconds =
    Math.max(
      0,
      Math.round(
        Number(value)
      )
    );

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const seconds =
    totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} s`;
  }

  return `${minutes} min ${seconds} s`;
}


function formatMinimumMinutes(
  value?: number | null
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return 'No registrado';
  }

  return `${Number(value)} min`;
}
