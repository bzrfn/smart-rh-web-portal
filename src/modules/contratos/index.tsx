import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type Contrato = {
  id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  tipo_contrato: 'indefinido' | 'temporal' | 'practicante' | 'honorarios';
  salario_base: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: 'activo' | 'inactivo' | 'finalizado';
  contrato_pdf_url?: string | null;
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
  tipo_contrato: 'indefinido' | 'temporal' | 'practicante' | 'honorarios';
  salario_base: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'inactivo' | 'finalizado';
};

type EditState = {
  id: number | null;
  tipo_contrato: 'indefinido' | 'temporal' | 'practicante' | 'honorarios';
  salario_base: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'inactivo' | 'finalizado';
};

const PAGE_SIZE = 5;
const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
const fullUrl = (url?: string | null) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${apiBase}${url}`;
};

export default function Contratos() {
  const [items, setItems] = useState<Contrato[]>([]);
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
    tipo_contrato: 'indefinido',
    salario_base: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo',
  });

  const [edit, setEdit] = useState<EditState>({
    id: null,
    tipo_contrato: 'indefinido',
    salario_base: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo',
  });

  const summary = useMemo(() => {
    return {
      total: items.length,
      activos: items.filter((i) => i.estado === 'activo').length,
      inactivos: items.filter((i) => i.estado === 'inactivo').length,
      finalizados: items.filter((i) => i.estado === 'finalizado').length,
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

  const selectedUserLatestContrato = useMemo(() => {
    if (!form.usuario_id) return null;

    return (
      items
        .filter((item) => String(item.usuario_id) === form.usuario_id)
        .sort((a, b) => Number(b.id) - Number(a.id))[0] || null
    );
  }, [items, form.usuario_id]);

  const selectedContratoUrl = selectedUserLatestContrato?.contrato_pdf_url || '';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/contratos');
      const list = Array.isArray(data?.contratos) ? data.contratos : [];
      setItems(list);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudieron cargar los contratos.');
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
    if (currentPage > totalPages) setCurrentPage(totalPages);
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
        tipo_contrato: form.tipo_contrato,
        salario_base: Number(form.salario_base),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin.trim() ? form.fecha_fin : null,
        estado: form.estado,
      };

      const { data } = await api.post('/contratos', payload);

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo registrar el contrato.');
        return;
      }

      setForm({
        usuario_id: '',
        tipo_contrato: 'indefinido',
        salario_base: '',
        fecha_inicio: '',
        fecha_fin: '',
        estado: 'activo',
      });

      setUserSearch('');
      setShowUserResults(false);

      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo registrar el contrato.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: Contrato) => {
    setEdit({
      id: item.id,
      tipo_contrato: item.tipo_contrato,
      salario_base: String(item.salario_base),
      fecha_inicio: formatDateInput(item.fecha_inicio),
      fecha_fin: formatDateInput(item.fecha_fin || ''),
      estado: item.estado,
    });
  };

  const cancelEdit = () => {
    setEdit({
      id: null,
      tipo_contrato: 'indefinido',
      salario_base: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: 'activo',
    });
  };

  const saveEdit = async () => {
    if (!edit.id || savingEdit) return;

    try {
      setSavingEdit(true);
      setError('');

      const payload = {
        tipo_contrato: edit.tipo_contrato,
        salario_base: Number(edit.salario_base),
        fecha_inicio: edit.fecha_inicio,
        fecha_fin: edit.fecha_fin.trim() ? edit.fecha_fin : null,
        estado: edit.estado,
      };

      const { data } = await api.put(`/contratos/${edit.id}`, payload);

      if (!data?.ok) {
        setError(data?.message ?? 'No se pudo actualizar el contrato.');
        return;
      }

      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo actualizar el contrato.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEstado = async (item: Contrato) => {
    try {
      setChangingEstadoId(item.id);
      setError('');

      const siguienteEstado =
        item.estado === 'activo'
          ? 'inactivo'
          : item.estado === 'inactivo'
          ? 'finalizado'
          : 'activo';

      const { data } = await api.patch(`/contratos/${item.id}/estado`, {
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
            <h2 className="module-title">Contratos</h2>
            <p className="module-subtitle">Registra, corrige y administra los contratos del personal.</p>
          </div>
        </div>

        <div className="module-hero-banner">
          <div className="module-hero-copy">
            <h3>Control contractual centralizado</h3>
            <p>
              Gestiona tipo de contrato, salario, vigencia y estado del vínculo laboral desde un único flujo administrativo.
            </p>
          </div>

          <div className="module-hero-badge">Gestión contractual</div>
        </div>

        <div className="asistencia-summary-grid">
          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Total</h3>
            <p>{summary.total} contratos registrados.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Activos</h3>
            <p>{summary.activos} contratos activos.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Inactivos</h3>
            <p>{summary.inactivos} contratos inactivos.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Finalizados</h3>
            <p>{summary.finalizados} contratos finalizados.</p>
          </div>
        </div>
      </div>

      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Alta</p>
            <h2 className="module-title">Registrar contrato</h2>
            <p className="module-subtitle">
              Selecciona un usuario y captura la información contractual correspondiente.
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

            {selectedUser && (
              <div className="generated-docs-card">
                <div className="generated-docs-header">
                  <h3>Contrato del usuario seleccionado</h3>
                  <p>
                    Visualiza el PDF contractual generado para este empleado, si ya existe en el expediente.
                  </p>
                </div>

                <div className="generated-docs-list">
                  <div className="generated-doc-item">
                    <div>
                      <strong>
                        {selectedUserLatestContrato
                          ? `Contrato #${selectedUserLatestContrato.id}`
                          : 'Sin contrato registrado'}
                      </strong>
                      <span>
                        {selectedUserLatestContrato
                          ? `${selectedUserLatestContrato.tipo_contrato} · ${selectedUserLatestContrato.estado}`
                          : 'Primero registra un contrato para este usuario.'}
                      </span>
                    </div>

                    {selectedContratoUrl ? (
                      <a
                        className="document-link document-link-button"
                        href={fullUrl(selectedContratoUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver contrato generado
                      </a>
                    ) : (
                      <span className="document-status-empty">Sin PDF generado</span>
                    )}
                  </div>
                </div>
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
            <label>Tipo de contrato</label>
            <select
              value={form.tipo_contrato}
              onChange={(e) => handleChange('tipo_contrato', e.target.value as FormState['tipo_contrato'])}
            >
              <option value="indefinido">indefinido</option>
              <option value="temporal">temporal</option>
              <option value="practicante">practicante</option>
              <option value="honorarios">honorarios</option>
            </select>
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
            <label>Estado</label>
            <select value={form.estado} onChange={(e) => handleChange('estado', e.target.value as FormState['estado'])}>
              <option value="activo">activo</option>
              <option value="inactivo">inactivo</option>
              <option value="finalizado">finalizado</option>
            </select>
          </div>

          <div className="smart-form-group">
            <label>Fecha inicio</label>
            <input type="date" value={form.fecha_inicio} onChange={(e) => handleChange('fecha_inicio', e.target.value)} />
          </div>

          <div className="smart-form-group">
            <label>Fecha fin</label>
            <input type="date" value={form.fecha_fin} onChange={(e) => handleChange('fecha_fin', e.target.value)} />
          </div>

          <div className="smart-form-actions">
            <button className="btn" type="submit" disabled={submitting || !form.usuario_id}>
              {submitting ? 'Guardando...' : 'Registrar contrato'}
            </button>
          </div>
        </form>
      </div>

      {edit.id && (
        <div className="module-card">
          <div className="module-card-header">
            <div>
              <p className="module-eyebrow">Edición</p>
              <h2 className="module-title">Editar contrato #{edit.id}</h2>
              <p className="module-subtitle">Ajusta tipo, salario, fechas y estado del contrato seleccionado.</p>
            </div>
          </div>

          <div className="smart-form-grid">
            <div className="smart-form-group">
              <label>Tipo de contrato</label>
              <select
                value={edit.tipo_contrato}
                onChange={(e) => handleEditChange('tipo_contrato', e.target.value as EditState['tipo_contrato'])}
              >
                <option value="indefinido">indefinido</option>
                <option value="temporal">temporal</option>
                <option value="practicante">practicante</option>
                <option value="honorarios">honorarios</option>
              </select>
            </div>

            <div className="smart-form-group">
              <label>Salario base</label>
              <input type="number" step="0.01" value={edit.salario_base} onChange={(e) => handleEditChange('salario_base', e.target.value)} />
            </div>

            <div className="smart-form-group">
              <label>Estado</label>
              <select value={edit.estado} onChange={(e) => handleEditChange('estado', e.target.value as EditState['estado'])}>
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
                <option value="finalizado">finalizado</option>
              </select>
            </div>

            <div className="smart-form-group">
              <label>Fecha inicio</label>
              <input type="date" value={edit.fecha_inicio} onChange={(e) => handleEditChange('fecha_inicio', e.target.value)} />
            </div>

            <div className="smart-form-group">
              <label>Fecha fin</label>
              <input type="date" value={edit.fecha_fin} onChange={(e) => handleEditChange('fecha_fin', e.target.value)} />
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
            <h2 className="module-title">Listado de contratos</h2>
            <p className="module-subtitle">Consulta los contratos más recientes y opera cambios desde la misma tabla.</p>
          </div>
        </div>

        {loading && <p className="module-info">Cargando contratos...</p>}

        {!loading && items.length === 0 && (
          <div className="empty-state-card">
            <h3>Sin registros</h3>
            <p>No hay contratos registrados por el momento.</p>
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
                    <th>Tipo</th>
                    <th>Salario</th>
                    <th>Vigencia</th>
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
                        <div className="table-main-text">{item.tipo_contrato}</div>
                      </td>

                      <td>
                        <div className="table-main-text">${Number(item.salario_base).toFixed(2)}</div>
                      </td>

                      <td>
                        <div className="table-main-text">
                          {formatDateDisplay(item.fecha_inicio)} →{' '}
                          {item.fecha_fin ? formatDateDisplay(item.fecha_fin) : 'Sin fecha fin'}
                        </div>
                      </td>

                      <td>
                        <span className={`status-pill ${mapEstadoClass(item.estado)}`}>
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
                              : item.estado === 'activo'
                              ? 'Pasar a inactivo'
                              : item.estado === 'inactivo'
                              ? 'Finalizar'
                              : 'Reactivar'}
                          </button>

                          {item.contrato_pdf_url && (
                            <a
                              className="btn btn-small btn-secondary"
                              href={fullUrl(item.contrato_pdf_url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver contrato
                            </a>
                          )}
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

function formatDateInput(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatDateDisplay(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function mapEstadoClass(estado: Contrato['estado']) {
  switch (estado) {
    case 'activo':
      return 'active';
    case 'finalizado':
      return 'inactive';
    default:
      return 'admin';
  }
}