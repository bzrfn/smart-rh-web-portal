import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import SmartRhModal from '../../components/SmartRhModal';

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

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const TICKETS_PER_PAGE = 4;

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, months: number) {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ticketDateKey(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : toDateKey(date);
}

function getMonthCells(monthDate: Date) {
  const first = startOfMonth(monthDate);
  const firstMondayIndex = (first.getDay() + 6) % 7;
  const gridStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - firstMondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return {
      day: date.getDate(),
      date: toDateKey(date),
      inCurrentMonth: date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear(),
    };
  });
}

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
  const [currentPage, setCurrentPage] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthCells = useMemo(() => getMonthCells(currentMonth), [currentMonth]);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const ticketCountByDate = useMemo(() => tickets.reduce<Record<string, number>>((acc, ticket) => {
    const key = ticketDateKey(ticket.createdAt);
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [tickets]);
  const filteredTickets = useMemo(
    () => selectedDate ? tickets.filter((ticket) => ticketDateKey(ticket.createdAt) === selectedDate) : tickets,
    [selectedDate, tickets]
  );
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * TICKETS_PER_PAGE;
    return filteredTickets.slice(start, start + TICKETS_PER_PAGE);
  }, [currentPage, filteredTickets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [estado, categoria, prioridad, search, selectedDate]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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

  function closeTicket() {
    if (saving) return;
    setSelectedTicket(null);
    setRespuestaAdmin('');
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

  function moveMonth(direction: number) {
    setCurrentMonth((month) => addMonths(month, direction));
    setSelectedDate(null);
  }

  function goToday() {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(toDateKey(today));
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

        <div className="support-hero-status">
          <span>{resumen.abiertos + resumen.en_revision}</span>
          <div>
            <strong>Casos por atender</strong>
            <small>Abiertos y en seguimiento</small>
          </div>
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

      <section className="support-workspace support-calendar-workspace">
        <aside className="calendar-month-card support-calendar-card">
          <div className="calendar-month-header">
            <button className="calendar-month-arrow" type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">‹</button>
            <div>
              <span className="support-eyebrow">Calendario de reportes</span>
              <h2>{currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</h2>
            </div>
            <div className="calendar-month-actions">
              <button className="calendar-today-btn" type="button" onClick={goToday}>Hoy</button>
              <button className="calendar-month-arrow" type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">›</button>
            </div>
          </div>

          <div className="calendar-week-row">
            {WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>

          <div className="calendar-grid">
            {monthCells.map((cell) => {
              const count = ticketCountByDate[cell.date] || 0;
              return (
                <button
                  key={cell.date}
                  className={[
                    'calendar-day',
                    selectedDate === cell.date ? 'selected' : '',
                    todayKey === cell.date ? 'today' : '',
                    !cell.inCurrentMonth ? 'outside-month' : '',
                  ].filter(Boolean).join(' ')}
                  type="button"
                  onClick={() => {
                    if (!cell.inCurrentMonth) {
                      const [year, month] = cell.date.split('-').map(Number);
                      setCurrentMonth(new Date(year, month - 1, 1));
                    }
                    setSelectedDate(cell.date);
                  }}
                >
                  <strong>{cell.day}</strong>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="support-calendar-footer">
            <span><i /> Los días con número tienen reportes</span>
            {selectedDate && <button type="button" onClick={() => setSelectedDate(null)}>Ver todos</button>}
          </div>
        </aside>

        <div className="support-list-panel">
          <div className="support-section-header">
            <div>
              <p className="support-eyebrow">Bandeja de tickets</p>
              <h3>{selectedDate ? `Reportes del ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'long' })}` : 'Incidencias recibidas'}</h3>
            </div>
            {selectedDate && <button className="btn btn-small btn-secondary" type="button" onClick={() => setSelectedDate(null)}>Quitar fecha</button>}
          </div>

          <form className="support-filters" onSubmit={submitSearch}>
            <label className="support-filter-control support-filter-search">
              <span>Buscar ticket</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Título, descripción o categoría"
              />
            </label>

            <label className="support-filter-control support-filter-state">
              <span>Estado</span>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                {estados.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="support-filter-control support-filter-category">
              <span>Categoría</span>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {item === 'todas' ? 'Todas las categorías' : item}
                  </option>
                ))}
              </select>
            </label>

            <label className="support-filter-control support-filter-priority">
              <span>Prioridad</span>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                {prioridades.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="btn support-filter-submit" type="submit">
              Aplicar filtros
            </button>
          </form>

          <div className="support-ticket-list">
            {loading ? (
              <div className="support-empty">
                <strong>Cargando tickets...</strong>
                <p>Consultando incidencias registradas.</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              paginatedTickets.map((ticket) => (
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

                  <div className="support-ticket-copy">
                    <h4>{ticket.titulo}</h4>
                    <p>{ticket.descripcion}</p>
                  </div>

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

          {filteredTickets.length > 0 && (
            <div className="support-pagination">
              <span>{filteredTickets.length} tickets · Página {currentPage} de {totalPages}</span>
              <div>
                <button className="btn btn-small btn-secondary" type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Anterior</button>
                <button className="btn btn-small btn-secondary" type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <SmartRhModal
        open={Boolean(selectedTicket)}
        onClose={closeTicket}
        eyebrow="Seguimiento de soporte"
        title={selectedTicket?.titulo || 'Detalle del ticket'}
        description="Revisa el caso, actualiza su prioridad y deja una respuesta clara para el empleado."
        size="wide"
        busy={saving}
      >
          {selectedTicket && (
            <div className="support-detail-modal-content">
              <div className="support-section-header">
                <div>
                  <p className="support-eyebrow">Detalle del ticket</p>
                  <h3>{getEmployeeName(selectedTicket)}</h3>
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

                <button className="btn smart-action-correct" type="button" onClick={saveTicket} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}
      </SmartRhModal>
    </div>
  );
}
