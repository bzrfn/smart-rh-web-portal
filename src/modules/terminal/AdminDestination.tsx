import {
  useState,
} from 'react';

import {
  Navigate,
  useNavigate,
} from 'react-router-dom';

import {
  useAuth,
} from '../../app/auth/AuthContext';

import {
  api,
} from '../../services/api';

import {
  setTerminalSessionMemory,
} from '../../services/terminalSessionMemory';

import './terminalExperience.css';


const AUTHORIZED_TERMINAL_ADMIN =
  'brandonbernal413@gmail.com';

const TERMINAL_ID =
  'terminal-asistencia-01';


type AuthenticatedUserLike = {
  correo?:
    string;

  email?:
    string;

  role?:
    string;

  rol?:
    string;

  roleName?:
    string;
};


type AuthContextLike = {
  user?:
    AuthenticatedUserLike |
    null;

  usuario?:
    AuthenticatedUserLike |
    null;

  loading?:
    boolean;

  isLoading?:
    boolean;
};


export default function AdminDestination() {
  const auth =
    useAuth() as unknown as
      AuthContextLike;

  const navigate =
    useNavigate();

  const [
    openingTerminal,
    setOpeningTerminal,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );

  const user =
    auth.user ??
    auth.usuario ??
    null;

  const loading =
    Boolean(
      auth.loading ??
      auth.isLoading ??
      false
    );

  const correo =
    String(
      user?.correo ??
      user?.email ??
      ''
    )
      .trim()
      .toLowerCase();

  const role =
    String(
      user?.role ??
      user?.rol ??
      user?.roleName ??
      ''
    )
      .trim()
      .toLowerCase();

  if (loading) {
    return (
      <main className="terminal-experience terminal-destination-page">
        <div className="terminal-loading-card">
          Verificando sesión administrativa…
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/admin/acceso"
        replace
      />
    );
  }

  if (
    role !==
      'admin' &&
    role !==
      'administrador'
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  if (
    correo !==
    AUTHORIZED_TERMINAL_ADMIN
  ) {
    return (
      <Navigate
        to="/portal"
        replace
      />
    );
  }

  async function openTerminal() {
    setOpeningTerminal(
      true
    );

    setError(
      ''
    );

    try {
      const {
        data,
      } =
        await api.post(
          '/auth/terminal-access/admin-session',
          {
            terminalId:
              TERMINAL_ID,
          }
        );

      const token =
        String(
          data?.token ??
          ''
        ).trim();

      const terminalId =
        String(
          data?.terminalId ??
          TERMINAL_ID
        ).trim();

      if (!token) {
        throw new Error(
          'El servidor no entregó una sesión de terminal válida.'
        );
      }

      setTerminalSessionMemory({
        token,
        terminalId,
        source:
          'admin-direct',
      });

      navigate(
        '/terminal',
        {
          replace:
            true,
        }
      );

    } catch (
      requestError:
        unknown
    ) {
      const errorLike =
        requestError as {
          response?: {
            data?: {
              message?:
                string;

              error?:
                string;
            };
          };

          message?:
            string;
        };

      setError(
        String(
          errorLike
            ?.response
            ?.data
            ?.message ??
          errorLike
            ?.response
            ?.data
            ?.error ??
          errorLike
            ?.message ??
          'No fue posible abrir la terminal QR.'
        )
      );

    } finally {
      setOpeningTerminal(
        false
      );
    }
  }

  return (
    <main className="terminal-experience terminal-destination-page">
      <section className="terminal-destination-shell">
        <header className="terminal-brand-header">
          <div>
            <span className="terminal-brand-kicker">
              SMART RH · ACCESO VERIFICADO
            </span>

            <h1>
              ¿A dónde quieres ingresar?
            </h1>

            <p>
              Tu contraseña y la verificación en dos pasos
              fueron confirmadas. Elige el entorno que
              necesitas utilizar.
            </p>
          </div>

          <div className="terminal-secure-pill">
            <span className="terminal-status-dot terminal-status-dot-online" />
            Sesión administrativa segura
          </div>
        </header>

        <div className="terminal-destination-account">
          <span>
            Administrador autenticado
          </span>

          <strong>
            {correo}
          </strong>
        </div>

        <section className="terminal-destination-grid">
          <button
            type="button"
            className="terminal-destination-card"
            onClick={
              () =>
                navigate(
                  '/portal',
                  {
                    replace:
                      true,
                  }
                )
            }
          >
            <span className="terminal-destination-icon">
              RH
            </span>

            <span className="terminal-destination-copy">
              <strong>
                Portal administrativo
              </strong>

              <span>
                Gestiona usuarios, asistencia, documentos,
                vacaciones, nómina, analítica y configuración.
              </span>

              <small>
                Administración general de SMART RH
              </small>
            </span>

            <span className="terminal-destination-arrow">
              →
            </span>
          </button>

          <button
            type="button"
            className="terminal-destination-card terminal-destination-card-primary"
            onClick={
              () =>
                void openTerminal()
            }
            disabled={
              openingTerminal
            }
          >
            <span className="terminal-destination-icon terminal-destination-icon-green">
              QR
            </span>

            <span className="terminal-destination-copy">
              <strong>
                Terminal QR de asistencia
              </strong>

              <span>
                Inicia una sesión exclusiva para mostrar
                el QR dinámico que escanean los empleados.
              </span>

              <small>
                Sesión separada del JWT administrativo
              </small>
            </span>

            <span className="terminal-destination-arrow">
              {openingTerminal
                ? '…'
                : '→'}
            </span>
          </button>
        </section>

        {error && (
          <div
            className="terminal-message terminal-message-error"
            role="alert"
          >
            <strong>
              No fue posible abrir la terminal.
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
