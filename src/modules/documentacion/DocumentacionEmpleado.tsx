import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import ProtectedImage from '../../components/ProtectedImage';
import { openProtectedResource } from '../../services/protectedMedia';

type User = {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  role?: string;
  rol_nombre?: string;
  foto_perfil_url?: string;
  credencial_url?: string;
  activo?: number | boolean;
};

type Contrato = {
  id: number;
  usuario_id: number;
  contrato_pdf_url?: string;
};

type EmployeeFilter =
  | 'todos'
  | 'activos'
  | 'con_foto'
  | 'sin_foto'
  | 'con_contrato'
  | 'sin_contrato'
  | 'con_credencial'
  | 'sin_credencial';

const getUserName = (user?: User) => {
  if (!user) return '';
  return `${user.nombre || ''} ${user.apellido || ''}`.trim();
};

const getUserRole = (user?: User) => {
  return user?.rol_nombre || user?.role || 'Empleado';
};

const normalizeText = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
};

export default function DocumentacionEmpleado() {
  const [users, setUsers] = useState<User[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedContratoUrl, setGeneratedContratoUrl] = useState('');
  const [generatedCredencialUrl, setGeneratedCredencialUrl] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<EmployeeFilter>('todos');
  const [pickerOpen, setPickerOpen] = useState(false);

  const selected = users.find((u) => String(u.id) === selectedId);

  const selectedContrato = useMemo(() => {
    return contratos
      .filter((c) => String(c.usuario_id) === selectedId)
      .sort((a, b) => Number(b.id) - Number(a.id))[0];
  }, [contratos, selectedId]);

  const contratoUrl = generatedContratoUrl || selectedContrato?.contrato_pdf_url || '';
  const credencialUrl = generatedCredencialUrl || selected?.credencial_url || '';

  const contratosByUserId = useMemo(() => {
    const map = new Map<number, Contrato>();

    for (const contrato of contratos) {
      const current = map.get(contrato.usuario_id);

      if (!current || Number(contrato.id) > Number(current.id)) {
        map.set(contrato.usuario_id, contrato);
      }
    }

    return map;
  }, [contratos]);

  const employeeStats = useMemo(() => {
    const total = users.length;
    const conFoto = users.filter((u) => Boolean(u.foto_perfil_url)).length;
    const sinFoto = total - conFoto;
    const conContrato = users.filter((u) => Boolean(contratosByUserId.get(u.id)?.contrato_pdf_url)).length;
    const sinContrato = total - conContrato;
    const conCredencial = users.filter((u) => Boolean(u.credencial_url)).length;
    const sinCredencial = total - conCredencial;
    const activos = users.filter((u) => u.activo === true || Number(u.activo) === 1).length;

    return {
      total,
      activos,
      conFoto,
      sinFoto,
      conContrato,
      sinContrato,
      conCredencial,
      sinCredencial,
    };
  }, [users, contratosByUserId]);

  const filteredUsers = useMemo(() => {
    const query = normalizeText(searchTerm.trim());

    const result = users.filter((user) => {
      const contrato = contratosByUserId.get(user.id);

      const hasFoto = Boolean(user.foto_perfil_url);
      const hasContrato = Boolean(contrato?.contrato_pdf_url);
      const hasCredencial = Boolean(user.credencial_url);
      const isActive = user.activo === true || Number(user.activo) === 1;

      if (activeFilter === 'activos' && !isActive) return false;
      if (activeFilter === 'con_foto' && !hasFoto) return false;
      if (activeFilter === 'sin_foto' && hasFoto) return false;
      if (activeFilter === 'con_contrato' && !hasContrato) return false;
      if (activeFilter === 'sin_contrato' && hasContrato) return false;
      if (activeFilter === 'con_credencial' && !hasCredencial) return false;
      if (activeFilter === 'sin_credencial' && hasCredencial) return false;

      if (!query) return true;

      const searchable = normalizeText(
        `${user.nombre || ''} ${user.apellido || ''} ${user.correo || ''} ${getUserRole(user)}`
      );

      return searchable.includes(query);
    });

    return result.slice(0, 40);
  }, [users, contratosByUserId, searchTerm, activeFilter]);

  async function loadUsers() {
    const { data } = await api.get('/users');
    const list = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
    setUsers(list);

    if (!selectedId && list[0]) {
      setSelectedId(String(list[0].id));
    }
  }

  async function loadContratos() {
    try {
      const { data } = await api.get('/contratos');
      const list = Array.isArray(data?.contratos) ? data.contratos : Array.isArray(data) ? data : [];
      setContratos(list);
    } catch {
      setContratos([]);
    }
  }

  async function reloadData() {
    await Promise.all([loadUsers(), loadContratos()]);
  }

  useEffect(() => {
    reloadData().catch(() => setMessage('No se pudieron cargar los datos de documentación.'));
  }, []);

  useEffect(() => {
    setGeneratedContratoUrl('');
    setGeneratedCredencialUrl('');
    setFotoBase64('');
    setFilename('');
    setMessage('');
    setPickerOpen(false);
    setSearchTerm('');
  }, [selectedId]);

  function selectEmployee(user: User) {
    setSelectedId(String(user.id));
    setPickerOpen(false);
    setSearchTerm('');
  }

  function onFileChange(file?: File) {
    if (!file) return;

    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = () => setFotoBase64(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  async function uploadPhoto() {
    if (!selectedId || !fotoBase64) return;

    setLoading(true);
    setMessage('');

    try {
      await api.patch(`/documentos/usuarios/${selectedId}/foto-perfil`, {
        base64: fotoBase64,
        filename,
      });

      await reloadData();
      setMessage('Foto de perfil actualizada correctamente.');
      setFotoBase64('');
      setFilename('');
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'No se pudo actualizar la foto.');
    } finally {
      setLoading(false);
    }
  }

  async function generateContrato() {
    if (!selectedId) return;

    setLoading(true);
    setMessage('');

    try {
      const { data } = await api.post(`/documentos/usuarios/${selectedId}/contrato-pdf`);
      const url = data?.contrato_pdf_url || '';

      if (url) setGeneratedContratoUrl(url);

      await reloadData();
      setMessage('Contrato PDF generado correctamente.');
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'No se pudo generar el contrato.');
    } finally {
      setLoading(false);
    }
  }

  async function viewPrivateResource(url: string, label: string) {
    if (!url) return;

    try {
      setMessage('');
      await openProtectedResource(url);
    } catch (e: any) {
      setMessage(
        e?.response?.data?.message ||
          `No se pudo abrir ${label}.`
      );
    }
  }

  async function generateCredencial() {
    if (!selectedId) return;

    setLoading(true);
    setMessage('');

    try {
      const { data } = await api.post(`/documentos/usuarios/${selectedId}/credencial-imagen`);
      const url = data?.credencial_url || '';

      if (url) setGeneratedCredencialUrl(url);

      await reloadData();
      setMessage('Credencial digital generada correctamente.');
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'No se pudo generar la credencial.');
    } finally {
      setLoading(false);
    }
  }

  const filterOptions: { key: EmployeeFilter; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: employeeStats.total },
    { key: 'activos', label: 'Activos', count: employeeStats.activos },
    { key: 'sin_foto', label: 'Sin foto', count: employeeStats.sinFoto },
    { key: 'con_foto', label: 'Con foto', count: employeeStats.conFoto },
    { key: 'sin_contrato', label: 'Sin contrato', count: employeeStats.sinContrato },
    { key: 'con_contrato', label: 'Con contrato', count: employeeStats.conContrato },
    { key: 'sin_credencial', label: 'Sin credencial', count: employeeStats.sinCredencial },
    { key: 'con_credencial', label: 'Con credencial', count: employeeStats.conCredencial },
  ];

  return (
    <div className="module-card document-page">
      <div className="module-card-header">
        <div>
          <p className="module-eyebrow">Expediente digital</p>
          <h2 className="module-title">Documentación del empleado</h2>
          <p className="module-subtitle">
            Administra foto de perfil, contrato PDF y credencial digital desde una sección centralizada.
          </p>
        </div>
      </div>

      {message && <p className="module-info document-alert">{message}</p>}

      <div className="document-grid document-grid-premium">
        <section className="document-panel document-panel-premium">
          <div className="document-section-header">
            <div>
              <h3>Empleado</h3>
              <p>Busca, filtra y selecciona empleados sin depender de listas extensas.</p>
            </div>
          </div>

          <div className="employee-picker">
            <label className="form-label">Empleado seleccionado</label>

            <div className="employee-selected-summary">
              <div className="employee-selected-avatar">
                {selected?.foto_perfil_url ? (
                  <ProtectedImage
                    src={selected.foto_perfil_url}
                    alt="Empleado seleccionado"
                    fallback={<span>{selected?.nombre?.[0] || 'S'}</span>}
                  />
                ) : (
                  <span>{selected?.nombre?.[0] || 'S'}</span>
                )}
              </div>

              <div className="employee-selected-info">
                <strong>{selected ? getUserName(selected) : 'Sin empleado seleccionado'}</strong>
                <span>{selected?.correo || 'Selecciona un empleado para administrar documentación'}</span>
              </div>

              <button
                type="button"
                className="employee-change-btn"
                onClick={() => setPickerOpen((value) => !value)}
              >
                {pickerOpen ? 'Cerrar' : 'Cambiar empleado'}
              </button>
            </div>

            <div className={`employee-search-panel ${pickerOpen ? 'open' : ''}`}>
              <div className="employee-search-box">
                <input
                  type="search"
                  value={searchTerm}
                  placeholder="Buscar por nombre, apellido, correo o rol..."
                  onFocus={() => setPickerOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPickerOpen(true);
                  }}
                />

                <span className="employee-search-count">
                  {filteredUsers.length} de {users.length}
                </span>
              </div>

              <div className="employee-filter-row">
                {filterOptions.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`employee-filter-chip ${activeFilter === filter.key ? 'active' : ''}`}
                    onClick={() => {
                      setActiveFilter(filter.key);
                      setPickerOpen(true);
                    }}
                  >
                    {filter.label}
                    <span>{filter.count}</span>
                  </button>
                ))}
              </div>

              {pickerOpen && (
                <div className="employee-results-panel">
                  <div className="employee-results-header">
                    <strong>Resultados</strong>
                    <span>Mostrando máximo 40 coincidencias</span>
                  </div>

                  {filteredUsers.length > 0 ? (
                    <div className="employee-results-list">
                      {filteredUsers.map((user) => {
                        const contrato = contratosByUserId.get(user.id);
                        const hasContrato = Boolean(contrato?.contrato_pdf_url);
                        const hasCredencial = Boolean(user.credencial_url);
                        const hasFoto = Boolean(user.foto_perfil_url);
                        const isSelected = String(user.id) === selectedId;

                        return (
                          <button
                            type="button"
                            key={user.id}
                            className={`employee-result-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => selectEmployee(user)}
                          >
                            <div className="employee-result-avatar">
                              {user.foto_perfil_url ? (
                                <ProtectedImage
                                  src={user.foto_perfil_url}
                                  alt={getUserName(user)}
                                  fallback={<span>{user.nombre?.[0] || 'E'}</span>}
                                />
                              ) : (
                                <span>{user.nombre?.[0] || 'E'}</span>
                              )}
                            </div>

                            <div className="employee-result-info">
                              <strong>{getUserName(user)}</strong>
                              <span>{user.correo}</span>

                              <div className="employee-mini-tags">
                                <small>{getUserRole(user)}</small>
                                <small className={hasFoto ? 'ok' : 'warn'}>
                                  {hasFoto ? 'Foto' : 'Sin foto'}
                                </small>
                                <small className={hasContrato ? 'ok' : 'warn'}>
                                  {hasContrato ? 'Contrato' : 'Sin contrato'}
                                </small>
                                <small className={hasCredencial ? 'ok' : 'warn'}>
                                  {hasCredencial ? 'Credencial' : 'Sin credencial'}
                                </small>
                              </div>
                            </div>

                            <div className="employee-result-action">
                              {isSelected ? 'Seleccionado' : 'Seleccionar'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="employee-empty-results">
                      <strong>Sin coincidencias</strong>
                      <p>Prueba con otro nombre, correo, rol o cambia el filtro activo.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="profile-preview profile-preview-premium">
            {selected?.foto_perfil_url ? (
              <ProtectedImage
                src={selected.foto_perfil_url}
                alt="Foto de perfil"
                fallback={
                  <div className="profile-placeholder">
                    {selected?.nombre?.[0] || 'S'}
                  </div>
                }
              />
            ) : (
              <div className="profile-placeholder">{selected?.nombre?.[0] || 'S'}</div>
            )}

            <div>
              <h3>{selected ? getUserName(selected) : 'Selecciona un empleado'}</h3>
              <p>{selected?.correo}</p>
              <p>{getUserRole(selected)}</p>
            </div>
          </div>

          <label className="file-input file-input-premium">
            <div>
              <strong>Foto de perfil</strong>
              <span>{filename || 'PNG, JPG o WEBP recomendado'}</span>
            </div>

            <input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0])} />
          </label>

          <button className="btn" type="button" disabled={loading || !fotoBase64} onClick={uploadPhoto}>
            {loading ? 'Procesando...' : 'Guardar foto de perfil'}
          </button>
        </section>

        <section className="document-panel document-panel-premium">
          <div className="document-section-header">
            <div>
              <h3>Documentos automáticos</h3>
              <p>Genera documentos desde el backend y conserva trazabilidad en MongoDB.</p>
            </div>
          </div>

          <div className="document-actions document-actions-premium">
            <button className="btn" type="button" disabled={loading || !selectedId} onClick={generateContrato}>
              Generar nuevo contrato PDF
            </button>

            <button className="btn btn-secondary" type="button" disabled={loading || !selectedId} onClick={generateCredencial}>
              Generar nueva credencial
            </button>
          </div>

          <div className="generated-docs-card">
            <div className="generated-docs-header">
              <h3>Documentos generados</h3>
              <p>Archivos disponibles para consulta del empleado seleccionado.</p>
            </div>

            <div className="generated-docs-list">
              <div className="generated-doc-item">
                <div>
                  <strong>Contrato laboral</strong>
                  <span>{contratoUrl ? 'PDF disponible' : 'Pendiente de generación'}</span>
                </div>

                {contratoUrl ? (
                  <button
                    type="button"
                    className="document-link document-link-button"
                    onClick={() => viewPrivateResource(contratoUrl, 'el contrato')}
                  >
                    Ver contrato
                  </button>
                ) : (
                  <span className="document-status-empty">Sin archivo</span>
                )}
              </div>

              <div className="generated-doc-item">
                <div>
                  <strong>Credencial digital</strong>
                  <span>{credencialUrl ? 'Imagen disponible' : 'Pendiente de generación'}</span>
                </div>

                {credencialUrl ? (
                  <button
                    type="button"
                    className="document-link document-link-button"
                    onClick={() => viewPrivateResource(credencialUrl, 'la credencial')}
                  >
                    Ver credencial
                  </button>
                ) : (
                  <span className="document-status-empty">Sin archivo</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}