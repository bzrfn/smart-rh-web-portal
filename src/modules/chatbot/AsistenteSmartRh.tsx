import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

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

function buildId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isWebAction(action: ChatbotAction) {
  return action.scope === 'web' || action.scope === 'both';
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: buildId(),
      author: 'assistant',
      text:
        'Hola, soy Max. Cuentame que intentas resolver en SMART RH y te ayudo con pasos concretos.',
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
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

  async function loadSuggestions() {
    try {
      const { data } = await api.get('/chatbot/sugerencias');
      setSuggestions(Array.isArray(data?.sugerencias) ? data.sugerencias : []);
    } catch {
      setSuggestions([
        'Max, no puedo registrar mi asistencia',
        'Quiero revisar mi calendario laboral',
        'Necesito levantar un ticket',
      ]);
    }
  }

  useEffect(() => {
    loadSuggestions();
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

    setOpen(true);
    setError('');
    setMessage('');
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

      if (Array.isArray(response?.sugerencias)) {
        setSuggestions(response.sugerencias);
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
        <section className="max-assistant-panel" aria-label="Chat con Max">
          <header className="max-assistant-header">
            <div className="max-avatar">MX</div>
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

                {item.response?.acciones?.some(isWebAction) ? (
                  <div className="max-actions">
                    {item.response.acciones.filter(isWebAction).map((action) => (
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

          {error ? <p className="max-error">{error}</p> : null}

          {suggestions.length ? (
            <div className="max-suggestions">
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

          <form className="max-input-row" onSubmit={submit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu duda..."
              rows={2}
            />
            <button type="submit" disabled={loading || !message.trim()}>
              Enviar
            </button>
          </form>

          <button
            className="max-ticket-btn"
            type="button"
            onClick={createTicket}
            disabled={!lastQuestion || ticketLoading}
          >
            {ticketLoading ? 'Creando ticket...' : 'Crear ticket con contexto'}
          </button>
        </section>
      ) : null}

      <button
        className="max-floating-btn"
        type="button"
        aria-label="Abrir Max"
        onClick={() => setOpen(true)}
      >
        <span>MX</span>
        <small>Max</small>
      </button>
    </div>
  );
}
