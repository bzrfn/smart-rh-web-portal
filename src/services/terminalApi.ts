import axios from 'axios';

export const TERMINAL_API_BASE_URL =
  import.meta.env?.VITE_API_URL ||
  'http://localhost:4000';

/*
 * Cliente deliberadamente separado del cliente HTTP del portal.
 *
 * No incorpora interceptores de la sesión administrativa.
 * No consulta localStorage.
 * No consulta sessionStorage.
 *
 * La sesión terminal se proporciona de forma explícita únicamente
 * cuando se solicita un QR.
 */
export const terminalApi =
  axios.create({
    baseURL:
      TERMINAL_API_BASE_URL,

    timeout:
      15000,
  });
