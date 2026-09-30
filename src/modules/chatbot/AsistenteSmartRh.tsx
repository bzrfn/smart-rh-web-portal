import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';

type ChatbotAction = {
  label: string;
  target: string;
  scope: 'web' | 'mobile' | 'both';
};

type ChatbotResponse = {
  categoria: string;
  titulo: string;
  respuesta: string;
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: buildId(),
      author: 'assistant',
      text:
        'Hola. Soy el asistente de SMART RH. Puedo orientarte sobre asistencia, calendario, incapacidades, documentos, nomina, soporte y herramientas administrativas.',
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

  async function loadSuggestions() {
    try {
      const { data } = await api.get('/chatbot/sugerencias');
      setSuggestions(Array.isArray(data?.sugerencias) ? data.sugerencias : []);
    } catch {
      setSuggestions([
        '¿Cómo reviso mi asistencia?',
        '¿Dónde consulto mi calendario laboral?',
        '¿Cómo levanto un ticket de soporte?',
      ]);
    }
  }

  useEffect(() => {
    loadSuggestions();
  }, []);

  async function sendMessage(nextMessage?: string) {
    const cleanMessage = String(nextMessage || message).trim();

    if (!cleanMessage || loading) return;

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
      });

      const response = data?.respuesta as ChatbotResponse;

      setMessages((current) => [
        ...current,
        {
          id: buildId(),
          author: 'assistant',
          text: response?.respuesta || 'No pude generar una respuesta segura.',
          response,
        },
      ]);

      if (Array.isArray(response?.sugerencias)) {
        setSuggestions(response.sugerencias);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo contactar al asistente SMART RH.'
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
        crear_ticket: true,
      });

      const ticketId = data?.ticket?._id;

      setMessages((current) => [
        ...current,
        {
          id: buildId(),
          author: 'assistant',
          text: ticketId
            ? `Ticket creado correctamente. Folio: ${ticketId}. Puedes darle seguimiento desde Soporte.`
            : 'La solicitud fue enviada a soporte.',
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
    <div className="assistant-page">
      <section className="assistant-hero">
        <div>
          <p className="assistant-eyebrow">Cambio #6</p>
          <h2>Asistente SMART RH</h2>
          <p>
            Consulta guiada por rol para resolver dudas operativas y escalar
            casos a soporte cuando se requiera seguimiento administrativo.
          </p>
        </div>

        <div className="assistant-context-card">
          <span>Sesión activa</span>
          <strong>{userName || 'Usuario SMART RH'}</strong>
          <small>{user?.role || 'empleado'}</small>
        </div>
      </section>

      <section className="assistant-layout">
        <div className="assistant-chat-card">
          <div className="assistant-chat-header">
            <div>
              <p className="assistant-eyebrow">Conversación</p>
              <h3>Centro de ayuda inteligente</h3>
            </div>
            <Link className="assistant-support-link" to="/portal/soporte">
              Ver soporte
            </Link>
          </div>

          <div className="assistant-messages">
            {messages.map((item) => (
              <article
                key={item.id}
                className={`assistant-message ${item.author}`}
              >
                <p>{item.text}</p>

                {item.response?.acciones?.some(isWebAction) ? (
                  <div className="assistant-actions">
                    {item.response.acciones.filter(isWebAction).map((action) => (
                      <Link
                        key={`${item.id}-${action.label}`}
                        to={getWebTarget(action.target)}
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            {loading ? (
              <article className="assistant-message assistant">
                <p>Consultando conocimiento de SMART RH...</p>
              </article>
            ) : null}
          </div>

          {error ? <p className="assistant-error">{error}</p> : null}

          <form className="assistant-input-row" onSubmit={submit}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu duda sobre SMART RH..."
            />
            <button type="submit" disabled={loading || !message.trim()}>
              Enviar
            </button>
          </form>
        </div>

        <aside className="assistant-side">
          <div className="assistant-side-card">
            <p className="assistant-eyebrow">Sugerencias</p>
            <h3>Preguntas frecuentes</h3>
            <div className="assistant-suggestions">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => sendMessage(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="assistant-side-card">
            <p className="assistant-eyebrow">Escalamiento</p>
            <h3>Crear ticket</h3>
            <p>
              Si la respuesta no resuelve el caso, registra la consulta como
              ticket de soporte con el contexto del asistente.
            </p>
            <button
              className="assistant-ticket-btn"
              type="button"
              onClick={createTicket}
              disabled={!lastQuestion || ticketLoading}
            >
              {ticketLoading ? 'Creando...' : 'Crear ticket con contexto'}
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
