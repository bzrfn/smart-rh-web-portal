// Hook personalizado `useETL` para ejecutar el proceso ETL remoto
// y mantener el resultado en estado local y en `localStorage`.
import { useState } from 'react';
import { api } from '../services/api';
import { ETLReporteData } from '../types/etl';

// Clave usada en localStorage para persistir el último reporte ETL
const STORAGE_KEY = 'smart_rh_etl_report';

// Intenta cargar un reporte previamente almacenado en localStorage.
// Devuelve `ETLReporteData` o `null` si no hay dato válido.
function loadStoredReport(): ETLReporteData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    return JSON.parse(raw) as ETLReporteData;
  } catch {
    // Si ocurre cualquier error (p. ej. JSON inválido), se ignora y retorna null
    return null;
  }
}

export function useETL() {
  // Estado local del hook
  const [loading, setLoading] = useState(false); // indicador de carga
  // `result` se inicializa con el reporte almacenado si existe
  const [result, setResult] = useState<ETLReporteData | null>(() => loadStoredReport());
  const [error, setError] = useState<string | null>(null); // mensaje de error si aplica

  // Función pública para solicitar al backend que ejecute el ETL
  async function ejecutarETL() {
    setLoading(true);
    setError(null);

    try {
      // POST al endpoint que genera el reporte ETL
      const response = await api.post<{
        ok: boolean;
        message?: string;
        data: ETLReporteData;
      }>('/etl/reportes');

      // Si la API responde con ok=true, actualizamos estado y lo persistimos
      if (response.data.ok) {
        setResult(response.data.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data.data));
      } else {
        // Si la API devuelve ok=false, se muestra el mensaje proporcionado
        setError(response.data.message || 'Error desconocido');
      }
    } catch (err: any) {
      // Manejo de errores de red o respuesta inesperada
      setError(err?.response?.data?.message || err.message || 'Error ejecutando ETL');
    } finally {
      setLoading(false);
    }
  }

  // Elimina el reporte persistido en local y limpia el estado interno
  function limpiarReporteLocal() {
    localStorage.removeItem(STORAGE_KEY);
    setResult(null);
  }

  // Exponer funciones y estado al consumidor del hook
  return {
    ejecutarETL,
    limpiarReporteLocal,
    loading,
    result,
    error,
  };
}