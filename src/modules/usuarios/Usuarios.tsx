import { feedback, assertSaved, mutationError } from '../../services/feedback';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';
import SmartRhModal from '../../components/SmartRhModal';

type User = {
  invitation?: PendingInvitation;
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

type PendingInvitation = {
  existingUserId?: number; invitation_id: string; invite_email: string; nombre: string; apellido: string;
  account_type: 'admin' | 'empleado' | null; telefono: string | null; direccion: string | null;
  fecha_ingreso: string | null; dias_vacaciones_disponibles: number;
  created_at: string; expires_at: string; delivery_failed_at: string | null;
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
  rol_id: string;
  telefono: string;
  direccion: string;
  fecha_ingreso: string;
  dias_vacaciones_disponibles: string;
};

type PermissionFilter = 'todos' | 'activos' | 'inactivos';

type RoleFilter = 'todos' | 'admin' | 'empleado';
type StatusFilter = 'todos' | 'activos' | 'inactivos' | 'pendientes';
type VacationFilter = 'todos' | 'sin_dias' | 'menos_10' | '10_o_mas';
type BulkPermissionTarget = keyof Permisos | 'todos';

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
  rol_id: '2',
  telefono: '',
  direccion: '',
  fecha_ingreso: '',
  dias_vacaciones_disponibles: '12',
};

const PAGE_SIZE_OPTIONS = [5, 10, 25];

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
  return `${user.nombre || ''} ${user.apellido || ''}`.trim() || (user.invitation ? 'Pendiente de completar perfil' : user.correo);
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getTotalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export default function Usuarios() {
  function setMessage(message: string) { setMessageState(message); if (message) feedback.success(message); }

  function setError(message: string) { setErrorState(message); if (message) feedback.error(message); }

  const { user, token } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [resending, setResending] = useState<PendingInvitation | null>(null);
  const [resendRole, setResendRole] = useState('');
  const [resendError, setResendError] = useState('');
  const [editingInvitation, setEditingInvitation] = useState<PendingInvitation | null>(null);
  const [invitationEmail, setInvitationEmail] = useState('');
  const [invitationRole, setInvitationRole] = useState('');
  const [invitationEditError, setInvitationEditError] = useState('');
  const [cancelingInvitation, setCancelingInvitation] = useState<PendingInvitation | null>(null);
  const [invitationCancelError, setInvitationCancelError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const directoryUsers = useMemo<User[]>(() => [...users, ...invitations.filter(invite => !users.some(account => account.correo.toLowerCase() === invite.invite_email.toLowerCase())).map((invite, index) => ({
    id: -index - 1, nombre: invite.nombre, apellido: invite.apellido, correo: invite.invite_email,
    role: invite.account_type || 'Por confirmar', activo: 0, telefono: invite.telefono, direccion: invite.direccion,
    fecha_ingreso: invite.fecha_ingreso, dias_vacaciones_disponibles: invite.dias_vacaciones_disponibles, invitation: invite,
  }))], [users, invitations]);
  const [permisosMap, setPermisosMap] = useState<Record<number, Permisos>>({});
  const [vacationDaysMap, setVacationDaysMap] = useState<Record<number, string>>({});
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [showCrud, setShowCrud] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(true);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setErrorState] = useState('');
  const [message, setMessageState] = useState('');

  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionFilter, setPermissionFilter] = useState<PermissionFilter>('todos');
  const [bulkPermissionTarget, setBulkPermissionTarget] = useState<BulkPermissionTarget>('asistencia');

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [vacationFilter, setVacationFilter] = useState<VacationFilter>('todos');
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(5);

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
      if (permissionFilter === 'activos' && !isActiveUser(u)) return false;
      if (permissionFilter === 'inactivos' && isActiveUser(u)) return false;
      if (!query) return true;

      const text = normalizeText(`${u.nombre} ${u.apellido} ${u.correo} ${u.role}`);
      return text.includes(query);
    });
  }, [empleados, permissionSearch, permissionFilter]);

  const hasPermissionQuery = permissionSearch.trim().length >= 2;
  const visiblePermisosUsers = useMemo(
    () => (hasPermissionQuery ? filteredPermisosUsers.slice(0, 5) : []),
    [filteredPermisosUsers, hasPermissionQuery]
  );

  const filteredUsers = useMemo(() => {
    const query = normalizeText(userSearch.trim());

    return directoryUsers.filter((u) => {
      const role = String(u.role || '').toLowerCase();
      const dias = Number(u.dias_vacaciones_disponibles || 0);

      if (roleFilter !== 'todos' && role !== roleFilter) return false;
      if (statusFilter === 'pendientes' && !u.invitation) return false;
      if (statusFilter === 'inactivos' && u.invitation) return false;
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
  }, [directoryUsers, userSearch, roleFilter, statusFilter, vacationFilter]);

  const usersTotalPages = getTotalPages(filteredUsers.length, usersPageSize);
  const paginatedUsers = paginate(filteredUsers, usersPage, usersPageSize);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearch, roleFilter, statusFilter, vacationFilter, usersPageSize]);

  async function loadUsers() {
    if (!token) return;

    try {
      setLoadingUsers(true);
      setError('');

      const [{ data }, pending] = await Promise.all([api.get('/users', authConfig), api.get('/auth/invitations', authConfig)]);
      setInvitations(Array.isArray(pending.data?.invitations) ? pending.data.invitations : []);
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
    setShowUserForm(true);
    setEditingId(u.id);
    setForm({
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      correo: u.correo || '',
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
    if (!token || savingKey === 'user-form') return;

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

    if (!basePayload.correo || !roleId || (editingId && (!basePayload.nombre || !basePayload.apellido))) {
      setError(editingId ? 'Nombre, apellido, correo y rol son obligatorios.' : 'Correo y rol son obligatorios.');
      return;
    }

    if (!editingId && !form.fecha_ingreso) { setError('Indica la fecha de ingreso.'); return; }

    if (!editingId) {
      try {
        setSavingKey('user-form');
        setError('');
        setMessage('');

        const { data } = await api.post(
          '/auth/invitations',
          {
            correo: basePayload.correo,
            fecha_ingreso: form.fecha_ingreso,
            tipo_cuenta: roleId === 1 ? 'admin' : 'empleado',
          },
          { ...authConfig, timeout: 45000 }
        );
        assertSaved(data, 'No se pudo confirmar el envío de la invitación.');

        resetForm();
        setShowUserForm(false);
        const sent = data?.message || 'Invitación enviada correctamente.';
        setMessage(sent); feedback.success(sent);
        void loadUsers();
      } catch (e: any) {
        const detail = mutationError(e, 'No se pudo confirmar el envío de la invitación.');
        setError(detail); feedback.error(detail);
      } finally {
        setSavingKey('');
      }

      return;
    }

    const payload: any = {
      ...basePayload,
      rol_id: roleId,
    };

    try {
      setSavingKey('user-form');
      setError('');
      setMessage('');

      if (editingId) {
        const { data } = await api.put(
          `/users/${editingId}`,
          payload,
          authConfig
        );

        assertSaved(data, 'No se pudo confirmar la actualización.');
        resetForm();
        setShowUserForm(false);
        setMessage('Usuario actualizado correctamente.');
        feedback.success('Usuario actualizado correctamente.');
        void loadUsers();
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
        'No se pudo guardar el usuario.'
      );
      feedback.error(mutationError(e, 'No se pudo guardar el usuario.'));
    } finally {
      setSavingKey('');
    }
  }

  function startResend(invitation: PendingInvitation) {
    setResending(invitation); setResendRole(invitation.account_type || ''); setResendError('');
  }
  function startExistingResend(account: User) {
    if (!account.activo) return;
    setResending({ existingUserId: account.id, invitation_id: `user-${account.id}`, invite_email: account.correo,
      nombre: account.nombre, apellido: account.apellido, account_type: isAdminUser(account) ? 'admin' : 'empleado',
      telefono: account.telefono || null, direccion: account.direccion || null, fecha_ingreso: account.fecha_ingreso || null,
      dias_vacaciones_disponibles: account.dias_vacaciones_disponibles, created_at: '2000-01-01T00:00:00Z', expires_at: '', delivery_failed_at: null });
    setResendRole(isAdminUser(account) ? 'admin' : 'empleado'); setResendError('');
  }
  async function resendInvitation() {
    if (!resending || savingKey.startsWith('resend-')) return;
    if (!resendRole) { setResendError('Selecciona el rol de la cuenta antes de reenviar.'); return; }
    const target = resending;
    try {
      setSavingKey(`resend-${target.invitation_id}`); setResendError('');
      const { data } = await api.post(target.existingUserId ? `/auth/invitations/users/${target.existingUserId}/resend` : `/auth/invitations/${target.invitation_id}/resend`, { tipo_cuenta: resendRole }, { ...authConfig, timeout: 45000 });
      assertSaved(data, 'No se pudo confirmar el reenvío.');
      setResending(null);
      feedback.success(`Invitación reenviada a ${target.invite_email}. El nuevo enlace vence en ${data.expiresInMinutes || 30} minutos.`);
      void loadUsers();
    } catch (error: any) {
      const detail = mutationError(error, 'No se pudo reenviar la invitación.'); setResendError(detail); feedback.error(detail);
      try {
        const pending = await api.get('/auth/invitations', authConfig);
        const list: PendingInvitation[] = pending.data?.invitations || [];
        setInvitations(list);
        const replacement = list.find(item => item.invite_email === target.invite_email);
        if (replacement && !target.existingUserId) setResending(replacement);
      } catch { /* Keep the selected person's details until the operator closes the form. */ }
    } finally { setSavingKey(''); }
  }

  function startInvitationEdit(invitation: PendingInvitation) {
    setEditingInvitation(invitation); setInvitationEmail(invitation.invite_email);
    setInvitationRole(invitation.account_type || ''); setInvitationEditError('');
  }
  async function saveInvitationEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingInvitation || savingKey) return;
    const target=editingInvitation, correo=invitationEmail.trim().toLowerCase();
    if (correo===target.invite_email.toLowerCase()) { setInvitationEditError('Escribe el correo corregido o utiliza Reenviar invitación.'); return; }
    if (!invitationRole) { setInvitationEditError('Confirma el rol de esta invitación.'); return; }
    setSavingKey('invitation-email');setInvitationEditError('');
    try {
      const {data}=await api.post(`/auth/invitations/${target.invitation_id}/correct-email`,{correo,tipo_cuenta:invitationRole},{...authConfig,timeout:45000});
      assertSaved(data,'No se pudo confirmar la corrección del correo.');
      setEditingInvitation(null);feedback.success(`Correo corregido. Invitación enviada a ${correo}; el enlace anterior quedó invalidado.`);void loadUsers();
    } catch(error: any) {
      const detail=mutationError(error,'No se pudo confirmar la corrección del correo.');setInvitationEditError(detail);feedback.error(detail);
      try {
        const {data}=await api.get('/auth/invitations',authConfig);
        const list: PendingInvitation[]=data?.invitations||[];setInvitations(list);
        const replacement=list.find(item=>item.invite_email.toLowerCase()===correo&&item.invitation_id!==target.invitation_id);
        if (error?.response?.status===502 && error?.response?.data?.message==='No fue posible enviar la invitación por correo' && replacement && !list.some(item=>item.invitation_id===target.invitation_id)) {
          setEditingInvitation(null);startResend(replacement);
          setResendError(`El correo corregido está guardado, pero no se confirmó el envío. Revisa ${correo} y utiliza Reenviar invitación cuando esté disponible.`);
        }
      } catch { /* Keep the selected email and the error until the operator can retry. */ }
    } finally { setSavingKey(''); }
  }
  async function cancelInvitation() {
    if (!cancelingInvitation || savingKey) return;
    const target=cancelingInvitation;setSavingKey('invitation-cancel');setInvitationCancelError('');
    try {
      const {data}=await api.post(`/auth/invitations/${target.invitation_id}/cancel`,{},authConfig);
      assertSaved(data,'No se pudo confirmar la cancelación.');
      setCancelingInvitation(null);setInvitations(items=>items.filter(item=>item.invite_email.toLowerCase()!==target.invite_email.toLowerCase()));
      feedback.success(`Invitación cancelada para ${target.invite_email}. Su enlace quedó invalidado.`);void loadUsers();
    } catch(error) {
      const detail=mutationError(error,'No se pudo confirmar la cancelación.');setInvitationCancelError(detail);feedback.error(detail);void loadUsers();
    } finally { setSavingKey(''); }
  }

  async function onToggle(userId: number, modulo: keyof Permisos) {
    if (!token || savingKey) return;

    const current = permisosMap[userId] ?? DEFAULT_PERMISOS;
    const next = { ...current, [modulo]: !current[modulo] };

    setPermisosMap((prev) => ({ ...prev, [userId]: next }));

    try {
      setSavingKey(`${userId}-${modulo}`);
      setError('');
      setMessage('');

      const confirmedMutation1 = await api.put(`/permisos/${userId}`, next, authConfig);
      assertSaved(confirmedMutation1.data, 'No se pudo confirmar la operación.');
      setMessage('Permisos actualizados correctamente.');
    } catch (e: any) {
      setPermisosMap((prev) => ({ ...prev, [userId]: current }));
      setError(e?.response?.data?.message ?? 'No se pudieron actualizar los permisos.');
    } finally {
      setSavingKey('');
    }
  }

  async function bulkUpdatePermisos(modulos: (keyof Permisos)[], value: boolean) {
    if (!token || savingKey) return;

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

      const results = await Promise.allSettled(targetUsers.map(async (u) => {
        const { data } = await api.put(`/permisos/${u.id}`, updates[u.id], authConfig);
        assertSaved(data, 'No se pudieron confirmar los permisos.');
      }));
      const failedIds = targetUsers.filter((_, index) => results[index].status === 'rejected').map(u => u.id);
      if (failedIds.length) {
        setPermisosMap(previous => {
          const restored = { ...previous };
          for (const id of failedIds) restored[id] = previousMap[id] ?? DEFAULT_PERMISOS;
          return restored;
        });
        setError(`Se guardaron ${targetUsers.length - failedIds.length} de ${targetUsers.length} cambios. No se confirmó el guardado de ${failedIds.length}; revisa esos permisos antes de reintentar.`);
      } else {
        setMessage(`Acceso actualizado para ${targetUsers.length} empleado(s).`);
      }
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

      const confirmedMutation2 = await api.patch(`/users/${userId}/vacation-days`, { dias_vacaciones_disponibles: dias }, authConfig);
      assertSaved(confirmedMutation2.data, 'No se pudo confirmar la operación.');

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

      const confirmedMutation3 = await api.patch(`/users/${u.id}/active`, { activo: !u.activo }, authConfig);
      assertSaved(confirmedMutation3.data, 'No se pudo confirmar la operación.');

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

      const confirmedMutation4 = await api.delete(`/users/${userId}`, authConfig);
      assertSaved(confirmedMutation4.data, 'No se pudo confirmar la operación.');

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
      <div className="module-card users-overview-card">
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
            {showCrud ? 'Ocultar gestión de usuarios' : 'Gestionar usuarios'}
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
            <div className="users-filter-panel permission-search-panel">
              <div className="users-filter-grid users-permission-search-grid">
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
                  <span>Estado del empleado</span>
                  <select value={permissionFilter} onChange={(e) => setPermissionFilter(e.target.value as PermissionFilter)}>
                    <option value="todos">Todos los empleados</option>
                    <option value="activos">Solo activos</option>
                    <option value="inactivos">Solo inactivos</option>
                  </select>
                </label>

              </div>

              <div className="users-filter-summary">
                <span>{empleados.length} empleados disponibles</span>
                <span>{hasPermissionQuery ? `${filteredPermisosUsers.length} coincidencia(s)` : 'Escribe al menos 2 letras para buscar'}</span>
              </div>
            </div>

            <details className="permission-bulk-disclosure">
              <summary>
                <span className="permission-command-icon">A</span>
                <span><strong>Cambiar acceso para varias personas</strong><small>Úsalo solo si el mismo cambio aplica a todas las personas encontradas.</small></span>
                <em>Configurar</em>
              </summary>
              <div className="permission-command-bar">
                <label className="permission-command-select">
                  <span>Módulo</span>
                  <select value={bulkPermissionTarget} onChange={(event) => setBulkPermissionTarget(event.target.value as BulkPermissionTarget)}>
                    <option value="asistencia">Asistencia · {permissionStats.conAsistencia} con acceso</option>
                    <option value="contratos">Contratos · {permissionStats.conContratos} con acceso</option>
                    <option value="nomina">Nómina · {permissionStats.conNomina} con acceso</option>
                    <option value="vacaciones">Vacaciones · {permissionStats.conVacaciones} con acceso</option>
                    <option value="todos">Todos los módulos</option>
                  </select>
                </label>
                <div className="permission-command-actions">
                  <button
                    className="bulk-action-btn"
                    type="button"
                    disabled={isBulkSaving}
                    onClick={() => bulkUpdatePermisos(bulkPermissionTarget === 'todos' ? ['asistencia', 'contratos', 'nomina', 'vacaciones'] : [bulkPermissionTarget], true)}
                  >
                    Activar
                  </button>
                  <button
                    className="bulk-action-btn danger"
                    type="button"
                    disabled={isBulkSaving}
                    onClick={() => bulkUpdatePermisos(bulkPermissionTarget === 'todos' ? ['asistencia', 'contratos', 'nomina', 'vacaciones'] : [bulkPermissionTarget], false)}
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            </details>

            {!hasPermissionQuery ? (
              <div className="permission-search-empty">
                <span>⌕</span>
                <div><strong>Busca a la persona que necesitas</strong><p>La lista aparece únicamente al escribir un nombre o correo. Así puedes editar accesos sin revisar cientos de registros.</p></div>
              </div>
            ) : filteredPermisosUsers.length > 0 ? (
              <div className="permission-results-shell">
                <div className="permission-user-list">
                      {visiblePermisosUsers.map((u) => {
                        const permisos = permisosMap[u.id] ?? DEFAULT_PERMISOS;

                        return (
                          <article className="permission-user-card" key={u.id}>
                            <div className="permission-user-identity">
                              <span className="permission-user-avatar">{`${u.nombre?.charAt(0) || ''}${u.apellido?.charAt(0) || ''}`.toUpperCase()}</span>
                              <div><strong>{u.nombre} {u.apellido}</strong><small>{u.correo}</small></div>
                              <em className={isActiveUser(u) ? 'active' : 'inactive'}>{isActiveUser(u) ? 'Activo' : 'Inactivo'}</em>
                            </div>
                            <div className="permission-user-modules">
                            {(['asistencia', 'contratos', 'nomina', 'vacaciones'] as (keyof Permisos)[]).map((modulo) => (
                              <div className="permission-toggle" key={modulo}>
                                <span>{modulo === 'nomina' ? 'Nómina' : modulo.charAt(0).toUpperCase() + modulo.slice(1)}</span>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={permisos[modulo]}
                                    disabled={Boolean(savingKey) || isBulkSaving}
                                    onChange={() => onToggle(u.id, modulo)}
                                  />
                                  <span className="slider" />
                                </label>
                              </div>
                            ))}
                            </div>
                          </article>
                        );
                      })}
                </div>
                {filteredPermisosUsers.length > visiblePermisosUsers.length && (
                  <p className="permission-search-hint">
                    Se muestran las primeras {visiblePermisosUsers.length} coincidencias. Agrega apellido o correo para precisar la búsqueda.
                  </p>
                )}
              </div>
            ) : (
              <div className="empty-state-card">
                <h3>Sin empleados disponibles</h3>
                <p>No hay empleados a quienes puedas cambiar el acceso.</p>
              </div>
            )}
          </>
        )}
      </div>

      <SmartRhModal open={Boolean(editingInvitation)} onClose={() => setEditingInvitation(null)}
        title="Editar invitación" eyebrow="Correo pendiente" size="compact" busy={savingKey==='invitation-email'}
        description="Corrige el correo y envía un enlace nuevo. El enlace anterior dejará de funcionar; se conservarán el rol y la fecha de ingreso.">
        {editingInvitation && <form onSubmit={saveInvitationEmail} className="invitation-resend-form">
          <p>Correo anterior: <strong>{editingInvitation.invite_email}</strong></p>
          <label className="form-label">Correo corregido<input type="email" required maxLength={191} autoComplete="email" spellCheck={false} value={invitationEmail} disabled={savingKey==='invitation-email'} onChange={event=>setInvitationEmail(event.target.value)} /></label>
          {editingInvitation.account_type ? <p>Rol: {editingInvitation.account_type==='admin'?'Administrador':'Empleado'} · Ingreso: {normalizeDate(editingInvitation.fecha_ingreso)||'No registrado'}</p> :
            <label className="form-label">Confirma el rol<select required value={invitationRole} disabled={savingKey==='invitation-email'} onChange={event=>setInvitationRole(event.target.value)}><option value="">Selecciona un rol</option><option value="empleado">Empleado</option><option value="admin">Administrador</option></select></label>}
          {invitationEditError && <p className="module-error" role="alert">{invitationEditError}</p>}
          <div className="smart-form-actions">
            <button type="button" className="btn btn-secondary" disabled={savingKey==='invitation-email'} onClick={()=>setEditingInvitation(null)}>Volver</button>
            <button type="submit" className="btn" disabled={savingKey==='invitation-email'}>{savingKey==='invitation-email'?'Guardando y enviando…':'Guardar y enviar invitación'}</button>
          </div>
        </form>}
      </SmartRhModal>
      <SmartRhModal open={Boolean(cancelingInvitation)} onClose={()=>setCancelingInvitation(null)}
        title="Cancelar invitación" eyebrow="Acceso pendiente" size="compact" busy={savingKey==='invitation-cancel'}
        description="La invitación desaparecerá de pendientes y su enlace dejará de permitir la activación.">
        {cancelingInvitation && <div className="invitation-resend-form">
          <p>Confirma la cancelación para <strong>{cancelingInvitation.invite_email}</strong>.</p>
          {invitationCancelError && <p className="module-error" role="alert">{invitationCancelError}</p>}
          <div className="smart-form-actions">
            <button type="button" className="btn btn-secondary" disabled={savingKey==='invitation-cancel'} onClick={()=>setCancelingInvitation(null)}>Volver</button>
            <button type="button" className="btn smart-action-danger" disabled={savingKey==='invitation-cancel'} onClick={cancelInvitation}>{savingKey==='invitation-cancel'?'Cancelando…':'Cancelar invitación'}</button>
          </div>
        </div>}
      </SmartRhModal>

      <SmartRhModal open={Boolean(resending)} onClose={() => { setResending(null); setResendError(''); }}
        title="Reenviar invitación" eyebrow="Acceso pendiente" size="compact" busy={savingKey.startsWith('resend-')}
        description={resending?.existingUserId ? "Se enviará un enlace nuevo a esta cuenta existente. No se duplicará el usuario. Su contraseña solo cambiará si acepta el enlace y establece una nueva." : "Se enviará un enlace nuevo. El enlace anterior dejará de ser válido."}>
        {resending && <div className="invitation-resend-form">
          <p><strong>{resending.nombre} {resending.apellido}</strong><br />{resending.invite_email}</p>
          {resending.account_type ? <p>Rol: {resending.account_type === 'admin' ? 'Administrador' : 'Empleado'}</p> :
            <label className="form-label">Confirma el rol de esta cuenta<select value={resendRole} onChange={event => setResendRole(event.target.value)} disabled={savingKey.startsWith('resend-')}>
              <option value="">Selecciona un rol</option><option value="empleado">Empleado</option><option value="admin">Administrador</option>
            </select></label>}
          {resendError && <p className="module-error" role="alert">{resendError}</p>}
          <div className="smart-form-actions">
            <button type="button" className="btn btn-secondary" disabled={savingKey.startsWith('resend-')} onClick={() => setResending(null)}>Cancelar</button>
            <button type="button" className="btn" onClick={resendInvitation} disabled={!resendRole || savingKey.startsWith('resend-') || new Date(resending.created_at).getTime() > now - 60000}>
              {savingKey.startsWith('resend-') ? 'Reenviando…' : new Date(resending.created_at).getTime() > now - 60000 ? `Disponible en ${Math.max(1, Math.ceil((new Date(resending.created_at).getTime() + 60000 - now) / 1000))} s` : 'Reenviar invitación'}
            </button>
          </div>
        </div>}
      </SmartRhModal>

      {showCrud && (
        <>
          <SmartRhModal
            open={showUserForm}
            onClose={() => { resetForm(); setShowUserForm(false); }}
            eyebrow={editingId ? 'Edición de personal' : 'Invitación de personal'}
            title={editingId ? 'Editar usuario' : 'Invitar nuevo usuario'}
            description={editingId ? 'Actualiza los datos de la cuenta y la relación laboral.' : 'Indica correo, rol y fecha de ingreso. La persona completará sus datos al aceptar.'}
            size={editingId ? 'wide' : 'compact'}
            busy={savingKey === 'user-form'}
          >
            <form className="users-modal-form" onSubmit={(event) => { event.preventDefault(); void saveUser(); }}>
              {error && <p className="module-error" role="alert">{error}</p>}
              <section className="users-form-section">
                <div className="users-form-section-title"><span>01</span><div><strong>{editingId ? 'Datos de la cuenta' : 'Datos de la invitación'}</strong><small>{editingId ? 'Información de la persona y su cuenta.' : 'La persona completará su nombre y contacto al aceptar.'}</small></div></div>
                <div className="form-grid">
                  {editingId && <>
                    <label className="form-label">Nombre<input required maxLength={100} value={form.nombre} onChange={(e) => updateForm('nombre', e.target.value)} /></label>
                    <label className="form-label">Apellido<input required maxLength={100} value={form.apellido} onChange={(e) => updateForm('apellido', e.target.value)} /></label>
                  </>}
                  <label className="form-label">Correo<input required type="email" autoComplete="email" maxLength={191} value={form.correo} onChange={(e) => updateForm('correo', e.target.value)} /></label>
                  <label className="form-label users-role-field">Rol
                    <select required value={form.rol_id} onChange={(e) => updateForm('rol_id', e.target.value)}>
                      <option value="1" disabled={Boolean(editingId) && !users.some((candidate) => candidate.id === editingId && isAdminUser(candidate))}>Administrador</option>
                      <option value="2">Empleado</option>
                    </select>
                  </label>
                  {!editingId && <label className="form-label">Fecha de ingreso<input required type="date" min="1900-01-01" max="2100-12-31" value={form.fecha_ingreso} onChange={(e) => updateForm('fecha_ingreso', e.target.value)} /></label>}
                </div>
                {!editingId && <p className="module-info">Vacaciones iniciales: <strong>12 días automáticos</strong>. El correo, rol y fecha de ingreso quedarán asignados a esta invitación. La persona completará sus datos y creará su contraseña mediante un enlace personal de 30 minutos.</p>}
              </section>
              {editingId && <>
                <section className="users-form-section">
                  <div className="users-form-section-title"><span>02</span><div><strong>Contacto</strong><small>Información para comunicación y expediente interno.</small></div></div>
                  <div className="form-grid">
                    <label className="form-label">Teléfono<input type="tel" maxLength={30} value={form.telefono} onChange={(e) => updateForm('telefono', e.target.value)} /></label>
                    <label className="form-label">Dirección<input maxLength={500} value={form.direccion} onChange={(e) => updateForm('direccion', e.target.value)} /></label>
                  </div>
                </section>
                <section className="users-form-section">
                  <div className="users-form-section-title"><span>03</span><div><strong>Relación laboral</strong><small>Datos de la cuenta existente.</small></div></div>
                  <div className="form-grid">
                    <label className="form-label">Fecha de ingreso<input type="date" value={form.fecha_ingreso} onChange={(e) => updateForm('fecha_ingreso', e.target.value)} /></label>
                    <label className="form-label">Días de vacaciones<input type="number" min={0} value={form.dias_vacaciones_disponibles} onChange={(e) => updateForm('dias_vacaciones_disponibles', e.target.value)} /></label>
                  </div>
                </section>
              </>}
              <div className="users-form-actions">
                <button className="btn" type="submit" disabled={savingKey === 'user-form'}>{savingKey === 'user-form' ? 'Guardando…' : editingId ? 'Actualizar usuario' : 'Enviar invitación'}</button>
                <button className="btn btn-secondary" type="button" disabled={savingKey === 'user-form'} onClick={() => { resetForm(); setShowUserForm(false); }}>Cancelar</button>
              </div>
            </form>
          </SmartRhModal>

          <div className="module-card users-crud-card">
            <div className="module-card-header">
              <div>
                <p className="module-eyebrow">Gestión de usuarios</p>
                <h2 className="module-title">Listado general</h2>
                <p className="module-subtitle">
                  Filtra usuarios por nombre, rol, estado y días de vacaciones.
                </p>
              </div>
              <button className="btn" type="button" onClick={() => { resetForm(); setShowUserForm(true); }}>
                Invitar usuario
              </button>
            </div>

            <div className="users-filter-panel">
              <div className="users-filter-grid users-filter-grid-large">
                <label className="users-filter-control">
                  <span>Buscar usuario</span>
                  <input
                    type="search"
                    value={userSearch}
                    placeholder="Nombre, correo, teléfono o dirección..."
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
                    <option value="pendientes">Invitaciones pendientes</option>
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
                    <tr key={u.invitation?.invitation_id || u.id}>
                      <td>
                        <div className="users-table-person">
                          <span>{`${u.nombre?.charAt(0) || ''}${u.apellido?.charAt(0) || ''}`.toUpperCase()}</span>
                          <div><div className="table-main-text">{u.nombre} {u.apellido}</div><div className="table-secondary-text">{u.correo}</div></div>
                        </div>
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
                        {u.invitation ? <span className="status-pill invitation-pending">{u.invitation.delivery_failed_at ? 'Envío no confirmado' : new Date(u.invitation.expires_at).getTime() <= now ? 'Invitación vencida' : 'Pendiente de aceptación'}</span> : <button
                          type="button"
                          className={`status-pill ${u.activo ? 'active' : 'inactive'}`}
                          disabled={savingKey === `${u.id}-active`}
                          onClick={() => toggleActive(u)}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>}
                      </td>

                      <td>
                        {u.invitation ? <span>{u.dias_vacaciones_disponibles} días al activar</span> : <>
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
                            className="btn btn-small smart-action-correct"
                            disabled={savingKey === `${u.id}-vacation-days`}
                            onClick={() => saveVacationDays(u.id)}
                          >
                            Guardar
                          </button>
                        </div>
                        </>}
                      </td>

                      <td>
                        {u.invitation ? <div className="users-row-actions">
                          <button type="button" className="btn btn-small smart-action-correct" disabled={Boolean(savingKey)} onClick={() => startResend(u.invitation!)}>Reenviar invitación</button>
                          <button type="button" className="btn btn-small smart-action-correct" disabled={Boolean(savingKey)} onClick={() => startInvitationEdit(u.invitation!)}>Editar invitación</button>
                          <button type="button" className="btn btn-small smart-action-danger" disabled={Boolean(savingKey)} onClick={() => { setCancelingInvitation(u.invitation!);setInvitationCancelError(''); }}>Cancelar invitación</button>
                        </div> : <>
                        <div className="users-row-actions">
                          <button type="button" className="btn btn-small smart-action-correct" disabled={!u.activo || Boolean(savingKey)} onClick={() => startExistingResend(u)} title={!u.activo ? 'Activa la cuenta antes de enviar una invitación.' : 'Enviar un enlace nuevo para acceder a esta cuenta.'}>Reenviar invitación</button>
                          <button type="button" className="btn btn-small smart-action-correct" onClick={() => startEdit(u)}>
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn btn-small smart-action-danger"
                            disabled={savingKey === `${u.id}-delete`}
                            onClick={() => deleteUser(u.id)}
                          >
                            Desactivar
                          </button>
                        </div>
                        </>}
                      </td>
                    </tr>
                  ))}

                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={6}>
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
