import React, { createContext, useContext, useMemo, useState } from 'react';
import { setAuthToken } from '../../services/api';

type AuthUser = {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  role: string;
  foto_perfil_url?: string | null;
  credencial_url?: string | null;
  email_verificado?: boolean;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

type AuthCtx = AuthState & {
  setAuth: (data: { token: string; user: AuthUser }) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const STORAGE_KEY = 'rrhh_auth';

const Ctx = createContext<AuthCtx | null>(null);

function getInitialAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      setAuthToken(null);
      return { token: null, user: null };
    }

    const parsed = JSON.parse(raw);

    if (!parsed?.token || !parsed?.user) {
      localStorage.removeItem(STORAGE_KEY);
      setAuthToken(null);
      return { token: null, user: null };
    }

    setAuthToken(parsed.token);

    return {
      token: parsed.token,
      user: parsed.user,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialAuthState);

  const value = useMemo<AuthCtx>(
    () => ({
      ...state,

      setAuth: (data) => {
        const next = {
          token: data.token,
          user: data.user,
        };

        setAuthToken(data.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setState(next);
      },

      logout: () => {
        setAuthToken(null);
        localStorage.removeItem(STORAGE_KEY);
        setState({ token: null, user: null });
      },

      isAuthenticated: !!state.token && !!state.user,
    }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const context = useContext(Ctx);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}