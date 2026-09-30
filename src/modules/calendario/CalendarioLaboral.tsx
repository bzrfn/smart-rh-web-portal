import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../app/auth/AuthContext';
import { api } from '../../services/api';

type CalendarioTipo = 'asistencia' | 'vacacion' | 'incapacidad';

type CalendarioEvento = {
  id: string;
  origen_id: number;
  tipo: CalendarioTipo;
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  usuario_id: number;
  empleado_nombre: string;
  empleado_correo?: string | null;
  metadata?: Record<string, unknown>;
};

type CalendarioResumen = {
  total: number;
  asistencia: number;
  vacacion: number;
  incapacidad: number;
};

type CalendarioScope = 'admin' | 'empleado';
type SummaryKey = 'selection' | 'all' | CalendarioTipo;

const EMPTY_RESUMEN: CalendarioResumen = {
  total: 0,
  asistencia: 0,
  vacacion: 0,
  incapacidad: 0,
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, months: number) {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function toApiDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseApiDate(value?: string | null) {
  const clean = String(value || '').slice(0, 10);
  const [year, month, day] = clean.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getMonthRange(monthDate: Date) {
  const inicio = startOfMonth(monthDate);
  const fin = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  return {
    inicio: toApiDate(inicio),
    fin: toApiDate(fin),
  };
}

function getMonthCells(monthDate: Date) {
  const first = startOfMonth(monthDate);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstMondayIndex = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((firstMondayIndex + last.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstMondayIndex + 1;

    if (day < 1 || day > last.getDate()) {
      return null;
    }

    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);

    return {
      day,
      date: toApiDate(date),
    };
  });
}

function getEventDateKeys(item: CalendarioEvento) {
  const start = parseApiDate(item.fecha_inicio);
  const end = parseApiDate(item.fecha_fin) || start;

  if (!start || !end || end.getTime() < start.getTime()) {
    return [String(item.fecha_inicio || '').slice(0, 10)].filter(Boolean);
  }

  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (cursor.getTime() <= end.getTime()) {
    keys.push(toApiDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function formatMonthTitle(value: Date) {
  return value.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDate(value?: string | null) {
  const date = parseApiDate(value);

  if (!date) {
    return 'Sin fecha';
  }

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateRange(start?: string | null, end?: string | null) {
  const cleanStart = String(start || '').slice(0, 10);
  const cleanEnd = String(end || '').slice(0, 10);

  if (!cleanEnd || cleanStart === cleanEnd) {
    return formatDate(cleanStart);
  }

  return `${formatDate(cleanStart)} al ${formatDate(cleanEnd)}`;
}

function getTipoLabel(tipo: CalendarioTipo) {
  if (tipo === 'asistencia') return 'Asistencia';
  if (tipo === 'vacacion') return 'Vacaciones';
  return 'Incapacidad';
}

function getTipoCode(tipo: CalendarioTipo) {
  if (tipo === 'asistencia') return 'AS';
  if (tipo === 'vacacion') return 'VC';
  return 'IN';
}

function getEstadoLabel(value?: string | null) {
  const estado = String(value || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    aprobada: 'Aprobada',
    aprobado: 'Aprobado',
    pendiente: 'Pendiente',
    rechazada: 'Rechazada',
    rechazado: 'Rechazado',
    valida: 'Válida',
    valido: 'Válido',
    invalidada: 'Invalidada',
    invalida: 'Inválida',
    sin_estado: 'Sin estado',
  };

  return (
    labels[estado] ||
    estado.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase()) ||
    'Sin estado'
  );
}

function getSummaryTitle(key: SummaryKey) {
  if (key === 'selection') return 'Agenda seleccionada';
  if (key === 'asistencia') return 'Asistencia del mes';
  if (key === 'vacacion') return 'Vacaciones del mes';
  if (key === 'incapacidad') return 'Incapacidades del mes';
  return 'Resumen mensual';
}

export default function CalendarioLaboral() {
  const { user, token } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toApiDate(new Date()));
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [resumen, setResumen] = useState<CalendarioResumen>(EMPTY_RESUMEN);
  const [scope, setScope] = useState<CalendarioScope>(
    user?.role === 'admin' ? 'admin' : 'empleado'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSummary, setActiveSummary] = useState<SummaryKey>('selection');
  const [selectedEvent, setSelectedEvent] = useState<CalendarioEvento | null>(null);

  const range = useMemo(() => getMonthRange(currentMonth), [currentMonth]);
  const monthCells = useMemo(() => getMonthCells(currentMonth), [currentMonth]);
  const todayKey = useMemo(() => toApiDate(new Date()), []);

  const loadCalendario = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/calendario/laboral', {
        params: {
          inicio: range.inicio,
          fin: range.fin,
        },
      });

      setEventos(Array.isArray(data?.eventos) ? data.eventos : []);
      setResumen({
        ...EMPTY_RESUMEN,
        ...(data?.resumen || {}),
      });

      if (data?.scope === 'admin' || data?.scope === 'empleado') {
        setScope(data.scope);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo cargar el calendario laboral.');
      setEventos([]);
      setResumen(EMPTY_RESUMEN);
    } finally {
      setLoading(false);
    }
  }, [range.fin, range.inicio, token]);

  useEffect(() => {
    loadCalendario();
  }, [loadCalendario]);

  const eventsByDate = useMemo(() => {
    return eventos.reduce<Record<string, CalendarioEvento[]>>((acc, item) => {
      getEventDateKeys(item).forEach((key) => {
        acc[key] = acc[key] || [];
        acc[key].push(item);
      });

      return acc;
    }, {});
  }, [eventos]);

  const selectedEvents = useMemo(() => {
    return selectedDate ? eventsByDate[selectedDate] || [] : eventos;
  }, [eventos, eventsByDate, selectedDate]);

  const filteredEvents = useMemo(() => {
    if (activeSummary === 'selection') return selectedEvents;
    if (activeSummary === 'all') return eventos;

    return eventos.filter((item) => item.tipo === activeSummary);
  }, [activeSummary, eventos, selectedEvents]);

  const moveMonth = (direction: number) => {
    const next = addMonths(currentMonth, direction);
    const today = new Date();
    const isCurrent =
      next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();

    setCurrentMonth(next);
    setSelectedDate(isCurrent ? toApiDate(today) : null);
    setActiveSummary('selection');
  };

  const goToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(toApiDate(today));
    setActiveSummary('selection');
  };

  if (!token) {
    return (
      <div className="module-card">
        <div className="empty-state-card">
          <h3>Sesión requerida</h3>
          <p>Debes iniciar sesión para consultar el calendario laboral.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page calendar-page">
      <section className="calendar-hero">
        <div>
          <span className="enterprise-chip">
            {scope === 'admin' ? 'Vista admin' : 'Mi calendario'}
          </span>
          <h1>Calendario laboral</h1>
          <p>
            Consulta asistencia, vacaciones e incapacidades en una vista mensual
            clara para seguimiento operativo.
          </p>
        </div>

        <div className="calendar-hero-actions">
          <button className="calendar-soft-btn" onClick={goToday} type="button">
            Ir a hoy
          </button>
          <button className="calendar-primary-btn" onClick={loadCalendario} type="button">
            Actualizar
          </button>
        </div>
      </section>

      <section className="calendar-summary-grid">
        <SummaryCard
          title="Eventos"
          value={resumen.total}
          detail="Resumen mensual"
          tone="blue"
          active={activeSummary === 'all'}
          onClick={() => setActiveSummary('all')}
        />
        <SummaryCard
          title="Asistencia"
          value={resumen.asistencia}
          detail="Registros laborales"
          tone="teal"
          active={activeSummary === 'asistencia'}
          onClick={() => setActiveSummary('asistencia')}
        />
        <SummaryCard
          title="Vacaciones"
          value={resumen.vacacion}
          detail="Periodos aprobados o pendientes"
          tone="gold"
          active={activeSummary === 'vacacion'}
          onClick={() => setActiveSummary('vacacion')}
        />
        <SummaryCard
          title="Incapacidades"
          value={resumen.incapacidad}
          detail="Casos médicos del mes"
          tone="danger"
          active={activeSummary === 'incapacidad'}
          onClick={() => setActiveSummary('incapacidad')}
        />
      </section>

      <section className="calendar-layout">
        <div className="calendar-month-card">
          <div className="calendar-month-header">
            <button type="button" onClick={() => moveMonth(-1)}>
              ‹
            </button>

            <div>
              <h2>{formatMonthTitle(currentMonth)}</h2>
              <p>
                {formatDateRange(range.inicio, range.fin)}
              </p>
            </div>

            <button type="button" onClick={() => moveMonth(1)}>
              ›
            </button>
          </div>

          <div className="calendar-week-row">
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {monthCells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} className="calendar-day empty" />;
              }

              const count = eventsByDate[cell.date]?.length || 0;
              const isSelected = selectedDate === cell.date;
              const isToday = todayKey === cell.date;

              return (
                <button
                  key={cell.date}
                  className={[
                    'calendar-day',
                    isSelected ? 'selected' : '',
                    isToday ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setSelectedDate(cell.date);
                    setActiveSummary('selection');
                  }}
                  type="button"
                >
                  <strong>{cell.day}</strong>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="calendar-events-panel">
          <div className="calendar-events-header">
            <div>
              <span>{getSummaryTitle(activeSummary)}</span>
              <h2>
                {activeSummary === 'selection' && selectedDate
                  ? formatDate(selectedDate)
                  : formatMonthTitle(currentMonth)}
              </h2>
            </div>

            {selectedDate && activeSummary === 'selection' ? (
              <button
                className="calendar-soft-btn"
                onClick={() => {
                  setSelectedDate(null);
                  setActiveSummary('all');
                }}
                type="button"
              >
                Ver mes
              </button>
            ) : null}
          </div>

          {loading && <p className="module-info">Cargando calendario...</p>}
          {error && <p className="module-error">{error}</p>}

          {!loading && !error && filteredEvents.length === 0 ? (
            <div className="empty-state-card">
              <h3>Sin registros</h3>
              <p>No hay eventos para esta selección.</p>
            </div>
          ) : null}

          <div className="calendar-event-list">
            {filteredEvents.map((item) => (
              <button
                key={`${item.id}-${activeSummary}`}
                className={`calendar-event-card ${item.tipo}`}
                onClick={() => setSelectedEvent(item)}
                type="button"
              >
                <span className="calendar-event-code">{getTipoCode(item.tipo)}</span>

                <div>
                  <small>{getTipoLabel(item.tipo)}</small>
                  <strong>{item.titulo}</strong>
                  <p>{formatDateRange(item.fecha_inicio, item.fecha_fin)}</p>
                  {scope === 'admin' && (
                    <em>
                      {item.empleado_nombre}
                      {item.empleado_correo ? ` · ${item.empleado_correo}` : ''}
                    </em>
                  )}
                </div>

                <span className="calendar-status-pill">{getEstadoLabel(item.estado)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedEvent && (
        <div
          className="calendar-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="calendar-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calendar-modal-header">
              <span className={`calendar-event-code ${selectedEvent.tipo}`}>
                {getTipoCode(selectedEvent.tipo)}
              </span>

              <button
                className="calendar-soft-btn"
                onClick={() => setSelectedEvent(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <span className="calendar-modal-type">{getTipoLabel(selectedEvent.tipo)}</span>
            <h2>{selectedEvent.titulo}</h2>

            <div className="calendar-modal-meta">
              <strong>{formatDateRange(selectedEvent.fecha_inicio, selectedEvent.fecha_fin)}</strong>
              <span>{getEstadoLabel(selectedEvent.estado)}</span>
            </div>

            {scope === 'admin' && (
              <div className="calendar-detail-box">
                <small>Empleado</small>
                <p>
                  {selectedEvent.empleado_nombre}
                  {selectedEvent.empleado_correo ? ` · ${selectedEvent.empleado_correo}` : ''}
                </p>
              </div>
            )}

            <div className="calendar-detail-box">
              <small>Descripción</small>
              <p>{selectedEvent.descripcion || 'Sin descripción'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  tone,
  active,
  onClick,
}: {
  title: string;
  value: number;
  detail: string;
  tone: 'blue' | 'teal' | 'gold' | 'danger';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`calendar-summary-card ${tone} ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="calendar-summary-accent" />
      <strong>{value}</strong>
      <h3>{title}</h3>
      <p>{detail}</p>
    </button>
  );
}
