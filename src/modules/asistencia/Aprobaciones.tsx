import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

type Asistencia = {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  fecha: string;
  hora_entrada: string;
};

const PAGE_SIZE = 5;

export default function Aprobaciones() {
  const { token } = useAuth();

  const [items, setItems] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const summary = useMemo(() => {
    return {
      total: items.length,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, currentPage]);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/asistencia/pendientes');
      const list = Array.isArray(data?.asistencias) ? data.asistencias : [];
      setItems(list);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudieron cargar las asistencias pendientes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const approve = async (id: number) => {
    if (!token) return;

    try {
      setActionLoadingId(id);
      setError('');

      await api.patch(`/asistencia/${id}/approve`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo aprobar la asistencia.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const reject = async (id: number) => {
    if (!token) return;

    try {
      setActionLoadingId(id);
      setError('');

      await api.patch(`/asistencia/${id}/reject`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo rechazar la asistencia.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="module-card">
      <div className="module-card-header">
        <div>
          <p className="module-eyebrow">Control administrativo</p>
          <h2 className="module-title">Aprobación de asistencias</h2>
          <p className="module-subtitle">
            Revisa, valida y resuelve los registros pendientes antes de que impacten el
            historial general del sistema.
          </p>
        </div>
      </div>

      <div className="module-kpi-row">
        <div className="module-kpi-card">
          <span className="module-kpi-label">Pendientes</span>
          <strong className="module-kpi-value">{summary.total}</strong>
        </div>
      </div>

      {loading && <p className="module-info">Cargando asistencias pendientes...</p>}
      {error && <p className="module-error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="empty-state-card">
          <h3>Sin pendientes</h3>
          <p>No hay asistencias pendientes por aprobar en este momento.</p>
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td>
                      <div className="table-main-text">
                        {a.nombre} {a.apellido}
                      </div>
                      <div className="table-secondary-text">{a.correo}</div>
                    </td>
                    <td>{a.fecha}</td>
                    <td>{a.hora_entrada}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="action-btn action-btn-success"
                          onClick={() => approve(a.id)}
                          disabled={actionLoadingId === a.id}
                          type="button"
                        >
                          {actionLoadingId === a.id ? 'Procesando...' : 'Aprobar'}
                        </button>

                        <button
                          className="action-btn action-btn-danger"
                          onClick={() => reject(a.id)}
                          disabled={actionLoadingId === a.id}
                          type="button"
                        >
                          {actionLoadingId === a.id ? 'Procesando...' : 'Rechazar'}
                        </button>
                      </div>
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
  );
}