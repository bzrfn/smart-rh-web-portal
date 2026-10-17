import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';

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

type ContractOption = {
  id: number;
  usuario_id: number;
  salario_base: number;
  estado: 'activo' | 'inactivo' | 'finalizado';
  fecha_inicio: string;
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

type PayrollFilter = 'todos' | Nomina['estado'];

const PAGE_SIZE = 5;

export default function Nomina() {
  const [items, setItems] = useState<Nomina[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserResults, setShowUserResults] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [changingEstadoId, setChangingEstadoId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<PayrollFilter>('todos');

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

  const filteredItems = useMemo(() => {
    if (activeFilter === 'todos') return items;
    return items.filter((item) => item.estado === activeFilter);
  }, [activeFilter, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

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

  const selectedContract = useMemo(() => {
    return contracts
      .filter((contract) => String(contract.usuario_id) === form.usuario_id)
      .sort((a, b) => {
        if (a.estado === 'activo' && b.estado !== 'activo') return -1;
        if (b.estado === 'activo' && a.estado !== 'activo') return 1;
        return new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime();
      })[0] || null;
  }, [contracts, form.usuario_id]);

  const estimatedTotal = Math.max(0, Number(form.salario_base || 0) + Number(form.bonos || 0) - Number(form.deducciones || 0));

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

  const loadContracts = useCallback(async () => {
    try {
      const { data } = await api.get('/contratos');
      setContracts(Array.isArray(data?.contratos) ? data.contratos : []);
    } catch {
      setContracts([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadUsers();
    loadContracts();
  }, [load, loadUsers, loadContracts]);

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
    const contract = contracts
      .filter((item) => item.usuario_id === user.id)
      .sort((a, b) => {
        if (a.estado === 'activo' && b.estado !== 'activo') return -1;
        if (b.estado === 'activo' && a.estado !== 'activo') return 1;
        return new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime();
      })[0];
    setForm((prev) => ({ ...prev, usuario_id: String(user.id), salario_base: contract ? String(contract.salario_base) : '' }));
    setUserSearch(`${user.nombre} ${user.apellido} - ${user.correo}`);
    setShowUserResults(false);
  };

  const clearSelectedUser = () => {
    setForm((prev) => ({ ...prev, usuario_id: '', salario_base: '' }));
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
    <div className="dashboard-page record-page payroll-page">
      <div className="module-card record-overview">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Expediente laboral</p>
            <h2 className="module-title">Nómina</h2>
            <p className="module-subtitle">
              Revisa periodos, confirma pagos y conserva el historial económico del personal en orden.
            </p>
          </div>
        </div>

        <div className="module-hero-banner record-brief">
          <div className="module-hero-copy">
            <h3>Pagos organizados por persona y periodo</h3>
            <p>
              Identifica pendientes, valida importes y actualiza el estado de cada pago desde un mismo flujo.
            </p>
          </div>

          <div className="module-hero-badge">{summary.pendientes} pendientes</div>
        </div>

        <div className="asistencia-summary-grid operation-summary-grid record-summary-grid">
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
            <p>{formatCurrency(summary.totalNominas)}</p>
          </div>
        </div>
      </div>

      <div className="module-card record-form-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Nuevo periodo</p>
            <h2 className="module-title">Registrar nómina</h2>
            <p className="module-subtitle">
              Elige a la persona, registra los importes y define el periodo que estás procesando.
            </p>
          </div>
        </div>

        {error && <p className="module-error">{error}</p>}

        <form className="record-workflow-form payroll-workflow-form" onSubmit={onSubmit}>
          <section className="record-form-section record-person-section">
            <div className="record-form-section-heading"><span>01</span><div><strong>Persona y contrato</strong><small>El salario se toma del contrato más reciente para evitar capturarlo dos veces.</small></div></div>
          <div className="smart-form-group smart-form-group-full">
            <label>Buscar usuario</label>

            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setShowUserResults(true);
                if (form.usuario_id) {
                  setForm((prev) => ({ ...prev, usuario_id: '', salario_base: '' }));
                }
              }}
              onFocus={() => setShowUserResults(true)}
              placeholder={loadingUsers ? 'Cargando usuarios...' : 'Escribe nombre o correo'}
            />

            {selectedUser && (
              <div className="selected-user-chip">
                <span><strong>{selectedUser.nombre} {selectedUser.apellido}</strong>{selectedUser.correo}</span>
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

          {selectedUser && (
            <div className={`contract-salary-source ${selectedContract ? 'available' : 'missing'}`}>
              <div><span>Salario contractual</span><strong>{selectedContract ? formatCurrency(selectedContract.salario_base) : 'Sin contrato disponible'}</strong></div>
              <p>{selectedContract ? 'Este importe se aplicará automáticamente a la nómina.' : 'Registra primero el contrato o captura una base sólo para este periodo.'}</p>
            </div>
          )}
          </section>

          <section className="record-form-section record-terms-section">
            <div className="record-form-section-heading"><span>02</span><div><strong>Ajustes del periodo</strong><small>Completa bonos, deducciones, fechas y estado del pago.</small></div></div>
            <div className="smart-form-grid record-form-grid">

          <div className="smart-form-group">
            <label>Salario base</label>
            <CurrencyInput
              value={form.salario_base}
              onChange={(value) => handleChange('salario_base', value)}
              placeholder="12,000.00"
              readOnly={Boolean(selectedContract)}
              ariaLabel="Salario base contractual"
            />
          </div>

          <div className="smart-form-group">
            <label>Deducciones</label>
            <CurrencyInput
              value={form.deducciones}
              onChange={(value) => handleChange('deducciones', value)}
              ariaLabel="Deducciones en pesos mexicanos"
            />
          </div>

          <div className="smart-form-group">
            <label>Bonos</label>
            <CurrencyInput
              value={form.bonos}
              onChange={(value) => handleChange('bonos', value)}
              ariaLabel="Bonos en pesos mexicanos"
            />
          </div>

          <div className="smart-form-group">
            <label>Estado</label>
            <select
              value={form.estado}
              onChange={(e) => handleChange('estado', e.target.value as 'pendiente' | 'pagado')}
            >
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
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
            </div>
          </section>

          <aside className="record-live-summary payroll-live-summary">
            <div><span>Base contractual</span><strong>{form.salario_base ? formatCurrency(Number(form.salario_base)) : 'Por definir'}</strong></div>
            <div><span>Bonos</span><strong>+ {formatCurrency(Number(form.bonos || 0))}</strong></div>
            <div><span>Deducciones</span><strong>- {formatCurrency(Number(form.deducciones || 0))}</strong></div>
            <div className="record-live-total"><span>Total estimado</span><strong>{formatCurrency(estimatedTotal)}</strong></div>
          </aside>
        </form>
      </div>

      {edit.id && (
        <div className="module-card record-edit-card">
          <div className="module-card-header">
            <div>
              <p className="module-eyebrow">Edición</p>
              <h2 className="module-title">Editar nómina seleccionada</h2>
              <p className="module-subtitle">
                Ajusta importes, estado y periodo para corregir el registro seleccionado.
              </p>
            </div>
          </div>

          <div className="smart-form-grid">
            <div className="smart-form-group">
              <label>Salario base</label>
              <CurrencyInput
                value={edit.salario_base}
                onChange={(value) => handleEditChange('salario_base', value)}
                ariaLabel="Editar salario base de nómina"
              />
            </div>

            <div className="smart-form-group">
              <label>Deducciones</label>
              <CurrencyInput
                value={edit.deducciones}
                onChange={(value) => handleEditChange('deducciones', value)}
                ariaLabel="Editar deducciones"
              />
            </div>

            <div className="smart-form-group">
              <label>Bonos</label>
              <CurrencyInput
                value={edit.bonos}
                onChange={(value) => handleEditChange('bonos', value)}
                ariaLabel="Editar bonos"
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

      <div className="module-card record-history-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Historial</p>
            <h2 className="module-title">Historial de nómina</h2>
            <p className="module-subtitle">
              Filtra pagos pendientes o completados y revisa el desglose sin perder el contexto del empleado.
            </p>
          </div>
        </div>

        <div className="operation-filter-tabs record-filter-tabs" aria-label="Filtrar nómina por estado">
          {([
            ['todos', 'Todas', summary.total],
            ['pendiente', 'Pendientes', summary.pendientes],
            ['pagado', 'Pagadas', summary.pagadas],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={activeFilter === key ? 'active' : ''}
              onClick={() => setActiveFilter(key)}
            >
              {label}<span>{count}</span>
            </button>
          ))}
        </div>

        {loading && <p className="module-info">Cargando nóminas...</p>}

        {!loading && filteredItems.length === 0 && (
          <div className="empty-state-card">
            <h3>Sin registros</h3>
            <p>No hay nóminas registradas por el momento.</p>
          </div>
        )}

        {filteredItems.length > 0 && (
          <>
            <div className="table-wrapper operation-table-wrapper record-table-wrapper">
              <table className="smart-table operation-table record-table">
                <thead>
                  <tr>
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
                      <td data-label="Empleado" className="operation-person-cell">
                        <div className="operation-person">
                          <span className="operation-person-avatar">{getInitials(item.nombre, item.apellido)}</span>
                          <div>
                            <div className="table-main-text">{item.nombre} {item.apellido}</div>
                            <div className="table-secondary-text">{item.correo}</div>
                          </div>
                        </div>
                      </td>

                      <td data-label="Periodo">
                        <div className="record-date-range">
                          {formatDateDisplay(item.periodo_inicio)} → {formatDateDisplay(item.periodo_fin)}
                        </div>
                      </td>

                      <td data-label="Importes">
                        <div className="payroll-total">{formatCurrency(item.total)}</div>
                        <div className="payroll-breakdown">
                          <span>Base <strong>{formatCurrency(item.salario_base)}</strong></span>
                          <span>Bonos <strong>+{formatCurrency(item.bonos)}</strong></span>
                          <span>Deducciones <strong>-{formatCurrency(item.deducciones)}</strong></span>
                        </div>
                      </td>

                      <td data-label="Estado">
                        <span className={`status-pill ${item.estado === 'pagado' ? 'active' : 'admin'}`}>
                          {item.estado}
                        </span>
                      </td>

                      <td data-label="Acciones">
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

function getInitials(nombre: string, apellido: string) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase() || 'RH';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
}
