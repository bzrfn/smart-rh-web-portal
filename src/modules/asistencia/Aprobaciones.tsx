import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  api,
} from '../../services/api';

import {
  useAuth,
} from '../../app/auth/AuthContext';


type Asistencia = {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  fecha: string;
  hora_entrada: string;
  hora_salida?: string | null;

  estado:
    | 'pendiente'
    | 'INVALIDA_PENDIENTE_REVISION';

  duracion_minima_aplicada_minutos?: number | null;
  duracion_registrada_segundos?: number | null;
};


type RevisionAsistencia = {
  id: number;
  asistencia_id: number;
  admin_usuario_id: number;

  admin_nombre?: string | null;
  admin_apellido?: string | null;
  admin_correo?: string | null;

  accion: string;
  motivo?: string | null;

  estado_anterior: string;
  estado_nuevo: string;

  hora_entrada_anterior?: string | null;
  hora_salida_anterior?: string | null;
  hora_entrada_nueva?: string | null;
  hora_salida_nueva?: string | null;

  created_at?: string | null;
};


type ReviewAction =
  | 'approve'
  | 'reject'
  | 'justify'
  | 'correct'
  | 'history';


const PAGE_SIZE = 5;

const JUSTIFICATION_REASONS = [
  'Permiso autorizado',
  'Comisión o actividad laboral externa',
  'Emergencia médica',
  'Emergencia personal o familiar',
  'Incidencia de transporte',
  'Falla de QR o sistema',
  'Error de registro de asistencia',
  'Salida autorizada por supervisor',
  'Capacitación o reunión externa',
  'Otro',
] as const;


function buildJustificationMotivo(
  reason: string,
  other: string,
  detail: string
) {
  const resolvedReason =
    reason ===
      'Otro'
      ? other.trim()
      : reason.trim();

  return (
    `Motivo: ${resolvedReason}` +
    ` | Detalle: ${detail.trim()}`
  );
}



export default function Aprobaciones() {
  const {
    token,
  } = useAuth();

  const [
    items,
    setItems,
  ] =
    useState<Asistencia[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    actionLoadingId,
    setActionLoadingId,
  ] =
    useState<number | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );

  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(
      1
    );

  const [
    selected,
    setSelected,
  ] =
    useState<Asistencia | null>(
      null
    );

  const [
    reviewAction,
    setReviewAction,
  ] =
    useState<ReviewAction | null>(
      null
    );

  const [
    motivo,
    setMotivo,
  ] =
    useState(
      ''
    );

  const [
    justificacionMotivo,
    setJustificacionMotivo,
  ] =
    useState(
      ''
    );

  const [
    justificacionDetalle,
    setJustificacionDetalle,
  ] =
    useState(
      ''
    );

  const [
    justificacionOtro,
    setJustificacionOtro,
  ] =
    useState(
      ''
    );


  const [
    horaEntrada,
    setHoraEntrada,
  ] =
    useState(
      ''
    );

  const [
    horaSalida,
    setHoraSalida,
  ] =
    useState(
      ''
    );

  const [
    revisiones,
    setRevisiones,
  ] =
    useState<RevisionAsistencia[]>(
      []
    );

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(
      false
    );


  const reviewPanelRef =
    useRef<HTMLDivElement | null>(
      null
    );


  useEffect(
    () => {
      if (
        !selected ||
        !reviewAction
      ) {
        return;
      }

      const panel =
        reviewPanelRef.current;

      if (!panel) {
        return;
      }


      panel.focus({
        preventScroll:
          true,
      });
    },
    [
      selected,
      reviewAction,
    ]
  );

  useEffect(
    () => {
      if (
        reviewAction !==
          'justify'
      ) {
        setJustificacionMotivo(
          ''
        );

        setJustificacionDetalle(
          ''
        );

        setJustificacionOtro(
          ''
        );
      }
    },
    [
      selected,
      reviewAction,
    ]
  );





  const summary =
    useMemo(
      () => {
        const pendientesRevision =
          items.filter(
            (item) =>
              item.estado ===
              'INVALIDA_PENDIENTE_REVISION'
          ).length;

        const pendientes =
          items.length -
          pendientesRevision;

        return {
          total:
            items.length,

          pendientes,

          pendientesRevision,
        };
      },
      [
        items,
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        items.length /
        PAGE_SIZE
      )
    );


  const paginatedItems =
    useMemo(
      () => {
        const start =
          (
            currentPage -
            1
          ) *
          PAGE_SIZE;

        return items.slice(
          start,
          start +
          PAGE_SIZE
        );
      },
      [
        items,
        currentPage,
      ]
    );


  const closeReviewPanel =
    useCallback(
      () => {
        setSelected(
          null
        );

        setReviewAction(
          null
        );

        setMotivo(
          ''
        );

        setHoraEntrada(
          ''
        );

        setHoraSalida(
          ''
        );

        setRevisiones(
          []
        );

        setHistoryLoading(
          false
        );
      },
      []
    );


  const load =
    useCallback(
      async () => {
        if (!token) {
          setItems(
            []
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setError(
            ''
          );

          const {
            data,
          } =
            await api.get(
              '/asistencia/pendientes'
            );

          const list =
            Array.isArray(
              data?.asistencias
            )
              ? data.asistencias
              : [];

          setItems(
            list
          );

          setCurrentPage(
            1
          );

        } catch (e: any) {
          setError(
            e?.response?.data?.message ??
            'No se pudieron cargar las asistencias pendientes.'
          );

          setItems(
            []
          );

        } finally {
          setLoading(
            false
          );
        }
      },
      [
        token,
      ]
    );


  useEffect(
    () => {
      if (!token) {
        return;
      }

      load();
    },
    [
      token,
      load,
    ]
  );


  useEffect(
    () => {
      if (
        currentPage >
        totalPages
      ) {
        setCurrentPage(
          totalPages
        );
      }
    },
    [
      currentPage,
      totalPages,
    ]
  );


  const openReviewAction = (
    asistencia: Asistencia,
    action: Exclude<
      ReviewAction,
      'history'
    >
  ) => {
    setSelected(
      asistencia
    );

    setReviewAction(
      action
    );

    setMotivo(
      ''
    );

    setHoraEntrada(
      asistencia.hora_entrada ||
      ''
    );

    setHoraSalida(
      asistencia.hora_salida ||
      ''
    );

    setRevisiones(
      []
    );

    setError(
      ''
    );
  };


  const approve = async (
    id: number,
    motivo: string
  ) => {
    if (!token) {
      return;
    }

    try {
      setActionLoadingId(
        id
      );

      setError(
        ''
      );

      await api.patch(
        `/asistencia/${id}/approve`,
        {
          motivo:
            motivo.trim(),
        }
      );

      closeReviewPanel();

      await load();

    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
        'No se pudo aprobar la asistencia.'
      );

    } finally {
      setActionLoadingId(
        null
      );
    }
  };


  const reject = async (
    id: number,
    motivo: string
  ) => {
    if (!token) {
      return;
    }

    try {
      setActionLoadingId(
        id
      );

      setError(
        ''
      );

      await api.patch(
        `/asistencia/${id}/reject`,
        {
          motivo:
            motivo.trim(),
        }
      );

      closeReviewPanel();

      await load();

    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
        'No se pudo rechazar la asistencia.'
      );

    } finally {
      setActionLoadingId(
        null
      );
    }
  };


  const justify = async (
    id: number,
    motivo: string
  ) => {
    if (!token) {
      return;
    }

    if (
      !motivo.trim()
    ) {
      setError(
        'Ingresa un motivo para justificar la asistencia.'
      );

      return;
    }

    try {
      setActionLoadingId(
        id
      );

      setError(
        ''
      );

      await api.patch(
        `/asistencia/${id}/justify`,
        {
          motivo:
            motivo.trim(),
        }
      );

      closeReviewPanel();

      await load();

    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
        'No se pudo justificar la asistencia.'
      );

    } finally {
      setActionLoadingId(
        null
      );
    }
  };


  const correct = async (
    id: number,
    motivo: string,
    horaEntradaNueva: string,
    horaSalidaNueva: string
  ) => {
    if (!token) {
      return;
    }

    if (
      !motivo.trim()
    ) {
      setError(
        'Ingresa un motivo para corregir la asistencia.'
      );

      return;
    }

    if (
      !horaEntradaNueva.trim() ||
      !horaSalidaNueva.trim()
    ) {
      setError(
        'Ingresa la hora de entrada y la hora de salida corregidas.'
      );

      return;
    }

    try {
      setActionLoadingId(
        id
      );

      setError(
        ''
      );

      await api.patch(
        `/asistencia/${id}/correct`,
        {
          motivo:
            motivo.trim(),

          hora_entrada:
            horaEntradaNueva.trim(),

          hora_salida:
            horaSalidaNueva.trim(),
        }
      );

      closeReviewPanel();

      await load();

    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
        'No se pudo corregir la asistencia.'
      );

    } finally {
      setActionLoadingId(
        null
      );
    }
  };


  const loadRevisiones =
    async (
      asistencia: Asistencia
    ) => {
      if (!token) {
        return;
      }

      setSelected(
        asistencia
      );

      setReviewAction(
        'history'
      );

      setMotivo(
        ''
      );

      setHoraEntrada(
        ''
      );

      setHoraSalida(
        ''
      );

      setRevisiones(
        []
      );

      try {
        setHistoryLoading(
          true
        );

        setError(
          ''
        );

        const {
          data,
        } =
          await api.get(
            `/asistencia/${asistencia.id}/revisiones`
          );

        const historial =
          Array.isArray(
            data?.data
          )
            ? data.data
            : Array.isArray(
                data?.historial
              )
              ? data.historial
              : [];

        setRevisiones(
          historial
        );

      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
          'No se pudo cargar el historial de revisiones.'
        );

      } finally {
        setHistoryLoading(
          false
        );
      }
    };


  const submitReviewAction =
    async () => {
      if (
        !selected ||
        !reviewAction ||
        reviewAction ===
          'history'
      ) {
        return;
      }

      if (
        selected.estado ===
              'INVALIDA_PENDIENTE_REVISION' &&
            reviewAction !==
              'justify' &&
            !motivo.trim()
      ) {
        setError(
          'El motivo es obligatorio para resolver una asistencia pendiente de revisión.'
        );

        return;
      }

      switch (
        reviewAction
      ) {
        case 'approve':
          await approve(
            selected.id,
            motivo
          );
          return;

        case 'reject':
          await reject(
            selected.id,
            motivo
          );
          return;

        case 'justify': {
              if (
                !justificacionMotivo
              ) {
                setError(
                  'Selecciona un motivo de justificación.'
                );

                return;
              }

              if (
                justificacionMotivo ===
                  'Otro' &&
                !justificacionOtro.trim()
              ) {
                setError(
                  'Especifica el motivo seleccionado como Otro.'
                );

                return;
              }

              if (
                !justificacionDetalle.trim()
              ) {
                setError(
                  'Ingresa una breve explicación.'
                );

                return;
              }

              const motivoJustificacion =
                buildJustificationMotivo(
                  justificacionMotivo,
                  justificacionOtro,
                  justificacionDetalle
                );

              await justify(
                selected.id,
                motivoJustificacion
              );

              return;
            }

        case 'correct':
          await correct(
            selected.id,
            motivo,
            horaEntrada,
            horaSalida
          );
          return;

        default:
          return;
      }
    };


  return (
    <div className="module-card">
      <div className="module-card-header">
        <div>
          <p className="module-eyebrow">
            Control administrativo
          </p>

          <h2 className="module-title">
            Aprobación de asistencias
          </h2>

          <p className="module-subtitle">
            Revisa, valida y resuelve los registros pendientes antes de que
            impacten el historial general del sistema.
          </p>
        </div>
      </div>

      <div className="module-kpi-row asistencia-review-kpi-row">
        <div className="module-kpi-card">
          <span className="module-kpi-label">
            Pendientes normales
          </span>

          <strong className="module-kpi-value">
            {summary.pendientes}
          </strong>
        </div>

        <div className="module-kpi-card">
          <span className="module-kpi-label">
            Pendientes de revisión
          </span>

          <strong className="module-kpi-value">
            {summary.pendientesRevision}
          </strong>
        </div>

        <div className="module-kpi-card">
          <span className="module-kpi-label">
            Total por resolver
          </span>

          <strong className="module-kpi-value">
            {summary.total}
          </strong>
        </div>
      </div>

      {loading && (
        <p className="module-info">
          Cargando asistencias pendientes...
        </p>
      )}

      {error && (
        <p className="module-error">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        items.length === 0 && (
          <div className="empty-state-card">
            <h3>
              Sin pendientes
            </h3>

            <p>
              No hay asistencias pendientes por aprobar en este momento.
            </p>
          </div>
        )}

      {items.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empleado</th>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {paginatedItems.map(
                  (a) => (
                    <tr key={a.id}>
                      <td>
                        {a.id}
                      </td>

                      <td>
                        <div className="table-main-text">
                          {a.nombre}{' '}
                          {a.apellido}
                        </div>

                        <div className="table-secondary-text">
                          {a.correo}
                        </div>
                      </td>

                      <td>
                        {a.fecha}
                      </td>

                      <td>
                        {a.hora_entrada ||
                          'Sin dato'}
                      </td>

                      <td>
                        {a.hora_salida ||
                          'Sin dato'}
                      </td>

                      <td>
                        <div className="table-main-text">
                          {formatDurationSeconds(
                            a.duracion_registrada_segundos
                          )}
                        </div>

                        <div className="table-secondary-text">
                          Mínimo aplicado:{' '}
                          {formatMinimumMinutes(
                            a.duracion_minima_aplicada_minutos
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="status-pill admin">
                          {formatEstadoLabel(
                            a.estado
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="table-actions">
                          {a.estado === 'INVALIDA_PENDIENTE_REVISION' ? (
                            <>
                              <button
                                className="action-btn action-btn-success"
                                onClick={() =>
                                  openReviewAction(
                                    a,
                                    'approve'
                                  )
                                }
                                disabled={
                                  actionLoadingId ===
                                  a.id
                                }
                                type="button"
                              >
                                Aprobar
                              </button>

                              <button
                                className="action-btn action-btn-danger"
                                onClick={() =>
                                  openReviewAction(
                                    a,
                                    'reject'
                                  )
                                }
                                disabled={
                                  actionLoadingId ===
                                  a.id
                                }
                                type="button"
                              >
                                Rechazar
                              </button>

                              <button
                                className="action-btn action-btn-justify"
                                onClick={() =>
                                  openReviewAction(
                                    a,
                                    'justify'
                                  )
                                }
                                disabled={
                                  actionLoadingId ===
                                  a.id
                                }
                                type="button"
                              >
                                Justificar
                              </button>

                              <button
                                className="action-btn action-btn-correct"
                                onClick={() =>
                                  openReviewAction(
                                    a,
                                    'correct'
                                  )
                                }
                                disabled={
                                  actionLoadingId ===
                                  a.id
                                }
                                type="button"
                              >
                                Corregir
                              </button>

                              <button
                                className="action-btn action-btn-history"
                                onClick={() =>
                                  loadRevisiones(
                                    a
                                  )
                                }
                                disabled={
                                  actionLoadingId ===
                                  a.id
                                }
                                type="button"
                              >
                                Historial
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="action-btn action-btn-success"
                                onClick={() =>
                                  approve(
                                    a.id,
                                    ''
                                  )
                                }
                                disabled={
                                  actionLoadingId ===
                                  a.id
                                }
                                type="button"
                              >
                                {actionLoadingId ===
                                a.id
                                  ? 'Procesando...'
                                  : 'Aprobar'}
                              </button>

                              <button
                                className="action-btn action-btn-danger"
                                onClick={() =>
                                  reject(
                                    a.id,
                                    ''
                                  )
                                }
                                disabled={
                                  actionLoadingId ===
                                  a.id
                                }
                                type="button"
                              >
                                {actionLoadingId ===
                                a.id
                                  ? 'Procesando...'
                                  : 'Rechazar'}
                              </button>

                              <button
                                className="action-btn action-btn-history"
                                onClick={() =>
                                  loadRevisiones(
                                    a
                                  )
                                }
                                type="button"
                              >
                                Historial
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <button
              className="btn pagination-btn"
              onClick={() =>
                setCurrentPage(
                  (p) =>
                    Math.max(
                      1,
                      p - 1
                    )
                )
              }
              disabled={
                currentPage ===
                1
              }
              type="button"
            >
              Anterior
            </button>

            <span className="pagination-info">
              Página {currentPage} de {totalPages}
            </span>

            <button
              className="btn pagination-btn"
              onClick={() =>
                setCurrentPage(
                  (p) =>
                    Math.min(
                      totalPages,
                      p + 1
                    )
                )
              }
              disabled={
                currentPage ===
                totalPages
              }
              type="button"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {selected &&
        reviewAction && (
          <div
            className="asistencia-review-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeReviewPanel();
              }
            }}
            role="presentation"
          >
            <div
              ref={reviewPanelRef}
              tabIndex={-1}
              className="empty-state-card asistencia-review-modal"
              role="dialog"
              aria-modal="true"
              aria-label={
                reviewAction ===
                  'history'
                  ? 'Historial de revisiones'
                  : 'Revisión administrativa'
              }
            >
              <button
                className="asistencia-review-modal-close"
                onClick={
                  closeReviewPanel
                }
                type="button"
                aria-label="Cerrar"
                title="Cerrar"
              >
                ×
              </button>
            {reviewAction ===
            'history' ? (
              <>
                <h3>
                  Historial de revisiones
                </h3>

                <p>
                  Asistencia #{selected.id} ·{' '}
                  {selected.nombre}{' '}
                  {selected.apellido}
                </p>

                {historyLoading && (
                  <p className="module-info">
                    Cargando historial de revisiones...
                  </p>
                )}

                {!historyLoading &&
                  revisiones.length ===
                    0 && (
                    <p className="table-secondary-text">
                      Esta asistencia todavía no tiene decisiones
                      administrativas registradas.
                    </p>
                  )}

                {!historyLoading &&
                  revisiones.length >
                    0 && (
                    <div
                      className="table-wrapper"
                      style={{
                        marginTop:
                          16,
                      }}
                    >
                      <table className="smart-table">
                        <thead>
                          <tr>
                            <th>Acción</th>
                            <th>Administrador</th>
                            <th>Motivo</th>
                            <th>Cambio de estado</th>
                            <th>Horas</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>

                        <tbody>
                          {revisiones.map(
                            (
                              revision
                            ) => (
                              <tr
                                key={
                                  revision.id
                                }
                              >
                                <td>
                                  <div className="table-main-text">
                                    {
                                      revision.accion
                                    }
                                  </div>
                                </td>

                                <td>
                                  <div className="table-main-text">
                                    {[
                                      revision.admin_nombre,
                                      revision.admin_apellido,
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        ' '
                                      ) ||
                                      'Administrador'}
                                  </div>

                                  <div className="table-secondary-text">
                                    {revision.admin_correo ||
                                      `ID ${revision.admin_usuario_id}`}
                                  </div>
                                </td>

                                <td>
                                  {revision.motivo ||
                                    'Sin motivo registrado'}
                                </td>

                                <td>
                                  <div className="table-main-text">
                                    {formatHistoryState(
                                      revision.estado_anterior
                                    )}
                                    {' → '}
                                    {formatHistoryState(
                                      revision.estado_nuevo
                                    )}
                                  </div>
                                </td>

                                <td>
                                  <div className="table-secondary-text">
                                    Entrada:{' '}
                                    {revision.hora_entrada_anterior ||
                                      '—'}
                                    {' → '}
                                    {revision.hora_entrada_nueva ||
                                      '—'}
                                  </div>

                                  <div className="table-secondary-text">
                                    Salida:{' '}
                                    {revision.hora_salida_anterior ||
                                      '—'}
                                    {' → '}
                                    {revision.hora_salida_nueva ||
                                      '—'}
                                  </div>
                                </td>

                                <td>
                                  {formatReviewDate(
                                    revision.created_at
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                <div
                  className="table-actions"
                  style={{
                    marginTop:
                      16,
                  }}
                >
                  <button
                    className="action-btn"
                    onClick={
                      closeReviewPanel
                    }
                    type="button"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>
                  Revisión administrativa
                </h3>

                <p>
                  Asistencia #{selected.id} ·{' '}
                  {selected.nombre}{' '}
                  {selected.apellido}
                </p>

                <p className="table-secondary-text">
                  Estado actual:{' '}
                  {formatEstadoLabel(
                    selected.estado
                  )}
                </p>

                {reviewAction ===
                  'justify' ? (
                  <div className="asistencia-justification-form">
                    <label className="asistencia-review-field">
                      <span className="table-main-text">
                        Motivo de justificación
                      </span>

                      <select
                        value={
                          justificacionMotivo
                        }
                        onChange={(
                          event
                        ) => {
                          const value =
                            event.target
                              .value;

                          setJustificacionMotivo(
                            value
                          );

                          if (
                            value !==
                              'Otro'
                          ) {
                            setJustificacionOtro(
                              ''
                            );
                          }

                          setError(
                            ''
                          );
                        }}
                      >
                        <option
                          value=""
                          disabled
                        >
                          Selecciona un motivo...
                        </option>

                        {JUSTIFICATION_REASONS.map(
                          (
                            reason
                          ) => (
                            <option
                              key={
                                reason
                              }
                              value={
                                reason
                              }
                            >
                              {reason}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    {justificacionMotivo ===
                      'Otro' && (
                      <label className="asistencia-review-field">
                        <span className="table-main-text">
                          Especifica el motivo
                        </span>

                        <input
                          type="text"
                          value={
                            justificacionOtro
                          }
                          onChange={(
                            event
                          ) => {
                            setJustificacionOtro(
                              event.target
                                .value
                            );

                            setError(
                              ''
                            );
                          }}
                          maxLength={120}
                          placeholder="Escribe el motivo específico..."
                        />
                      </label>
                    )}

                    <label className="asistencia-review-field">
                      <span className="table-main-text">
                        Breve explicación
                      </span>

                      <textarea
                        value={
                          justificacionDetalle
                        }
                        onChange={(
                          event
                        ) => {
                          setJustificacionDetalle(
                            event.target
                              .value
                          );

                          setError(
                            ''
                          );
                        }}
                        placeholder="Describe brevemente qué ocurrió y por qué procede la justificación..."
                        rows={4}
                        maxLength={500}
                      />

                      <span className="asistencia-review-help">
                        Incluye únicamente la información necesaria para dejar
                        trazabilidad administrativa.
                      </span>
                    </label>
                  </div>
                ) : (
                  <>
                <label
                  style={{
                    display:
                      'block',

                    marginTop:
                      16,

                    fontWeight:
                      800,
                  }}
                >
                  Motivo administrativo
                </label>

                <textarea
                  value={motivo}
                  onChange={(
                    event
                  ) =>
                    setMotivo(
                      event.target
                        .value
                    )
                  }
                  placeholder="Describe el motivo de la decisión administrativa..."
                  rows={4}
                  style={{
                    width:
                      '100%',

                    marginTop:
                      8,
                  }}
                />
                  </>
                )}

                {reviewAction ===
                  'correct' && (
                  <div
                    style={{
                      display:
                        'grid',

                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(180px, 1fr))',

                      gap:
                        12,

                      marginTop:
                        16,
                    }}
                  >
                    <label>
                      <span className="table-main-text">
                        Hora de entrada
                      </span>

                      <input
                        type="time"
                        step="1"
                        value={
                          horaEntrada
                        }
                        onChange={(
                          event
                        ) =>
                          setHoraEntrada(
                            event
                              .target
                              .value
                          )
                        }
                        style={{
                          width:
                            '100%',

                          marginTop:
                            8,
                        }}
                      />
                    </label>

                    <label>
                      <span className="table-main-text">
                        Hora de salida
                      </span>

                      <input
                        type="time"
                        step="1"
                        value={
                          horaSalida
                        }
                        onChange={(
                          event
                        ) =>
                          setHoraSalida(
                            event
                              .target
                              .value
                          )
                        }
                        style={{
                          width:
                            '100%',

                          marginTop:
                            8,
                        }}
                      />
                    </label>
                  </div>
                )}

                <div
                  className="table-actions"
                  style={{
                    marginTop:
                      16,
                  }}
                >
                  <button
                    className={
                      reviewAction ===
                        'reject'
                        ? 'action-btn action-btn-danger'
                        : 'action-btn action-btn-success'
                    }
                    onClick={
                      submitReviewAction
                    }
                    disabled={
                      actionLoadingId ===
                      selected.id
                    }
                    type="button"
                  >
                    {actionLoadingId ===
                    selected.id
                      ? 'Procesando...'
                      : 'Confirmar'}
                  </button>

                  <button
                    className="action-btn"
                    onClick={
                      closeReviewPanel
                    }
                    disabled={
                      actionLoadingId ===
                      selected.id
                    }
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        )}
    </div>
  );
}


function formatEstadoLabel(
  estado: Asistencia['estado']
) {
  if (
    estado ===
    'INVALIDA_PENDIENTE_REVISION'
  ) {
    return 'Pendiente de revisión';
  }

  return 'Pendiente';
}


function formatHistoryState(
  estado?: string | null
) {
  switch (
    estado
  ) {
    case 'INVALIDA_PENDIENTE_REVISION':
      return 'Pendiente de revisión';

    case 'aprobada':
      return 'Aprobada';

    case 'rechazada':
      return 'Rechazada';

    case 'pendiente':
      return 'Pendiente';

    default:
      return estado ||
        'Sin estado';
  }
}


function formatDurationSeconds(
  value?: number | null
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(
        value
      )
    )
  ) {
    return 'Sin duración calculada';
  }

  const totalSeconds =
    Math.max(
      0,
      Math.round(
        Number(
          value
        )
      )
    );

  const minutes =
    Math.floor(
      totalSeconds /
      60
    );

  const seconds =
    totalSeconds %
    60;

  if (
    minutes <=
    0
  ) {
    return `${seconds} s`;
  }

  return `${minutes} min ${seconds} s`;
}


function formatMinimumMinutes(
  value?: number | null
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(
        value
      )
    )
  ) {
    return 'No registrado';
  }

  return `${Number(value)} min`;
}


function formatReviewDate(
  value?: string | null
) {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return parsed.toLocaleString(
    'es-MX'
  );
}
