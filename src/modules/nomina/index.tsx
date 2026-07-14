import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type Nomina = {
  id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  salario_base: number;
  deducciones: number;
  bonos: number;
  total: number;
  estado: 'pendiente' | 'pagado';
  periodo_inicio: string;
  periodo_fin: string;
  created_at?: string;
  updated_at?: string;
};

type UserOption = {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  role?: string;
  activo?: number;
};

type FormState = {
  usuario_id: string;
  salario_base: string;
  deducciones: string;
  bonos: string;
  estado: 'pendiente' | 'pagado';
  periodo_inicio: string;
  periodo_fin: string;
};

type EditState = {
  id: number | null;
  salario_base: string;
  deducciones: string;
  bonos: string;
  estado: 'pendiente' | 'pagado';
  periodo_inicio: string;
  periodo_fin: string;
};

const PAGE_SIZE = 5;

export default function Nomina() {
  const [items, setItems] = useState<Nomina[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserResults, setShowUserResults] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [changingEstadoId, setChangingEstadoId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState<FormState>({
    usuario_id: '',
    salario_base: '',
    deducciones: '0',
    bonos: '0',
    estado: 'pendiente',
    periodo_inicio: '',
    periodo_fin: '',
  });

  const [edit, setEdit] = useState<EditState>({
    id: null,
    salario_base: '',
    deducciones: '',
    bonos: '',
    estado: 'pendiente',
    periodo_inicio: '',
    periodo_fin: '',
  });

  const summary = useMemo(() => {
    const pendientes = items.filter((i) => i.estado === 'pendiente').length;
    const pagadas = items.filter((i) => i.estado === 'pagado').length;
    const totalNominas = items.reduce((acc, item) => acc + Number(item.total || 0), 0);

    return {
      total: items.length,
      pendientes,
      pagadas,
      totalNominas,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, currentPage]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const base = users.filter((u) => u.activo !== 0);

    if (!q) return base.slice(0, 8);

    return base
      .filter((u) => {
        const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
        return fullName.includes(q) || u.correo.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [users, userSearch]);

  const selectedUser = useMemo(() => {
    return users.find((u) => String(u.id) === form.usuario_id) || null;
  }, [users, form.usuario_id]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/nominas');
      const list = Array.isArray(data?.nominas) ? data.nominas : [];
      setItems(list);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudieron cargar las nóminas.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const { data } = await api.get('/users');
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudieron cargar los usuarios.');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadUsers();
  }, [load, loadUsers]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditChange = (field: keyof EditState, value: string | number | null) => {
    setEdit((prev) => ({ ...prev, [field]: value })) as void;
  };

  const selectUser = (user: UserOption) => {
    setForm((prev) => ({ ...prev, usuario_id: String(user.id) }));
    setUserSearch(`${user.nombre} ${user.apellido} - ${user.correo}`);
    setShowUserResults(false);
  };

  const clearSelectedUser = () => {
    setForm((prev) => ({ ...prev, usuario_id: '' }));
    setUserSearch('');
    setShowUserResults(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        usuario_id: Number(form.usuario_id),
        salario_base: Number(form.salario_base),
        deducciones: Number(form.deducciones || 0),
        bonos: Number(form.bonos || 0),
        estado: form.estado,
        periodo_inicio: form.periodo_inicio,
        periodo_fin: form.periodo_fin,
      };

      const { data } = await api.post('/nominas', payload);

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo registrar la nómina.');
        return;
      }

      setForm({
        usuario_id: '',
        salario_base: '',
        deducciones: '0',
        bonos: '0',
        estado: 'pendiente',
        periodo_inicio: '',
        periodo_fin: '',
      });

      setUserSearch('');
      setShowUserResults(false);

      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo registrar la nómina.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: Nomina) => {
    setEdit({
      id: item.id,
      salario_base: String(item.salario_base),
      deducciones: String(item.deducciones),
      bonos: String(item.bonos),
      estado: item.estado,
      periodo_inicio: formatDateInput(item.periodo_inicio),
      periodo_fin: formatDateInput(item.periodo_fin),
    });
  };

  const cancelEdit = () => {
    setEdit({
      id: null,
      salario_base: '',
      deducciones: '',
      bonos: '',
      estado: 'pendiente',
      periodo_inicio: '',
      periodo_fin: '',
    });
  };

  const saveEdit = async () => {
    if (!edit.id || savingEdit) return;

    try {
      setSavingEdit(true);
      setError('');

      const payload = {
        salario_base: Number(edit.salario_base),
        deducciones: Number(edit.deducciones || 0),
        bonos: Number(edit.bonos || 0),
        estado: edit.estado,
        periodo_inicio: edit.periodo_inicio,
        periodo_fin: edit.periodo_fin,
      };

      const { data } = await api.put(`/nominas/${edit.id}`, payload);

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo actualizar la nómina.');
        return;
      }

      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo actualizar la nómina.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEstado = async (item: Nomina) => {
    try {
      setChangingEstadoId(item.id);
      setError('');

      const siguienteEstado = item.estado === 'pagado' ? 'pendiente' : 'pagado';

      const { data } = await api.patch(`/nominas/${item.id}/estado`, {
        estado: siguienteEstado,
      });

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo cambiar el estado.');
        return;
      }

      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo cambiar el estado.');
    } finally {
      setChangingEstadoId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Administración</p>
            <h2 className="module-title">Nómina</h2>
            <p className="module-subtitle">
              Registra, corrige y administra los periodos de nómina del personal.
            </p>
          </div>
        </div>

        <div className="module-hero-banner">
          <div className="module-hero-copy">
            <h3>Control financiero operativo</h3>
            <p>
              Gestiona los importes base, bonos, deducciones y estatus de pago desde un
              mismo flujo administrativo.
            </p>
          </div>

          <div className="module-hero-badge">Gestión de pagos</div>
        </div>

        <div className="asistencia-summary-grid">
          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Total</h3>
            <p>{summary.total} nóminas registradas.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Pendientes</h3>
            <p>{summary.pendientes} nóminas pendientes.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Pagadas</h3>
            <p>{summary.pagadas} nóminas marcadas como pagadas.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Total acumulado</h3>
            <p>${summary.totalNominas.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Alta</p>
            <h2 className="module-title">Registrar nómina</h2>
            <p className="module-subtitle">
              Selecciona un usuario y captura el periodo de nómina correspondiente.
            </p>
          </div>
        </div>

        {error && <p className="module-error">{error}</p>}

        <form className="smart-form-grid" onSubmit={onSubmit}>
          <div className="smart-form-group smart-form-group-full">
            <label>Buscar usuario</label>

            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setShowUserResults(true);
                if (form.usuario_id) {
                  setForm((prev) => ({ ...prev, usuario_id: '' }));
                }
              }}
              onFocus={() => setShowUserResults(true)}
              placeholder={loadingUsers ? 'Cargando usuarios...' : 'Escribe nombre o correo'}
            />

            {selectedUser && (
              <div className="selected-user-chip">
                Seleccionado: {selectedUser.nombre} {selectedUser.apellido} ({selectedUser.correo})
                <button type="button" className="inline-clear-btn" onClick={clearSelectedUser}>
                  Cambiar
                </button>
              </div>
            )}

            {showUserResults && !selectedUser && filteredUsers.length > 0 && (
              <div className="user-search-results">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="user-search-item"
                    onClick={() => selectUser(user)}
                  >
                    <span className="user-search-name">
                      {user.nombre} {user.apellido}
                    </span>
                    <span className="user-search-email">{user.correo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="smart-form-group">
            <label>Salario base</label>
            <input
              type="number"
              step="0.01"
              value={form.salario_base}
              onChange={(e) => handleChange('salario_base', e.target.value)}
              placeholder="Ej. 12000"
            />
          </div>

          <div className="smart-form-group">
            <label>Deducciones</label>
            <input
              type="number"
              step="0.01"
              value={form.deducciones}
              onChange={(e) => handleChange('deducciones', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="smart-form-group">
            <label>Bonos</label>
            <input
              type="number"
              step="0.01"
              value={form.bonos}
              onChange={(e) => handleChange('bonos', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="smart-form-group">
            <label>Estado</label>
            <select
              value={form.estado}
              onChange={(e) => handleChange('estado', e.target.value as 'pendiente' | 'pagado')}
            >
              <option value="pendiente">pendiente</option>
              <option value="pagado">pagado</option>
            </select>
          </div>

          <div className="smart-form-group">
            <label>Periodo inicio</label>
            <input
              type="date"
              value={form.periodo_inicio}
              onChange={(e) => handleChange('periodo_inicio', e.target.value)}
            />
          </div>

          <div className="smart-form-group">
            <label>Periodo fin</label>
            <input
              type="date"
              value={form.periodo_fin}
              onChange={(e) => handleChange('periodo_fin', e.target.value)}
            />
          </div>

          <div className="smart-form-actions">
            <button className="btn" type="submit" disabled={submitting || !form.usuario_id}>
              {submitting ? 'Guardando...' : 'Registrar nómina'}
            </button>
          </div>
        </form>
      </div>

      {edit.id && (
        <div className="module-card">
          <div className="module-card-header">
            <div>
              <p className="module-eyebrow">Edición</p>
              <h2 className="module-title">Editar nómina #{edit.id}</h2>
              <p className="module-subtitle">
                Ajusta importes, estado y periodo para corregir el registro seleccionado.
              </p>
            </div>
          </div>

          <div className="smart-form-grid">
            <div className="smart-form-group">
              <label>Salario base</label>
              <input
                type="number"
                step="0.01"
                value={edit.salario_base}
                onChange={(e) => handleEditChange('salario_base', e.target.value)}
              />
            </div>

            <div className="smart-form-group">
              <label>Deducciones</label>
              <input
                type="number"
                step="0.01"
                value={edit.deducciones}
                onChange={(e) => handleEditChange('deducciones', e.target.value)}
              />
            </div>

            <div className="smart-form-group">
              <label>Bonos</label>
              <input
                type="number"
                step="0.01"
                value={edit.bonos}
                onChange={(e) => handleEditChange('bonos', e.target.value)}
              />
            </div>

            <div className="smart-form-group">
              <label>Estado</label>
              <select
                value={edit.estado}
                onChange={(e) => handleEditChange('estado', e.target.value as 'pendiente' | 'pagado')}
              >
                <option value="pendiente">pendiente</option>
                <option value="pagado">pagado</option>
              </select>
            </div>

            <div className="smart-form-group">
              <label>Periodo inicio</label>
              <input
                type="date"
                value={edit.periodo_inicio}
                onChange={(e) => handleEditChange('periodo_inicio', e.target.value)}
              />
            </div>

            <div className="smart-form-group">
              <label>Periodo fin</label>
              <input
                type="date"
                value={edit.periodo_fin}
                onChange={(e) => handleEditChange('periodo_fin', e.target.value)}
              />
            </div>

            <div className="smart-form-actions">
              <button className="btn" type="button" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>

              <button className="btn btn-secondary" type="button" onClick={cancelEdit}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Historial</p>
            <h2 className="module-title">Listado de nóminas</h2>
            <p className="module-subtitle">
              Consulta los registros más recientes y opera cambios desde la misma tabla.
            </p>
          </div>
        </div>

        {loading && <p className="module-info">Cargando nóminas...</p>}

        {!loading && items.length === 0 && (
          <div className="empty-state-card">
            <h3>Sin registros</h3>
            <p>No hay nóminas registradas por el momento.</p>
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
                    <th>Periodo</th>
                    <th>Importes</th>
                    <th>Estado</th>
                    <th>Acciones</th>
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

                      <td>
                        <div className="table-main-text">
                          {formatDateDisplay(item.periodo_inicio)} → {formatDateDisplay(item.periodo_fin)}
                        </div>
                      </td>

                      <td>
                        <div className="table-main-text">
                          Total: ${Number(item.total).toFixed(2)}
                        </div>
                        <div className="table-secondary-text">
                          Base: ${Number(item.salario_base).toFixed(2)} | Bonos: $
                          {Number(item.bonos).toFixed(2)} | Deducciones: $
                          {Number(item.deducciones).toFixed(2)}
                        </div>
                      </td>

                      <td>
                        <span className={`status-pill ${item.estado === 'pagado' ? 'active' : 'admin'}`}>
                          {item.estado}
                        </span>
                      </td>

                      <td>
                        <div className="table-actions">
                          <button className="btn btn-small" type="button" onClick={() => startEdit(item)}>
                            Editar
                          </button>

                          <button
                            className="btn btn-small"
                            type="button"
                            onClick={() => toggleEstado(item)}
                            disabled={changingEstadoId === item.id}
                          >
                            {changingEstadoId === item.id
                              ? 'Actualizando...'
                              : item.estado === 'pagado'
                              ? 'Marcar pendiente'
                              : 'Marcar pagado'}
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

function formatDateInput(value?: string) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatDateDisplay(value?: string) {
  if (!value) return '';
  return String(value).slice(0, 10);
}