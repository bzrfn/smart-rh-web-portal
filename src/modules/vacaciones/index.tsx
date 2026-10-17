import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type Vacacion = {
  id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  dias_disponibles: number;
  dias_solicitados: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  created_at?: string;
  updated_at?: string;
};

type VacationFilter = 'todas' | Vacacion['estado'];

const PAGE_SIZE = 5;

export default function Vacaciones() {
  const [items, setItems] = useState<Vacacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<VacationFilter>('todas');

  const summary = useMemo(() => {
    const pendientes = items.filter((i) => i.estado === 'pendiente').length;
    const aprobadas = items.filter((i) => i.estado === 'aprobada').length;
    const rechazadas = items.filter((i) => i.estado === 'rechazada').length;

    return {
      total: items.length,
      pendientes,
      aprobadas,
      rechazadas,
    };
  }, [items]);

  const filteredItems = useMemo(
    () => (filter === 'todas' ? items : items.filter((item) => item.estado === filter)),
    [filter, items]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/vacaciones');
      const list = Array.isArray(data?.vacaciones) ? data.vacaciones : [];

      setItems(list);
      setCurrentPage(1);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          'No se pudieron cargar las solicitudes de vacaciones.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const aprobar = async (id: number) => {
    try {
      setActionLoadingId(id);
      setError('');

      const { data } = await api.patch(`/vacaciones/${id}/approve`);

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo aprobar la solicitud.');
        return;
      }

      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? 'No se pudo aprobar la solicitud.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const rechazar = async (id: number) => {
    try {
      setActionLoadingId(id);
      setError('');

      const { data } = await api.patch(`/vacaciones/${id}/reject`);

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo rechazar la solicitud.');
        return;
      }

      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? 'No se pudo rechazar la solicitud.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="dashboard-page operation-page vacation-operation-page">
      <div className="module-card operation-overview">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Administración</p>
            <h2 className="module-title">Vacaciones</h2>
            <p className="module-subtitle">
              Consulta, valida y resuelve las solicitudes de vacaciones registradas
              por los usuarios.
            </p>
          </div>
        </div>

        <div className="module-hero-banner operation-brief">
          <div className="module-hero-copy">
            <h3>Control de solicitudes y disponibilidad</h3>
            <p>
              Administra aprobaciones y rechazos con visibilidad clara sobre días
              solicitados, disponibilidad al momento del registro y rango de fechas.
            </p>
          </div>

          <div className="module-hero-badge">Gestión de ausencias</div>
        </div>

        <div className="asistencia-summary-grid operation-summary-grid">
          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Total</h3>
            <p>{summary.total} solicitudes registradas.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Pendientes</h3>
            <p>{summary.pendientes} solicitudes por revisar.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Aprobadas</h3>
            <p>{summary.aprobadas} solicitudes aprobadas.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Rechazadas</h3>
            <p>{summary.rechazadas} solicitudes rechazadas.</p>
          </div>
        </div>
      </div>

      <div className="module-card operation-queue-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Control administrativo</p>
            <h2 className="module-title">Solicitudes de vacaciones</h2>
            <p className="module-subtitle">
              Ejecuta aprobaciones o rechazos y monitorea el estado de cada
              solicitud.
            </p>
          </div>
        </div>

        <div className="operation-filter-tabs" role="group" aria-label="Filtrar solicitudes">
          {(['todas', 'pendiente', 'aprobada', 'rechazada'] as VacationFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {value === 'todas' ? 'Todas' : value === 'pendiente' ? 'Pendientes' : value === 'aprobada' ? 'Aprobadas' : 'Rechazadas'}
            </button>
          ))}
        </div>

        {loading && <p className="module-info">Cargando solicitudes…</p>}
        {error && <p className="module-error">{error}</p>}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="empty-state-card">
            <h3>Sin solicitudes</h3>
            <p>No hay solicitudes de vacaciones registradas por el momento.</p>
          </div>
        )}

        {filteredItems.length > 0 && (
          <>
            <div className="table-wrapper operation-table-wrapper vacation-table-wrapper">
              <table className="smart-table operation-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Periodo solicitado</th>
                    <th>Resumen</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedItems.map((v) => (
                    <tr key={v.id} className={`operation-row status-${v.estado}`}>
                      <td data-label="Empleado" className="operation-person-cell">
                        <div className="operation-person">
                          <span className="operation-person-avatar" aria-hidden="true">
                            {v.nombre?.charAt(0)}{v.apellido?.charAt(0)}
                          </span>
                          <div>
                            <div className="table-main-text">
                              {v.nombre} {v.apellido}
                            </div>
                            <div className="table-secondary-text">{v.correo}</div>
                          </div>
                        </div>
                      </td>

                      <td data-label="Periodo solicitado">
                        <div className="operation-date-line">
                          {formatDateDisplay(v.fecha_inicio)} →{' '}
                          {formatDateDisplay(v.fecha_fin)}
                        </div>
                      </td>

                      <td data-label="Resumen">
                        <div className="operation-request-summary">
                          <span><strong>{v.dias_solicitados}</strong> días solicitados</span>
                          <span><strong>{v.dias_disponibles}</strong> disponibles al registrar</span>
                        </div>
                      </td>

                      <td data-label="Estado">
                        <span className={`status-pill ${mapEstadoClass(v.estado)}`}>
                          {v.estado}
                        </span>
                      </td>

                      <td data-label="Acciones">
                        {v.estado === 'pendiente' ? (
                          <div className="table-actions">
                            <button
                              className="action-btn action-btn-success"
                              onClick={() => aprobar(v.id)}
                              disabled={actionLoadingId === v.id}
                              type="button"
                            >
                              {actionLoadingId === v.id
                                ? 'Procesando...'
                                : 'Aprobar'}
                            </button>

                            <button
                              className="action-btn action-btn-danger"
                              onClick={() => rechazar(v.id)}
                              disabled={actionLoadingId === v.id}
                              type="button"
                            >
                              {actionLoadingId === v.id
                                ? 'Procesando...'
                                : 'Rechazar'}
                            </button>
                          </div>
                        ) : (
                          <span className="table-secondary-text">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar">
              <button
                className="btn pagination-btn"
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>

              <span className="pagination-info">
                Página {currentPage} de {totalPages}
              </span>

              <button
                className="btn pagination-btn"
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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

function mapEstadoClass(estado: Vacacion['estado']) {
  switch (estado) {
    case 'aprobada':
      return 'active';
    case 'rechazada':
      return 'inactive';
    default:
      return 'admin';
  }
}

function formatDateDisplay(value?: string) {
  if (!value) return '';
  return String(value).slice(0, 10);
}
