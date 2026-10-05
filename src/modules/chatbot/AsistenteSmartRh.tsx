import { CSSProperties, FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';
import maxAssistantIcon from '../../assets/max-touch-icon.svg';

const MAX_PORTAL_HISTORY_KEY = 'smart-rh:max:portal-history:v1';
const MAX_PORTAL_SESSIONS_KEY = 'smart-rh:max:portal-sessions:v1';
const MAX_CHAT_HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CHAT_HISTORY_LIMIT = 12;

type ChatbotAction = {
  label: string;
  target: string;
  scope: 'web' | 'mobile' | 'both';
};

type ChatbotResponse = {
  asistente?: 'Max';
  categoria: string;
  titulo: string;
  intent?: string;
  confianza?: 'alta' | 'media' | 'baja';
  respuesta: string;
  pasos?: string[];
  preguntas_seguimiento?: string[];
  acciones: ChatbotAction[];
  sugerencias: string[];
  requiere_escalamiento: boolean;
  puede_crear_ticket: boolean;
};

type Message = {
  id: string;
  author: 'user' | 'assistant';
  text: string;
  response?: ChatbotResponse;
};

type MaxChatSession = {
  id: string;
  title: string;
  savedAt: number;
  messages: Message[];
};

type FloatingPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const POSITION_STORAGE_KEY = 'smart_rh_max_position';
const BUTTON_SIZE = 60;
const EDGE_GAP = 24;
const PANEL_GAP = 16;
const PANEL_WIDTH = 860;

function buildId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildWelcomeMessage(): Message {
  return {
    id: buildId(),
    author: 'assistant',
    text:
      'Hola, soy Max. Cuentame que necesitas resolver en SMART RH y lo revisamos paso a paso.',
  };
}

function buildChatTitle(messages: Message[]) {
  const firstQuestion = messages.find((item) => item.author === 'user')?.text;
  const title = String(firstQuestion || 'Nuevo chat').trim();

  return title.length > 54 ? `${title.slice(0, 51)}...` : title;
}

function buildChatSession(messages: Message[] = [buildWelcomeMessage()]): MaxChatSession {
  return {
    id: buildId(),
    title: buildChatTitle(messages),
    savedAt: Date.now(),
    messages,
  };
}

function isFreshSession(session: MaxChatSession) {
  return Date.now() - Number(session.savedAt || 0) <= MAX_CHAT_HISTORY_TTL_MS;
}

function persistChatSessions(activeSessionId: string, sessions: MaxChatSession[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    MAX_PORTAL_SESSIONS_KEY,
    JSON.stringify({ activeSessionId, sessions })
  );
  window.localStorage.removeItem(MAX_PORTAL_HISTORY_KEY);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultPosition(): FloatingPosition {
  if (typeof window === 'undefined') {
    return { x: 24, y: 24 };
  }

  return {
    x: window.innerWidth - BUTTON_SIZE - 24,
    y: window.innerHeight - BUTTON_SIZE - 24,
  };
}

function clampPosition(position: FloatingPosition): FloatingPosition {
  if (typeof window === 'undefined') return position;

  return {
    x: clamp(
      position.x,
      EDGE_GAP,
      Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP)
    ),
    y: clamp(
      position.y,
      EDGE_GAP,
      Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP)
    ),
  };
}

function snapPositionToSide(position: FloatingPosition): FloatingPosition {
  if (typeof window === 'undefined') return position;

  const leftX = EDGE_GAP;
  const rightX = Math.max(
    EDGE_GAP,
    window.innerWidth - BUTTON_SIZE - EDGE_GAP
  );
  const centerX = position.x + BUTTON_SIZE / 2;

  return clampPosition({
    ...position,
    x: centerX < window.innerWidth / 2 ? leftX : rightX,
  });
}

function getInitialPosition(): FloatingPosition {
  if (typeof window === 'undefined') {
    return getDefaultPosition();
  }

  try {
    const saved = window.localStorage.getItem(POSITION_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;

    if (
      parsed &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return clampPosition(parsed);
    }
  } catch {
    return getDefaultPosition();
  }

  return getDefaultPosition();
}

function persistPosition(position: FloatingPosition) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    POSITION_STORAGE_KEY,
    JSON.stringify(position)
  );
}

function isWebAction(action: ChatbotAction) {
  return action.scope === 'web' || action.scope === 'both';
}

function isCreateTicketAction(action: ChatbotAction) {
  const label = action.label.toLowerCase();

  return label.includes('crear') && label.includes('ticket');
}

function isTicketConfirmation(text: string) {
  return /cree el ticket con folio|creé el ticket con folio|envie la consulta a soporte|envié la consulta a soporte/i.test(
    text
  );
}

function getWebTarget(target: string) {
  if (target.startsWith('/')) return target;

  const map: Record<string, string> = {
    Asistencia: '/portal/asistencia',
    CalendarioLaboral: '/portal/calendario',
    Vacaciones: '/portal/vacaciones',
    Incapacidades: '/portal/incapacidades',
    Documentos: '/portal/documentacion',
    Contratos: '/portal/contratos',
    Nomina: '/portal/nomina',
    Soporte: '/portal/soporte',
    AdminUsuarios: '/portal/usuarios',
  };

  return map[target] || '/portal';
}

export default function AsistenteSmartRh() {
  const { user } = useAuth();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<FloatingPosition>(
    () => getInitialPosition()
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => [
    buildWelcomeMessage(),
  ]);
  const [activeSessionId, setActiveSessionId] = useState(() => buildId());
  const [chatSessions, setChatSessions] = useState<MaxChatSession[]>([]);
  const [maxHistoryReady, setMaxHistoryReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    if (maxHistoryReady || typeof window === 'undefined') return;

    try {
      const sessionsRaw = window.localStorage.getItem(MAX_PORTAL_SESSIONS_KEY);
      if (sessionsRaw) {
        const payload = JSON.parse(sessionsRaw) as {
          activeSessionId?: string;
          sessions?: MaxChatSession[];
        };
        const sessions = Array.isArray(payload.sessions)
          ? payload.sessions.filter(isFreshSession).slice(0, MAX_CHAT_HISTORY_LIMIT)
          : [];

        if (sessions.length > 0) {
          const activeSession =
            sessions.find((item) => item.id === payload.activeSessionId) ||
            sessions[0];

          setChatSessions(sessions);
          setActiveSessionId(activeSession.id);
          setMessages(activeSession.messages);
          return;
        }
      }

      const raw = window.localStorage.getItem(MAX_PORTAL_HISTORY_KEY);
      if (!raw) return;

      const payload = JSON.parse(raw) as { savedAt?: number; messages?: unknown[] };
      const isFresh = typeof payload.savedAt === 'number' && Date.now() - payload.savedAt <= MAX_CHAT_HISTORY_TTL_MS;

      if (isFresh && Array.isArray(payload.messages) && payload.messages.length > 0) {
        const migratedSession = buildChatSession(payload.messages as Message[]);
        setChatSessions([migratedSession]);
        setActiveSessionId(migratedSession.id);
        setMessages(migratedSession.messages);
      } else {
        window.localStorage.removeItem(MAX_PORTAL_HISTORY_KEY);
      }
    } catch {
      window.localStorage.removeItem(MAX_PORTAL_HISTORY_KEY);
      window.localStorage.removeItem(MAX_PORTAL_SESSIONS_KEY);
    } finally {
      setMaxHistoryReady(true);
    }
  }, [maxHistoryReady]);

  useEffect(() => {
    if (!maxHistoryReady || typeof window === 'undefined') return;

    try {
      const currentSession: MaxChatSession = {
        id: activeSessionId,
        title: buildChatTitle(messages),
        savedAt: Date.now(),
        messages,
      };
      const nextSessions = [
        currentSession,
        ...chatSessions.filter((item) => item.id !== activeSessionId),
      ]
        .filter(isFreshSession)
        .slice(0, MAX_CHAT_HISTORY_LIMIT);

      setChatSessions(nextSessions);
      persistChatSessions(activeSessionId, nextSessions);
    } catch {
      // El historial local no debe bloquear el chat.
    }
  }, [activeSessionId, maxHistoryReady, messages]);

  const maxHistorySelectors = chatSessions.filter((session) =>
    session.messages.some((item) => item.author === 'user') ||
    session.id === activeSessionId
  );
  const selectedHistorySession = selectedHistoryId
    ? chatSessions.find((session) => session.id === selectedHistoryId) || null
    : null;
  const maxHistoryPreview = selectedHistorySession?.messages || [];

  const resetComposerState = () => {
    setMessage('');
    setLastQuestion('');
    setError('');
    setShowSuggestions(true);
    setSelectedHistoryId(null);
  };

  const startNewChat = () => {
    const session = buildChatSession();

    setActiveSessionId(session.id);
    setMessages(session.messages);
    setChatSessions((current) => [session, ...current].slice(0, MAX_CHAT_HISTORY_LIMIT));
    resetComposerState();
    setHistoryOpen(false);
  };

  const openChatSession = (session: MaxChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setSelectedHistoryId(session.id);
    setMessage('');
    setLastQuestion('');
    setError('');
    setShowSuggestions(false);
  };

  const deleteChatSession = (sessionId: string) => {
    const remainingSessions = chatSessions.filter((session) => session.id !== sessionId);
    const fallbackSession = remainingSessions[0] || buildChatSession();
    const nextSessions = remainingSessions.length ? remainingSessions : [fallbackSession];

    setChatSessions(nextSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(fallbackSession.id);
      setMessages(fallbackSession.messages);
      resetComposerState();
    }

    persistChatSessions(
      activeSessionId === sessionId ? fallbackSession.id : activeSessionId,
      nextSessions
    );

    if (selectedHistoryId === sessionId) {
      setSelectedHistoryId(null);
    }
  };

  const clearAllChatSessions = () => {
    const session = buildChatSession();

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(MAX_PORTAL_HISTORY_KEY);
      window.localStorage.removeItem(MAX_PORTAL_SESSIONS_KEY);
    }

    setChatSessions([session]);
    setActiveSessionId(session.id);
    setMessages(session.messages);
    persistChatSessions(session.id, [session]);
    resetComposerState();
  };
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');
  const [error, setError] = useState('');

  const userName = useMemo(
    () => `${user?.nombre || ''} ${user?.apellido || ''}`.trim(),
    [user?.apellido, user?.nombre]
  );

  const historyPayload = useMemo(
    () =>
      messages.slice(-6).map((item) => ({
        author: item.author,
        text: item.text,
      })),
    [messages]
  );

  const hasCreatedTicket = useMemo(
    () =>
      messages.some(
        (item) => item.author === 'assistant' && isTicketConfirmation(item.text)
      ),
    [messages]
  );

  const canCreateContextTicket = useMemo(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((item) => item.author === 'assistant' && item.response);

    return Boolean(
      lastQuestion &&
        !hasCreatedTicket &&
        latestAssistant?.response?.requiere_escalamiento
    );
  }, [hasCreatedTicket, lastQuestion, messages]);

  async function loadSuggestions() {
    try {
      const { data } = await api.get('/chatbot/sugerencias');
      setSuggestions(Array.isArray(data?.sugerencias) ? data.sugerencias : []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([
        'No puedo registrar asistencia',
        'Ver calendario laboral',
        'Crear ticket de soporte',
      ]);
      setShowSuggestions(true);
    }
  }

  useEffect(() => {
    loadSuggestions();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setButtonPosition((current) => {
        const next = clampPosition(current);
        persistPosition(next);
        return next;
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading, open]);

  async function sendMessage(nextMessage?: string) {
    const cleanMessage = String(nextMessage || message).trim();

    if (!cleanMessage || loading) return;

    const isQuickSuggestion = Boolean(nextMessage) && suggestions.some(
      (item) => item.trim().toLowerCase() === cleanMessage.toLowerCase()
    );

    setOpen(true);
    setError('');
    setMessage('');
    setShowSuggestions(isQuickSuggestion);
    setLastQuestion(cleanMessage);
    setMessages((current) => [
      ...current,
      {
        id: buildId(),
        author: 'user',
        text: cleanMessage,
      },
    ]);

    try {
      setLoading(true);

      const { data } = await api.post('/chatbot/mensaje', {
        mensaje: cleanMessage,
        historial: historyPayload,
        canal: 'web',
      });

      const response = data?.respuesta as ChatbotResponse;

      setMessages((current) => [
        ...current,
        {
          id: buildId(),
          author: 'assistant',
          text:
            response?.respuesta ||
            'No pude generar una respuesta segura. Dame un poco mas de contexto.',
          response,
        },
      ]);

      if (isQuickSuggestion && Array.isArray(response?.sugerencias)) {
        setSuggestions(response.sugerencias);
      } else if (!isQuickSuggestion) {
        setSuggestions([]);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo contactar a Max. Revisa conexion o intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function createTicket() {
    if (!lastQuestion || ticketLoading) return;

    try {
      setTicketLoading(true);
      setError('');

      const { data } = await api.post('/chatbot/mensaje', {
        mensaje: lastQuestion,
        historial: historyPayload,
        canal: 'web',
        crear_ticket: true,
      });

      const ticketId = data?.ticket?._id;

      setMessages((current) => [
        ...current,
        {
          id: buildId(),
          author: 'assistant',
          text: ticketId
            ? `Listo. Cree el ticket con folio ${ticketId}. Puedes darle seguimiento desde Soporte.`
            : 'Listo. Envie la consulta a soporte con el contexto disponible.',
        },
      ]);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo crear el ticket de soporte.'
      );
    } finally {
      setTicketLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    sendMessage();
  }

  const buttonStyle = useMemo<CSSProperties>(
    () => ({
      left: `${buttonPosition.x}px`,
      top: `${buttonPosition.y}px`,
    }),
    [buttonPosition.x, buttonPosition.y]
  );

  const panelStyle = useMemo<CSSProperties>(() => {
    if (typeof window === 'undefined') return {};

    const panelEdgeGap = window.innerWidth <= 720 ? 14 : 34;
    const safeWidth = Math.max(300, window.innerWidth - panelEdgeGap * 2);
    const safeHeight = Math.max(360, window.innerHeight - panelEdgeGap * 2);
    const width = Math.min(PANEL_WIDTH, safeWidth);
    const height = Math.min(760, safeHeight);
    const opensLeft =
      buttonPosition.x + BUTTON_SIZE / 2 > window.innerWidth / 2;
    const rawLeft = opensLeft
      ? buttonPosition.x + BUTTON_SIZE + PANEL_GAP - width
      : buttonPosition.x - PANEL_GAP;
    const rawTop = buttonPosition.y + BUTTON_SIZE - height;
    const left = clamp(
      rawLeft,
      panelEdgeGap,
      Math.max(panelEdgeGap, window.innerWidth - width - panelEdgeGap)
    );
    const top = clamp(
      rawTop,
      panelEdgeGap,
      Math.max(panelEdgeGap, window.innerHeight - height - panelEdgeGap)
    );

    return {
      width: `${width}px`,
      height: `${height}px`,
      left: `${left}px`,
      top: `${top}px`,
    };
  }, [buttonPosition.x, buttonPosition.y]);

  function handleButtonPointerDown(
    event: PointerEvent<HTMLButtonElement>
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      offsetX: event.clientX - buttonPosition.x,
      offsetY: event.clientY - buttonPosition.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    });
  }

  function handleButtonPointerMove(
    event: PointerEvent<HTMLButtonElement>
  ) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const distance = Math.hypot(
      event.clientX - dragState.startX,
      event.clientY - dragState.startY
    );

    const next = clampPosition({
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY,
    });

    setButtonPosition(next);
    setDragState({
      ...dragState,
      moved: dragState.moved || distance > 5,
    });
  }

  function handleButtonPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    const clampedPosition = clampPosition(buttonPosition);
    const next = dragState.moved
      ? snapPositionToSide(clampedPosition)
      : clampedPosition;
    setButtonPosition(next);
    persistPosition(next);

    if (!dragState.moved) {
      setOpen(true);
    }

    setDragState(null);
  }

  return (
    <div className="max-assistant">
      {open ? (
        <button
          className="max-assistant-backdrop"
          type="button"
          aria-label="Cerrar Max"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <section
          className="max-assistant-panel"
          style={panelStyle}
          aria-label="Chat con Max"
        >
          <header className="max-assistant-header">
            <div className="max-avatar" aria-hidden="true">
              <img src={maxAssistantIcon} alt="" />
            </div>
            <div>
              <span>Asistente interno</span>
              <h2>Max</h2>
              <p>{userName || 'Usuario SMART RH'} · {user?.role || 'empleado'}</p>
            </div>
            <button
              className="max-close-btn"
              type="button"
              aria-label="Cerrar Max"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="max-messages" ref={messagesRef}>
            {messages.map((item) => (
              <article
                key={item.id}
                className={`max-message ${item.author}`}
              >
                <p>{item.text}</p>

                {item.response?.pasos?.length ? (
                  <ol className="max-steps">
                    {item.response.pasos.slice(0, 4).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                ) : null}

                {item.response?.acciones?.some((action) =>
                  isWebAction(action) &&
                  !(hasCreatedTicket && isCreateTicketAction(action))
                ) ? (
                  <div className="max-actions">
                    {item.response.acciones
                      .filter(
                        (action) =>
                          isWebAction(action) &&
                          !(hasCreatedTicket && isCreateTicketAction(action))
                      )
                      .map((action) => (
                        <Link
                          key={`${item.id}-${action.label}`}
                          to={getWebTarget(action.target)}
                          onClick={() => setOpen(false)}
                        >
                          {action.label}
                        </Link>
                      ))}
                  </div>
                ) : null}
              </article>
            ))}

            {loading ? (
              <article className="max-message assistant">
                <p>Max esta revisando el contexto...</p>
              </article>
            ) : null}
          </div>

          {historyOpen ? (
            <div className="max-history-panel" role="dialog" aria-label="Historial de Max">
              <div className="max-history-panel-header">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedHistoryId !== null) {
                      setSelectedHistoryId(null);
                      return;
                    }

                    setHistoryOpen(false);
                  }}
                >
                  {selectedHistoryId === null ? 'Cerrar' : 'Volver'}
                </button>
                <strong>{selectedHistoryId === null ? 'Historial' : 'Conversacion'}</strong>
                <span>7 dias</span>
              </div>
              {selectedHistoryId === null ? (
                <div className="max-history-selector-list">
                  {maxHistorySelectors.length ? (
                    maxHistorySelectors.map((session) => (
                      <div className="max-history-selector-row" key={session.id}>
                        <button
                          className="max-history-selector"
                          type="button"
                          onClick={() => openChatSession(session)}
                        >
                          <span>
                            {session.id === activeSessionId ? 'Chat actual' : 'Chat guardado'}
                          </span>
                          <p>{session.title}</p>
                          <strong>Ver conversacion</strong>
                        </button>
                        <button
                          className="max-history-delete-btn"
                          type="button"
                          aria-label={`Eliminar ${session.title}`}
                          title="Eliminar chat"
                          onClick={() => deleteChatSession(session.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="max-history-empty">Aun no hay consultas para mostrar.</p>
                  )}
                  {maxHistorySelectors.length ? (
                    <button
                      className="max-history-clear-btn"
                      type="button"
                      onClick={clearAllChatSessions}
                    >
                      Borrar historial
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="max-history-list">
                  {maxHistoryPreview.length ? (
                    maxHistoryPreview.map((item) => {
                      const entry = item as any;
                      const text = String(entry.content ?? entry.contenido ?? entry.text ?? entry.respuesta ?? '').trim();
                      const isUser = entry.author === 'user' || entry.role === 'user' || entry.autor === 'user';
                      if (!text) return null;

                      return (
                        <div
                          className={`max-history-item ${isUser ? 'user' : 'assistant'}`}
                          key={entry.id ?? text}
                        >
                          <span>{isUser ? 'Tu' : 'Max'}</span>
                          <p>{text}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="max-history-empty">Sin mensajes recientes.</p>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {showSuggestions && suggestions.length ? (
            <div className="max-suggestions" aria-label="Preguntas frecuentes">
              {suggestions.slice(0, 4).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => sendMessage(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          {error ? <p className="max-error">{error}</p> : null}

          <form className="max-input-row" onSubmit={submit}>
            <div className="max-composer-actions" aria-label="Acciones de Max">
              <button
                className="max-tool-btn"
                type="button"
                aria-label="Nuevo chat"
                title="Nuevo chat"
                onClick={startNewChat}
              >
                +
              </button>
              <button
                className={`max-tool-btn ${historyOpen ? 'is-active' : ''}`}
                type="button"
                aria-label="Abrir historial"
                title="Historial"
                onClick={() => {
                  setSelectedHistoryId(null);
                  setHistoryOpen((value) => !value);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 0 2.35-5.65" />
                  <path d="M4 5v5h5" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </button>
            </div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Preguntame..."
              rows={2}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              className="max-send-btn max-send-round"
              type="submit"
              aria-label="Enviar mensaje a Max"
              title="Enviar mensaje"
              disabled={loading || !message.trim()}
            >
              <svg className="max-send-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h12" />
                <path d="M13 7l5 5-5 5" />
              </svg>
            </button>
          </form>

          {canCreateContextTicket ? (
            <button
              className="max-ticket-btn"
              type="button"
              onClick={createTicket}
              disabled={ticketLoading}
            >
              {ticketLoading ? 'Creando ticket...' : 'Crear ticket con contexto'}
            </button>
          ) : null}
        </section>
      ) : null}

      <button
        className={`max-floating-btn ${open ? 'is-hidden' : ''} ${
          dragState?.moved ? 'is-dragging' : ''
        }`}
        type="button"
        aria-label="Abrir Max. Mantén presionado para moverlo."
        title="Max"
        style={buttonStyle}
        onPointerDown={handleButtonPointerDown}
        onPointerMove={handleButtonPointerMove}
        onPointerUp={handleButtonPointerUp}
        onPointerCancel={() => setDragState(null)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="max-floating-logo">
          <img src={maxAssistantIcon} alt="" />
        </span>
      </button>
    </div>
  );
}
