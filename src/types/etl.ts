// Tipos y estructuras usadas por el módulo ETL

// Nombres de las fuentes que puede procesar el ETL
export type ETLSourceName = 'usuarios' | 'nomina' | 'vacaciones';

// Representa una fuente configurable para el proceso ETL
export interface ETLSource {
  name: ETLSourceName;
}

// Metadatos sobre un archivo generado durante el proceso ETL
export interface ArchivoGenerado {
  name: string;
  filasProcesadas?: number; // cantidad de registros procesados en el archivo
  errores?: string[]; // lista opcional de errores encontrados
  tiempo?: number; // tiempo de procesamiento en milisegundos
}

// Elemento básico para representar datos en gráficos (nombre + valor)
export interface ChartItem {
  name: string;
  value: number;
}

// Resumen agregado del reporte ETL para mostrar KPIs generales
export interface ETLResumenReporte {
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosInactivos: number;
  totalNominas: number;
  totalPagadoNomina: number;
  totalBonos: number;
  totalDeducciones: number;
  promedioSalarioBase: number;
  totalSolicitudesVacaciones: number;
  vacacionesPendientes: number;
  vacacionesAprobadas: number;
  vacacionesRechazadas: number;
  totalDiasSolicitados: number;
}

// Estructura completa del reporte ETL que la API devuelve y que la UI consume
export interface ETLReporteData {
  generatedAt: string; // fecha/hora de generación del reporte
  resumen: ETLResumenReporte; // métricas agregadas principales
  usuarios: {
    total: number;
    activos: number;
    inactivos: number;
    conFoto: number;
    sinFoto: number;
    promedioDiasVacacionesDisponibles: number;
    porRol: ChartItem[]; // distribución por rol para graficar
  };
  nomina: {
    totalRegistros: number;
    totalSalarioBase: number;
    totalBonos: number;
    totalDeducciones: number;
    totalPagado: number;
    promedioSalarioBase: number;
    porEstado: ChartItem[]; // estado operativo de registros de nómina
    componentes: ChartItem[]; // componentes monetarios para gráficas
    porPeriodo: {
      periodo: string;
      total: number;
      bonos: number;
      deducciones: number;
      salarioBase: number;
    }[]; // series temporales por periodo
  };
  vacaciones: {
    totalSolicitudes: number;
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    totalDiasSolicitados: number;
    promedioDiasSolicitados: number;
    porEstado: ChartItem[]; // distribución por estado (pendiente/aprobada/rechazada)
    porFecha: {
      fecha: string;
      solicitudes: number;
      dias: number;
    }[]; // serie temporal de solicitudes por fecha
  };
  insights: string[]; // observaciones/hallazgos textuales del ETL
}