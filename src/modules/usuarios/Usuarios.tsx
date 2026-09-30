import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

type User = {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  role: string;
  rol_id?: number;
  activo: number;
  telefono?: string | null;
  direccion?: string | null;
  fecha_ingreso?: string | null;
  dias_vacaciones_disponibles: number;
};

type Permisos = {
  asistencia: boolean;
  contratos: boolean;
  nomina: boolean;
  vacaciones: boolean;
};

type UserForm = {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  rol_id: string;
  telefono: string;
  direccion: string;
  fecha_ingreso: string;
  dias_vacaciones_disponibles: string;
};

type PermissionFilter =
  | 'todos'
  | 'activos'
  | 'inactivos'
  | 'con_asistencia'
  | 'sin_asistencia'
  | 'con_contratos'
  | 'sin_contratos'
  | 'con_nomina'
  | 'sin_nomina'
  | 'con_vacaciones'
  | 'sin_vacaciones';

type RoleFilter = 'todos' | 'admin' | 'empleado';
type StatusFilter = 'todos' | 'activos' | 'inactivos';
type VacationFilter = 'todos' | 'sin_dias' | 'menos_10' | '10_o_mas';

const DEFAULT_PERMISOS: Permisos = {
  asistencia: false,
  contratos: false,
  nomina: false,
  vacaciones: false,
};

const EMPTY_FORM: UserForm = {
  nombre: '',
  apellido: '',
  correo: '',
  contrasena: '',
  rol_id: '2',
  telefono: '',
  direccion: '',
  fecha_ingreso: '',
  dias_vacaciones_disponibles: '12',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function normalizeDate(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function isAdminUser(user: User) {
  return String(user.role || '').toLowerCase() === 'admin';
}

function isActiveUser(user: User) {
  return Number(user.activo) === 1;
}

function getUserFullName(user: User) {
  return `${user.nombre || ''} ${user.apellido || ''}`.trim();
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getTotalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export default function Usuarios() {
  const { user, token } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [permisosMap, setPermisosMap] = useState<Record<number, Permisos>>({});
  const [vacationDaysMap, setVacationDaysMap] = useState<Record<number, string>>({});
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [showCrud, setShowCrud] = useState(false);
  const [showPermissions, setShowPermissions] = useState(true);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionFilter, setPermissionFilter] = useState<PermissionFilter>('todos');
  const [permissionPage, setPermissionPage] = useState(1);
  const [permissionPageSize, setPermissionPageSize] = useState(10);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [vacationFilter, setVacationFilter] = useState<VacationFilter>('todos');
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);

  const isAdmin = user?.role === 'admin';
  const canLoad = Boolean(token) && isAdmin;
  const isBulkSaving = savingKey.startsWith('bulk-');

  const empleados = useMemo(() => users.filter((u) => !isAdminUser(u)), [users]);

  const activeUsers = useMemo(() => users.filter((u) => isActiveUser(u)).length, [users]);
  const inactiveUsers = useMemo(() => users.filter((u) => !isActiveUser(u)).length, [users]);

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const permissionStats = useMemo(() => {
    const total = empleados.length;
    const activos = empleados.filter((u) => isActiveUser(u)).length;
    const inactivos = total - activos;

    const conAsistencia = empleados.filter((u) => Boolean(permisosMap[u.id]?.asistencia)).length;
    const conContratos = empleados.filter((u) => Boolean(permisosMap[u.id]?.contratos)).length;
    const conNomina = empleados.filter((u) => Boolean(permisosMap[u.id]?.nomina)).length;
    const conVacaciones = empleados.filter((u) => Boolean(permisosMap[u.id]?.vacaciones)).length;

    return {
      total,
      activos,
      inactivos,
      conAsistencia,
      sinAsistencia: total - conAsistencia,
      conContratos,
      sinContratos: total - conContratos,
      conNomina,
      sinNomina: total - conNomina,
      conVacaciones,
      sinVacaciones: total - conVacaciones,
    };
  }, [empleados, permisosMap]);

  const filteredPermisosUsers = useMemo(() => {
    const query = normalizeText(permissionSearch.trim());

    return empleados.filter((u) => {
      const permisos = permisosMap[u.id] ?? DEFAULT_PERMISOS;

      if (permissionFilter === 'activos' && !isActiveUser(u)) return false;
      if (permissionFilter === 'inactivos' && isActiveUser(u)) return false;
      if (permissionFilter === 'con_asistencia' && !permisos.asistencia) return false;
      if (permissionFilter === 'sin_asistencia' && permisos.asistencia) return false;
      if (permissionFilter === 'con_contratos' && !permisos.contratos) return false;
      if (permissionFilter === 'sin_contratos' && permisos.contratos) return false;
      if (permissionFilter === 'con_nomina' && !permisos.nomina) return false;
      if (permissionFilter === 'sin_nomina' && permisos.nomina) return false;
      if (permissionFilter === 'con_vacaciones' && !permisos.vacaciones) return false;
      if (permissionFilter === 'sin_vacaciones' && permisos.vacaciones) return false;

      if (!query) return true;

      const text = normalizeText(`${u.nombre} ${u.apellido} ${u.correo} ${u.role}`);
      return text.includes(query);
    });
  }, [empleados, permisosMap, permissionSearch, permissionFilter]);

  const permissionTotalPages = getTotalPages(filteredPermisosUsers.length, permissionPageSize);
  const paginatedPermisosUsers = paginate(filteredPermisosUsers, permissionPage, permissionPageSize);

  const filteredUsers = useMemo(() => {
    const query = normalizeText(userSearch.trim());

    return users.filter((u) => {
      const role = String(u.role || '').toLowerCase();
      const dias = Number(u.dias_vacaciones_disponibles || 0);

      if (roleFilter !== 'todos' && role !== roleFilter) return false;
      if (statusFilter === 'activos' && !isActiveUser(u)) return false;
      if (statusFilter === 'inactivos' && isActiveUser(u)) return false;
      if (vacationFilter === 'sin_dias' && dias > 0) return false;
      if (vacationFilter === 'menos_10' && !(dias > 0 && dias < 10)) return false;
      if (vacationFilter === '10_o_mas' && dias < 10) return false;

      if (!query) return true;

      const text = normalizeText(
        `${u.id} ${u.nombre} ${u.apellido} ${u.correo} ${u.role} ${u.telefono || ''} ${u.direccion || ''}`
      );

      return text.includes(query);
    });
  }, [users, userSearch, roleFilter, statusFilter, vacationFilter]);

  const usersTotalPages = getTotalPages(filteredUsers.length, usersPageSize);
  const paginatedUsers = paginate(filteredUsers, usersPage, usersPageSize);

  useEffect(() => {
    setPermissionPage(1);
  }, [permissionSearch, permissionFilter, permissionPageSize]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearch, roleFilter, statusFilter, vacationFilter, usersPageSize]);

  async function loadUsers() {
    if (!token) return;

    try {
      setLoadingUsers(true);
      setError('');

      const { data } = await api.get('/users', authConfig);
      const list = Array.isArray(data?.users) ? data.users : [];

      setUsers(list);

      const daysMap: Record<number, string> = {};
      list.forEach((u: User) => {
        daysMap[u.id] = String(u.dias_vacaciones_disponibles ?? 0);
      });

      setVacationDaysMap(daysMap);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudieron cargar los usuarios.');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadPermisos(userId: number) {
    if (!token) return;

    try {
      const { data } = await api.get(`/permisos/${userId}`, authConfig);
      const permisos = data?.permisos ?? {};

      setPermisosMap((prev) => ({
        ...prev,
        [userId]: {
          asistencia: Boolean(permisos.asistencia),
          contratos: Boolean(permisos.contratos),
          nomina: Boolean(permisos.nomina),
          vacaciones: Boolean(permisos.vacaciones),
        },
      }));
    } catch {
      setPermisosMap((prev) => ({
        ...prev,
        [userId]: { ...DEFAULT_PERMISOS },
      }));
    }
  }

  useEffect(() => {
    if (!canLoad) return;
    loadUsers();
  }, [canLoad, token]);

  useEffect(() => {
    if (!canLoad || empleados.length === 0) return;

    const run = async () => {
      setLoadingPermisos(true);
      try {
        await Promise.all(empleados.map((u) => loadPermisos(u.id)));
      } finally {
        setLoadingPermisos(false);
      }
    };

    run();
  }, [canLoad, token, empleados.length]);

  function updateForm(field: keyof UserForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setMessage('');
  }

  function startEdit(u: User) {
    setShowCrud(true);
    setEditingId(u.id);
    setForm({
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      correo: u.correo || '',
      contrasena: '',
      rol_id: String(u.rol_id || (isAdminUser(u) ? 1 : 2)),
      telefono: u.telefono || '',
      direccion: u.direccion || '',
      fecha_ingreso: normalizeDate(u.fecha_ingreso),
      dias_vacaciones_disponibles: String(u.dias_vacaciones_disponibles ?? 12),
    });
    setMessage('');
    setError('');
  }

  async function saveUser() {
    if (!token) return;

    const roleId = Number(form.rol_id);

    const basePayload: any = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      correo: form.correo.trim(),
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      fecha_ingreso: form.fecha_ingreso || null,
      dias_vacaciones_disponibles: Number(form.dias_vacaciones_disponibles || 12),
    };

    if (!basePayload.nombre || !basePayload.apellido || !basePayload.correo || !roleId) {
      setError('Nombre, apellido, correo y rol son obligatorios.');
      return;
    }

    if (!editingId && roleId === 1) {
      try {
        setSavingKey('user-form');
        setError('');
        setMessage('');

        const { data } = await api.post(
          '/auth/admin-invitations',
          basePayload,
          authConfig
        );

        resetForm();
        setMessage(
          data?.message ||
          'Invitación administrativa enviada correctamente.'
        );
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
          'No se pudo enviar la invitación administrativa.'
        );
      } finally {
        setSavingKey('');
      }

      return;
    }

    const payload: any = {
      ...basePayload,
      rol_id: roleId,
    };

    if (!editingId) {
      payload.contrasena = form.contrasena;
    }

    if (!editingId && !payload.contrasena) {
      setError('La contraseña es obligatoria para crear un empleado.');
      return;
    }

    try {
      setSavingKey('user-form');
      setError('');
      setMessage('');

      if (editingId) {
        await api.put(
          `/users/${editingId}`,
          payload,
          authConfig
        );

        resetForm();
        setMessage('Usuario actualizado correctamente.');
      } else {
        await api.post(
          '/users',
          payload,
          authConfig
        );

        resetForm();
        setMessage('Empleado creado correctamente.');
        await loadUsers();
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
        'No se pudo guardar el usuario.'
      );
    } finally {
      setSavingKey('');
    }
  }

  async function onToggle(userId: number, modulo: keyof Permisos) {
    if (!token) return;

    const current = permisosMap[userId] ?? DEFAULT_PERMISOS;
    const next = { ...current, [modulo]: !current[modulo] };

    setPermisosMap((prev) => ({ ...prev, [userId]: next }));

    try {
      setSavingKey(`${userId}-${modulo}`);
      setError('');
      setMessage('');

      await api.put(`/permisos/${userId}`, next, authConfig);
      setMessage('Permisos actualizados correctamente.');
    } catch (e: any) {
      setPermisosMap((prev) => ({ ...prev, [userId]: current }));
      setError(e?.response?.data?.message ?? 'No se pudieron actualizar los permisos.');
    } finally {
      setSavingKey('');
    }
  }

  async function bulkUpdatePermisos(modulos: (keyof Permisos)[], value: boolean) {
    if (!token) return;

    const targetUsers = filteredPermisosUsers;

    if (targetUsers.length === 0) {
      setError('No hay empleados filtrados para aplicar la acción.');
      return;
    }

    const actionText = value ? 'activar' : 'desactivar';
    const confirmed = window.confirm(
      `Se van a ${actionText} ${modulos.length === 4 ? 'todos los módulos' : modulos.join(', ')} para ${targetUsers.length} empleado(s) filtrados. ¿Deseas continuar?`
    );

    if (!confirmed) return;

    const previousMap = { ...permisosMap };
    const updates: Record<number, Permisos> = {};

    targetUsers.forEach((u) => {
      const current = permisosMap[u.id] ?? DEFAULT_PERMISOS;
      const next = { ...current };

      modulos.forEach((modulo) => {
        next[modulo] = value;
      });

      updates[u.id] = next;
    });

    setPermisosMap((prev) => ({
      ...prev,
      ...updates,
    }));

    try {
      setSavingKey(`bulk-${modulos.join('-')}-${value ? 'on' : 'off'}`);
      setError('');
      setMessage('');

      await Promise.all(
        targetUsers.map((u) => api.put(`/permisos/${u.id}`, updates[u.id], authConfig))
      );

      setMessage(`Acción masiva aplicada correctamente a ${targetUsers.length} empleado(s).`);
    } catch (e: any) {
      setPermisosMap(previousMap);
      setError(e?.response?.data?.message ?? 'No se pudo aplicar la acción masiva.');
    } finally {
      setSavingKey('');
    }
  }

  async function saveVacationDays(userId: number) {
    if (!token) return;

    const dias = Number(vacationDaysMap[userId] ?? '0');

    if (Number.isNaN(dias) || dias < 0) {
      setError('Los días de vacaciones deben ser un número mayor o igual a 0.');
      return;
    }

    try {
      setSavingKey(`${userId}-vacation-days`);
      setError('');
      setMessage('');

      await api.patch(`/users/${userId}/vacation-days`, { dias_vacaciones_disponibles: dias }, authConfig);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, dias_vacaciones_disponibles: dias } : u))
      );

      setMessage('Días de vacaciones actualizados correctamente.');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudieron actualizar los días de vacaciones.');
    } finally {
      setSavingKey('');
    }
  }

  async function toggleActive(u: User) {
    if (!token) return;

    try {
      setSavingKey(`${u.id}-active`);
      setError('');
      setMessage('');

      await api.patch(`/users/${u.id}/active`, { activo: !u.activo }, authConfig);

      setUsers((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, activo: u.activo ? 0 : 1 } : item))
      );

      setMessage(u.activo ? 'Usuario desactivado correctamente.' : 'Usuario activado correctamente.');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo actualizar el estado del usuario.');
    } finally {
      setSavingKey('');
    }
  }

  async function deleteUser(userId: number) {
    if (!token) return;

    const confirmed = window.confirm('¿Deseas desactivar este usuario?');
    if (!confirmed) return;

    try {
      setSavingKey(`${userId}-delete`);
      setError('');
      setMessage('');

      await api.delete(`/users/${userId}`, authConfig);

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, activo: 0 } : u)));
      setMessage('Usuario desactivado correctamente.');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo desactivar el usuario.');
    } finally {
      setSavingKey('');
    }
  }

  if (!isAdmin) {
    return (
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Administración</p>
            <h2 className="module-title">Usuarios</h2>
          </div>
        </div>

        <div className="empty-state-card">
          <h3>Acceso restringido</h3>
          <p>No tienes permisos para administrar accesos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Administración</p>
            <h2 className="module-title">Usuarios, permisos y vacaciones</h2>
            <p className="module-subtitle">
              Administra empleados, permisos por módulo y datos laborales del personal.
            </p>
          </div>

          <button className="btn" type="button" onClick={() => setShowCrud((prev) => !prev)}>
            {showCrud ? 'Ocultar CRUD usuarios' : 'Mostrar CRUD usuarios'}
          </button>
        </div>

        <div className="asistencia-summary-grid">
          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Total usuarios</h3>
            <p>{users.length} registros en el sistema.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />
            <h3>Activos</h3>
            <p>{activeUsers} usuarios habilitados.</p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />
            <h3>Inactivos</h3>
            <p>{inactiveUsers} usuarios desactivados.</p>
          </div>
        </div>
      </div>

      {(loadingUsers || loadingPermisos) && <p className="module-info">Cargando información...</p>}
      {message && <p className="module-info">{message}</p>}
      {error && <p className="module-error">{error}</p>}

      <div className="module-card users-permissions-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">Control de accesos</p>
            <h2 className="module-title">Permisos por módulo</h2>
            <p className="module-subtitle">
              Activa o desactiva módulos para empleados. Los administradores no aparecen en esta sección.
            </p>
          </div>

          <button className="btn btn-secondary" type="button" onClick={() => setShowPermissions((prev) => !prev)}>
            {showPermissions ? 'Ocultar permisos' : 'Mostrar permisos'}
          </button>
        </div>

        {showPermissions && (
          <>
            <div className="users-filter-panel">
              <div className="users-filter-grid">
                <label className="users-filter-control">
                  <span>Buscar empleado</span>
                  <input
                    type="search"
                    value={permissionSearch}
                    placeholder="Nombre, correo o rol..."
                    onChange={(e) => setPermissionSearch(e.target.value)}
                  />
                </label>

                <label className="users-filter-control">
                  <span>Filtro de permisos</span>
                  <select value={permissionFilter} onChange={(e) => setPermissionFilter(e.target.value as PermissionFilter)}>
                    <option value="todos">Todos los empleados</option>
                    <option value="activos">Solo activos</option>
                    <option value="inactivos">Solo inactivos</option>
                    <option value="con_asistencia">Con asistencia</option>
                    <option value="sin_asistencia">Sin asistencia</option>
                    <option value="con_contratos">Con contratos</option>
                    <option value="sin_contratos">Sin contratos</option>
                    <option value="con_nomina">Con nómina</option>
                    <option value="sin_nomina">Sin nómina</option>
                    <option value="con_vacaciones">Con vacaciones</option>
                    <option value="sin_vacaciones">Sin vacaciones</option>
                  </select>
                </label>

                <label className="users-filter-control">
                  <span>Filas por página</span>
                  <select value={permissionPageSize} onChange={(e) => setPermissionPageSize(Number(e.target.value))}>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} empleados
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="users-filter-summary">
                <span>{filteredPermisosUsers.length} empleado(s) encontrados</span>
                <span>Mostrando página {permissionPage} de {permissionTotalPages}</span>
              </div>
            </div>

            <div className="bulk-permissions-panel">
              <div className="bulk-permissions-header">
                <div>
                  <h3>Acciones generales por módulo</h3>
                  <p>Aplica cambios a todos los empleados que coincidan con los filtros actuales.</p>
                </div>
              </div>

              <div className="bulk-permissions-grid">
                <button className="bulk-action-btn" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['asistencia'], true)}>
                  Activar asistencia
                </button>
                <button className="bulk-action-btn danger" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['asistencia'], false)}>
                  Desactivar asistencia
                </button>

                <button className="bulk-action-btn" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['contratos'], true)}>
                  Activar contratos
                </button>
                <button className="bulk-action-btn danger" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['contratos'], false)}>
                  Desactivar contratos
                </button>

                <button className="bulk-action-btn" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['nomina'], true)}>
                  Activar nómina
                </button>
                <button className="bulk-action-btn danger" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['nomina'], false)}>
                  Desactivar nómina
                </button>

                <button className="bulk-action-btn" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['vacaciones'], true)}>
                  Activar vacaciones
                </button>
                <button className="bulk-action-btn danger" disabled={isBulkSaving} onClick={() => bulkUpdatePermisos(['vacaciones'], false)}>
                  Desactivar vacaciones
                </button>

                <button
                  className="bulk-action-btn all"
                  disabled={isBulkSaving}
                  onClick={() => bulkUpdatePermisos(['asistencia', 'contratos', 'nomina', 'vacaciones'], true)}
                >
                  Activar todos los módulos
                </button>

                <button
                  className="bulk-action-btn danger all"
                  disabled={isBulkSaving}
                  onClick={() => bulkUpdatePermisos(['asistencia', 'contratos', 'nomina', 'vacaciones'], false)}
                >
                  Desactivar todos los módulos
                </button>
              </div>
            </div>

            {empleados.length > 0 ? (
              <>
                <div className="table-wrapper">
                  <table className="smart-table">
                    <thead>
                      <tr>
                        <th>Empleado</th>
                        <th>Asistencia</th>
                        <th>Contratos</th>
                        <th>Nómina</th>
                        <th>Vacaciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedPermisosUsers.map((u) => {
                        const permisos = permisosMap[u.id] ?? DEFAULT_PERMISOS;

                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="table-main-text">
                                {u.nombre} {u.apellido}
                              </div>
                              <div className="table-secondary-text">{u.correo}</div>
                            </td>

                            {(['asistencia', 'contratos', 'nomina', 'vacaciones'] as (keyof Permisos)[]).map((modulo) => (
                              <td key={modulo}>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={permisos[modulo]}
                                    disabled={savingKey === `${u.id}-${modulo}` || isBulkSaving}
                                    onChange={() => onToggle(u.id, modulo)}
                                  />
                                  <span className="slider" />
                                </label>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="users-pagination">
                  <button
                    className="btn btn-small btn-secondary"
                    type="button"
                    disabled={permissionPage <= 1}
                    onClick={() => setPermissionPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </button>

                  <span>
                    Página {permissionPage} de {permissionTotalPages}
                  </span>

                  <button
                    className="btn btn-small btn-secondary"
                    type="button"
                    disabled={permissionPage >= permissionTotalPages}
                    onClick={() => setPermissionPage((prev) => Math.min(permissionTotalPages, prev + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state-card">
                <h3>Sin empleados</h3>
                <p>No hay usuarios empleados para administrar permisos.</p>
              </div>
            )}
          </>
        )}
      </div>

      {showCrud && (
        <>
          <div className="document-panel">
            <h3>{editingId ? 'Editar usuario' : 'Crear nuevo usuario'}</h3>

            <div className="form-grid">
              <label className="form-label">
                Nombre
                <input value={form.nombre} onChange={(e) => updateForm('nombre', e.target.value)} />
              </label>

              <label className="form-label">
                Apellido
                <input value={form.apellido} onChange={(e) => updateForm('apellido', e.target.value)} />
              </label>

              <label className="form-label">
                Correo
                <input type="email" value={form.correo} onChange={(e) => updateForm('correo', e.target.value)} />
              </label>

              {!editingId && form.rol_id !== '1' && (
                <label className="form-label">
                  Contraseña
                  <input
                    type="password"
                    value={form.contrasena}
                    onChange={(e) => updateForm('contrasena', e.target.value)}
                  />
                </label>
              )}

              <label className="form-label">
                Rol
                <select value={form.rol_id} onChange={(e) => updateForm('rol_id', e.target.value)}>
                  <option
                    value="1"
                    disabled={
                      Boolean(editingId) &&
                      !users.some(
                        (candidate) =>
                          candidate.id === editingId &&
                          isAdminUser(candidate)
                      )
                    }
                  >
                    Administrador
                  </option>
                  <option value="2">Empleado</option>
                </select>
              </label>

              {!editingId && form.rol_id === '1' && (
                <p className="module-info">
                  El administrador recibirá una invitación por correo y
                  establecerá personalmente su contraseña.
                </p>
              )}

              <label className="form-label">
                Teléfono
                <input value={form.telefono} onChange={(e) => updateForm('telefono', e.target.value)} />
              </label>

              <label className="form-label">
                Dirección
                <input value={form.direccion} onChange={(e) => updateForm('direccion', e.target.value)} />
              </label>

              <label className="form-label">
                Fecha de ingreso
                <input
                  type="date"
                  value={form.fecha_ingreso}
                  onChange={(e) => updateForm('fecha_ingreso', e.target.value)}
                />
              </label>

              <label className="form-label">
                Días de vacaciones
                <input
                  type="number"
                  min={0}
                  value={form.dias_vacaciones_disponibles}
                  onChange={(e) => updateForm('dias_vacaciones_disponibles', e.target.value)}
                />
              </label>
            </div>

            <div className="users-form-actions">
              <button className="btn" type="button" disabled={savingKey === 'user-form'} onClick={saveUser}>
                {
                  savingKey === 'user-form'
                    ? 'Guardando...'
                    : editingId
                      ? 'Actualizar usuario'
                      : form.rol_id === '1'
                        ? 'Enviar invitación'
                        : 'Crear empleado'
                }
              </button>

              {editingId && (
                <button className="btn btn-secondary" type="button" onClick={resetForm}>
                  Cancelar edición
                </button>
              )}
            </div>
          </div>

          <div className="module-card users-crud-card">
            <div className="module-card-header">
              <div>
                <p className="module-eyebrow">Gestión de usuarios</p>
                <h2 className="module-title">Listado general</h2>
                <p className="module-subtitle">
                  Filtra usuarios por nombre, rol, estado y días de vacaciones.
                </p>
              </div>
            </div>

            <div className="users-filter-panel">
              <div className="users-filter-grid users-filter-grid-large">
                <label className="users-filter-control">
                  <span>Buscar usuario</span>
                  <input
                    type="search"
                    value={userSearch}
                    placeholder="ID, nombre, correo, teléfono o dirección..."
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </label>

                <label className="users-filter-control">
                  <span>Rol</span>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}>
                    <option value="todos">Todos</option>
                    <option value="admin">Administradores</option>
                    <option value="empleado">Empleados</option>
                  </select>
                </label>

                <label className="users-filter-control">
                  <span>Estado</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                    <option value="todos">Todos</option>
                    <option value="activos">Activos</option>
                    <option value="inactivos">Inactivos</option>
                  </select>
                </label>

                <label className="users-filter-control">
                  <span>Vacaciones</span>
                  <select value={vacationFilter} onChange={(e) => setVacationFilter(e.target.value as VacationFilter)}>
                    <option value="todos">Todos</option>
                    <option value="sin_dias">Sin días disponibles</option>
                    <option value="menos_10">Menos de 10 días</option>
                    <option value="10_o_mas">10 días o más</option>
                  </select>
                </label>

                <label className="users-filter-control">
                  <span>Filas por página</span>
                  <select value={usersPageSize} onChange={(e) => setUsersPageSize(Number(e.target.value))}>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} usuarios
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="users-filter-summary">
                <span>{filteredUsers.length} usuario(s) encontrados</span>
                <span>Mostrando página {usersPage} de {usersTotalPages}</span>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Contacto</th>
                    <th>Rol</th>
                    <th>Activo</th>
                    <th>Días vacaciones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>

                      <td>
                        <div className="table-main-text">
                          {u.nombre} {u.apellido}
                        </div>
                        <div className="table-secondary-text">{u.correo}</div>
                        <div className="table-secondary-text">
                          Ingreso: {normalizeDate(u.fecha_ingreso) || 'No registrado'}
                        </div>
                      </td>

                      <td>
                        <div className="table-secondary-text">Tel: {u.telefono || 'No registrado'}</div>
                        <div className="table-secondary-text">Dir: {u.direccion || 'No registrada'}</div>
                      </td>

                      <td>
                        <span className={`role-pill ${isAdminUser(u) ? 'admin' : 'empleado'}`}>
                          {u.role}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`status-pill ${u.activo ? 'active' : 'inactive'}`}
                          disabled={savingKey === `${u.id}-active`}
                          onClick={() => toggleActive(u)}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      <td>
                        <div className="users-vacation-control">
                          <input
                            type="number"
                            min={0}
                            value={vacationDaysMap[u.id] ?? '0'}
                            onChange={(e) =>
                              setVacationDaysMap((prev) => ({
                                ...prev,
                                [u.id]: e.target.value,
                              }))
                            }
                          />

                          <button
                            type="button"
                            className="btn btn-small"
                            disabled={savingKey === `${u.id}-vacation-days`}
                            onClick={() => saveVacationDays(u.id)}
                          >
                            Guardar
                          </button>
                        </div>
                      </td>

                      <td>
                        <div className="users-row-actions">
                          <button type="button" className="btn btn-small" onClick={() => startEdit(u)}>
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-secondary"
                            disabled={savingKey === `${u.id}-delete`}
                            onClick={() => deleteUser(u.id)}
                          >
                            Desactivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state-card">
                          <h3>Sin resultados</h3>
                          <p>No hay usuarios que coincidan con los filtros actuales.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="users-pagination">
              <button
                className="btn btn-small btn-secondary"
                type="button"
                disabled={usersPage <= 1}
                onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </button>

              <span>
                Página {usersPage} de {usersTotalPages}
              </span>

              <button
                className="btn btn-small btn-secondary"
                type="button"
                disabled={usersPage >= usersTotalPages}
                onClick={() => setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}