import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type TicketEstado = 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';
type TicketPrioridad = 'baja' | 'media' | 'alta';

type Ticket = {
  _id: string;
  usuario_id: number;
  categoria: string;
  titulo: string;
  descripcion: string;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
  respuesta_admin?: string;
  createdAt?: string;
  updatedAt?: string;
  usuario?: {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    rol_id?: number;
  } | null;
};

type Resumen = {
  total: number;
  abiertos: number;
  en_revision: number;
  resueltos: number;
  cerrados: number;
  alta_prioridad: number;
};

const estados = [
  { value: 'todos', label: 'Todos' },
  { value: 'abierto', label: 'Abiertos' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'resuelto', label: 'Resueltos' },
  { value: 'cerrado', label: 'Cerrados' },
];

const prioridades = [
  { value: 'todas', label: 'Todas' },
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

const categorias = [
  'todas',
  'Asistencia',
  'Nómina',
  'Vacaciones',
  'Contrato',
  'Credencial',
  'Datos personales',
  'Acceso a la app',
  'Otro',
];

function estadoLabel(estado: TicketEstado) {
  const map: Record<TicketEstado, string> = {
    abierto: 'Abierto',
    en_revision: 'En revisión',
    resuelto: 'Resuelto',
    cerrado: 'Cerrado',
  };

  return map[estado] || estado;
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEmployeeName(ticket: Ticket) {
  if (!ticket.usuario) return `Usuario #${ticket.usuario_id}`;

  return `${ticket.usuario.nombre} ${ticket.usuario.apellido}`;
}

export default function Soporte() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resumen, setResumen] = useState<Resumen>({
    total: 0,
    abiertos: 0,
    en_revision: 0,
    resueltos: 0,
    cerrados: 0,
    alta_prioridad: 0,
  });

  const [estado, setEstado] = useState('todos');
  const [categoria, setCategoria] = useState('todas');
  const [prioridad, setPrioridad] = useState('todas');
  const [search, setSearch] = useState('');
  const [respuestaAdmin, setRespuestaAdmin] = useState('');
  const [estadoEdit, setEstadoEdit] = useState<TicketEstado>('abierto');
  const [prioridadEdit, setPrioridadEdit] = useState<TicketPrioridad>('media');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredTickets = useMemo(() => tickets, [tickets]);

  async function loadResumen() {
    const { data } = await api.get('/soporte/admin/resumen');
    setResumen(data?.resumen || {
      total: 0,
      abiertos: 0,
      en_revision: 0,
      resueltos: 0,
      cerrados: 0,
      alta_prioridad: 0,
    });
  }

  async function loadTickets() {
    setLoading(true);

    try {
      const { data } = await api.get('/soporte/tickets', {
        params: {
          estado,
          categoria,
          prioridad,
          search,
        },
      });

      const list = Array.isArray(data?.tickets) ? data.tickets : [];
      setTickets(list);

      if (selectedTicket) {
        const updated = list.find((t: Ticket) => t._id === selectedTicket._id);
        setSelectedTicket(updated || null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function reloadAll() {
    await Promise.all([loadResumen(), loadTickets()]);
  }

  useEffect(() => {
    reloadAll();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [estado, categoria, prioridad]);

  function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setRespuestaAdmin(ticket.respuesta_admin || '');
    setEstadoEdit(ticket.estado);
    setPrioridadEdit(ticket.prioridad);
  }

  async function saveTicket() {
    if (!selectedTicket) return;

    setSaving(true);

    try {
      await api.patch(`/soporte/tickets/${selectedTicket._id}`, {
        estado: estadoEdit,
        prioridad: prioridadEdit,
        respuesta_admin: respuestaAdmin,
      });

      await reloadAll();
    } finally {
      setSaving(false);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    loadTickets();
  }

  return (
    <div className="support-page">
      <section className="support-hero">
        <div>
          <p className="support-eyebrow">Gestión administrativa</p>
          <h2>Soporte</h2>
          <p>
            Administra incidencias reportadas desde la app móvil, revisa el estado de cada ticket,
            responde al empleado y mantén trazabilidad operativa.
          </p>
        </div>

        <div className="support-hero-card">
          <span>HELP</span>
          <strong>Centro de soporte</strong>
          <small>Tickets creados desde móvil y gestionados desde el portal.</small>
        </div>
      </section>

      <section className="support-kpis">
        <div className="support-kpi-card">
          <span>Total</span>
          <strong>{resumen.total}</strong>
          <p>Tickets registrados.</p>
        </div>

        <div className="support-kpi-card">
          <span>Abiertos</span>
          <strong>{resumen.abiertos}</strong>
          <p>Requieren atención inicial.</p>
        </div>

        <div className="support-kpi-card">
          <span>En revisión</span>
          <strong>{resumen.en_revision}</strong>
          <p>Casos en seguimiento.</p>
        </div>

        <div className="support-kpi-card">
          <span>Alta prioridad</span>
          <strong>{resumen.alta_prioridad}</strong>
          <p>Tickets críticos.</p>
        </div>
      </section>

      <section className="support-workspace">
        <div className="support-list-panel">
          <div className="support-section-header">
            <div>
              <p className="support-eyebrow">Bandeja de tickets</p>
              <h3>Incidencias recibidas</h3>
            </div>

            <button className="btn btn-secondary" type="button" onClick={reloadAll}>
              Actualizar
            </button>
          </div>

          <form className="support-filters" onSubmit={submitSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descripción o categoría..."
            />

            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              {estados.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {categorias.map((item) => (
                <option key={item} value={item}>
                  {item === 'todas' ? 'Todas las categorías' : item}
                </option>
              ))}
            </select>

            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
              {prioridades.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button className="btn" type="submit">
              Buscar
            </button>
          </form>

          <div className="support-ticket-list">
            {loading ? (
              <div className="support-empty">
                <strong>Cargando tickets...</strong>
                <p>Consultando incidencias registradas.</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <button
                  type="button"
                  key={ticket._id}
                  className={`support-ticket-item ${selectedTicket?._id === ticket._id ? 'active' : ''}`}
                  onClick={() => openTicket(ticket)}
                >
                  <div className="support-ticket-top">
                    <span className={`support-status ${ticket.estado}`}>
                      {estadoLabel(ticket.estado)}
                    </span>

                    <span className={`support-priority ${ticket.prioridad}`}>
                      {ticket.prioridad}
                    </span>
                  </div>

                  <h4>{ticket.titulo}</h4>
                  <p>{ticket.descripcion}</p>

                  <div className="support-ticket-meta">
                    <span>{ticket.categoria}</span>
                    <span>{getEmployeeName(ticket)}</span>
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="support-empty">
                <strong>Sin tickets encontrados</strong>
                <p>No hay incidencias que coincidan con los filtros seleccionados.</p>
              </div>
            )}
          </div>
        </div>

        <div className="support-detail-panel">
          {selectedTicket ? (
            <>
              <div className="support-section-header">
                <div>
                  <p className="support-eyebrow">Detalle del ticket</p>
                  <h3>{selectedTicket.titulo}</h3>
                </div>

                <span className={`support-status ${selectedTicket.estado}`}>
                  {estadoLabel(selectedTicket.estado)}
                </span>
              </div>

              <div className="support-detail-card">
                <div>
                  <span>Empleado</span>
                  <strong>{getEmployeeName(selectedTicket)}</strong>
                  <p>{selectedTicket.usuario?.correo || `Usuario #${selectedTicket.usuario_id}`}</p>
                </div>

                <div>
                  <span>Categoría</span>
                  <strong>{selectedTicket.categoria}</strong>
                  <p>{formatDate(selectedTicket.createdAt)}</p>
                </div>
              </div>

              <div className="support-description-card">
                <span>Descripción reportada</span>
                <p>{selectedTicket.descripcion}</p>
              </div>

              <div className="support-admin-form">
                <label>
                  Estado del ticket
                  <select value={estadoEdit} onChange={(e) => setEstadoEdit(e.target.value as TicketEstado)}>
                    <option value="abierto">Abierto</option>
                    <option value="en_revision">En revisión</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </label>

                <label>
                  Prioridad
                  <select value={prioridadEdit} onChange={(e) => setPrioridadEdit(e.target.value as TicketPrioridad)}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>

                <label>
                  Respuesta administrativa
                  <textarea
                    value={respuestaAdmin}
                    onChange={(e) => setRespuestaAdmin(e.target.value)}
                    placeholder="Escribe la respuesta o seguimiento para el empleado..."
                    rows={6}
                  />
                </label>

                <button className="btn" type="button" onClick={saveTicket} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </>
          ) : (
            <div className="support-empty support-empty-large">
              <strong>Selecciona un ticket</strong>
              <p>
                El detalle de la incidencia aparecerá aquí para actualizar estado, prioridad
                y respuesta administrativa.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}