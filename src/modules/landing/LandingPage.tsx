import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../app/auth/AuthContext';
import {
  landingLanguages,
  landingTranslations,
  LandingLanguage,
} from './landingTranslations';

const LANGUAGE_KEY = 'smart_rh_public_language';
const THEME_KEY = 'smart_rh_theme';
const AUTH_STORAGE_KEY = 'rrhh_auth';

const contactMessages: Record<
  LandingLanguage,
  {
    required: string;
    sending: string;
    success: string;
    error: string;
  }
> = {
  es: {
    required: 'Completa todos los campos del formulario.',
    sending: 'Enviando...',
    success: 'Mensaje enviado correctamente. Te contactaremos pronto.',
    error: 'Error al enviar el mensaje.',
  },
  en: {
    required: 'Please complete all form fields.',
    sending: 'Sending...',
    success: 'Message sent successfully. We will contact you soon.',
    error: 'Error sending the message.',
  },
  pt: {
    required: 'Preencha todos os campos do formulário.',
    sending: 'Enviando...',
    success: 'Mensagem enviada com sucesso. Entraremos em contato em breve.',
    error: 'Erro ao enviar a mensagem.',
  },
  zh: {
    required: '请填写表单中的所有字段。',
    sending: '发送中...',
    success: '消息已成功发送。我们会尽快联系您。',
    error: '发送消息时出错。',
  },
  fr: {
    required: 'Veuillez remplir tous les champs du formulaire.',
    sending: 'Envoi...',
    success: 'Message envoyé correctement. Nous vous contacterons bientôt.',
    error: 'Erreur lors de l’envoi du message.',
  },
  it: {
    required: 'Completa tutti i campi del modulo.',
    sending: 'Invio...',
    success: 'Messaggio inviato correttamente. Ti contatteremo presto.',
    error: 'Errore durante l’invio del messaggio.',
  },
};

function getInitialLanguage(): LandingLanguage {
  const saved = localStorage.getItem(LANGUAGE_KEY) as LandingLanguage | null;
  if (saved && landingTranslations[saved]) return saved;
  return 'es';
}

function getInitialTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const secureLandingHandled = useRef(false);

  const [language, setLanguage] = useState<LandingLanguage>(getInitialLanguage);
  const [theme, setTheme] = useState(getInitialTheme);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  const t = useMemo(() => landingTranslations[language], [language]);
  const contactText = useMemo(() => contactMessages[language], [language]);

  /*
    Protección de sesión:
    Si el usuario vuelve a la LandingPage estando autenticado,
    se cierra la sesión automáticamente porque "/" es una zona pública.
  */
  useEffect(() => {
    if (!user || secureLandingHandled.current) return;

    secureLandingHandled.current = true;

    logout();
    localStorage.removeItem(AUTH_STORAGE_KEY);

    navigate('/', { replace: true });

    setTimeout(() => {
      window.history.replaceState(null, '', '/');
    }, 0);
  }, [user, logout, navigate]);

  /*
    Protección extra contra back/forward cache del navegador:
    Si el navegador restaura la LandingPage desde caché y aún existe sesión,
    se elimina para evitar regresar al portal con sesión activa.
  */
  useEffect(() => {
    const handlePageShow = () => {
      const hasStoredSession = !!localStorage.getItem(AUTH_STORAGE_KEY);

      if (hasStoredSession) {
        logout();
        localStorage.removeItem(AUTH_STORAGE_KEY);
        window.history.replaceState(null, '', '/');
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [logout]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const changeLanguage = (value: string) => {
    const next = value as LandingLanguage;

    if (landingTranslations[next]) {
      setLanguage(next);
      setContactError('');
      setContactSuccess('');
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (contactLoading) return;

    setContactError('');
    setContactSuccess('');

    if (
      !contactName.trim() ||
      !contactEmail.trim() ||
      !contactCompany.trim() ||
      !contactMessage.trim()
    ) {
      setContactError(contactText.required);
      return;
    }

    try {
      setContactLoading(true);

      const { data } = await api.post('/contacto', {
        nombre: contactName.trim(),
        correo: contactEmail.trim(),
        empresa: contactCompany.trim(),
        mensaje: contactMessage.trim(),
      });

      if (!data?.ok) {
        setContactError(data?.message || contactText.error);
        return;
      }

      setContactSuccess(contactText.success);
      setContactName('');
      setContactEmail('');
      setContactCompany('');
      setContactMessage('');
    } catch (error: any) {
      setContactError(error?.response?.data?.message || contactText.error);
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="public-page public-page-premium">
      <header className="public-header public-header-premium">
        <a href="#inicio" className="public-brand public-brand-premium">
          <div className="public-logo public-logo-premium">SRH</div>

          <div>
            <strong>SMART RH</strong>
            <span>Human Resources Suite</span>
          </div>
        </a>

        <nav className="public-nav public-nav-premium">
          <a href="#inicio">{t.nav.home}</a>
          <a href="#nosotros">{t.nav.about}</a>
          <a href="#servicios">{t.nav.services}</a>
          <a href="#historia">{t.nav.story}</a>
          <a href="#valores">{t.nav.values}</a>
          <a href="#contacto">{t.nav.contact}</a>
        </nav>

        <div className="public-actions public-actions-premium">
          <label className="public-language public-language-premium">
            <span>{t.languageLabel}</span>

            <select value={language} onChange={(event) => changeLanguage(event.target.value)}>
              {landingLanguages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.short} · {item.label}
                </option>
              ))}
            </select>
          </label>

          <button className="public-theme-btn" type="button" onClick={toggleTheme}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? '' : ''}
          </button>

          <Link to="/admin/acceso" className="public-login-btn public-login-btn-premium">
            {t.nav.login}
          </Link>
        </div>
      </header>

      <main>
        <section id="inicio" className="public-hero public-hero-premium">
          <div className="public-hero-copy public-hero-copy-premium">
            <span className="public-eyebrow">{t.hero.badge}</span>

            <h1>
              {t.hero.title}{' '}
              <strong>{t.hero.highlight}</strong>
            </h1>

            <p>{t.hero.description}</p>

            <div className="public-hero-actions">
              <a href="#servicios" className="public-primary-btn">
                {t.hero.primaryAction}
              </a>

              <Link to="/admin/acceso" className="public-secondary-btn">
                {t.hero.secondaryAction}
              </Link>
            </div>

            <div className="public-trust-row">
              <div>
                <strong>Web</strong>
                <span>Portal administrativo</span>
              </div>

              <div>
                <strong>App</strong>
                <span>Experiencia móvil</span>
              </div>

              <div>
                <strong>ETL</strong>
                <span>Análisis de datos</span>
              </div>
            </div>
          </div>

          <aside className="public-hero-panel public-hero-panel-premium">
            <div className="public-panel-glow" />

            <div className="public-hero-panel-top">
              <span>SMART RH</span>
              <strong>LIVE</strong>
            </div>

            <div className="public-dashboard-preview">
              <div className="public-preview-header">
                <div>
                  <small>{t.hero.panelSubtitle}</small>
                  <h2>{t.hero.panelTitle}</h2>
                </div>

                <div className="public-preview-icon">RH</div>
              </div>

              <div className="public-preview-metrics">
                <div>
                  <span>100%</span>
                  <small>Control</small>
                </div>

                <div>
                  <span>24/7</span>
                  <small>Acceso</small>
                </div>

                <div>
                  <span>360°</span>
                  <small>Gestión</small>
                </div>
              </div>

              <div className="public-panel-list">
                {t.hero.panelItems.map((item) => (
                  <div key={item}>
                    <span />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="public-stats">
          {t.stats.map((item) => (
            <article key={item.label} className="public-stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </section>

        <section id="nosotros" className="public-section public-about">
          <div className="public-section-header">
            <span>{t.about.eyebrow}</span>
            <h2>{t.about.title}</h2>
            <p>{t.about.description}</p>
          </div>

          <div className="public-about-grid">
            {t.about.cards.map((card) => (
              <article key={card.title} className="public-info-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="servicios" className="public-section">
          <div className="public-section-header">
            <span>{t.services.eyebrow}</span>
            <h2>{t.services.title}</h2>
            <p>{t.services.description}</p>
          </div>

          <div className="public-services-grid">
            {t.services.items.map((item, index) => (
              <article key={item.title} className="public-service-card">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="historia" className="public-story">
          <div>
            <span className="public-eyebrow">{t.story.eyebrow}</span>
            <h2>{t.story.title}</h2>
            <p>{t.story.description}</p>
          </div>

          <div className="public-story-mark">
            <span>RH</span>
          </div>
        </section>

        <section className="public-mission-grid">
          <article>
            <span>01</span>
            <h3>{t.mission.missionTitle}</h3>
            <p>{t.mission.missionText}</p>
          </article>

          <article>
            <span>02</span>
            <h3>{t.mission.visionTitle}</h3>
            <p>{t.mission.visionText}</p>
          </article>

          <article>
            <span>03</span>
            <h3>{t.mission.purposeTitle}</h3>
            <p>{t.mission.purposeText}</p>
          </article>
        </section>

        <section id="valores" className="public-section">
          <div className="public-section-header">
            <span>{t.values.eyebrow}</span>
            <h2>{t.values.title}</h2>
          </div>

          <div className="public-values-grid">
            {t.values.items.map((item) => (
              <div key={item} className="public-value-pill">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="contacto" className="public-contact">
          <div className="public-contact-copy">
            <span className="public-eyebrow">{t.contact.eyebrow}</span>
            <h2>{t.contact.title}</h2>
            <p>{t.contact.description}</p>

            <div className="public-location-card">
              <h3>{t.contact.locationTitle}</h3>
              <p>Universidad Tecnológica del Valle de Toluca</p>
              <small>{t.contact.schedule}</small>
            </div>
          </div>

          <form className="public-contact-form" onSubmit={submitContact}>
            <input
              placeholder={t.contact.name}
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />

            <input
              type="email"
              placeholder={t.contact.email}
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />

            <input
              placeholder={t.contact.company}
              value={contactCompany}
              onChange={(event) => setContactCompany(event.target.value)}
            />

            <textarea
              placeholder={t.contact.message}
              rows={5}
              value={contactMessage}
              onChange={(event) => setContactMessage(event.target.value)}
            />

            <button type="submit" disabled={contactLoading}>
              {contactLoading ? contactText.sending : t.contact.button}
            </button>

            {contactError && <p className="public-contact-error">{contactError}</p>}
            {contactSuccess && <p className="public-contact-success">{contactSuccess}</p>}
          </form>

          <div className="public-map-card">
            <iframe
              title="SMART RH Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.663220995932!2d-99.47859472316233!3d19.34041488191932!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d20a1464000001%3A0x1c254456341588a0!2sUniversidad%20Tecnol%C3%B3gica%20del%20Valle%20de%20Toluca!5e0!3m2!1ses-419!2smx!4v1782094748192!5m2!1ses-419!2smx"
              loading="lazy"
            />
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div>
          <strong>SMART RH</strong>
          <p>{t.footer.description}</p>
        </div>

        <span>© 2026 SMART RH. {t.footer.rights}</span>
      </footer>
    </div>
  );
}