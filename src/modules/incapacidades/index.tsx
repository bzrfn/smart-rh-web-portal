import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  api,
} from '../../services/api';

import {
  openProtectedResource,
} from '../../services/protectedMedia';


type EstadoIncapacidad =
  | 'pendiente'
  | 'aprobada'
  | 'rechazada';


type EstadoFiltro =
  | 'todos'
  | EstadoIncapacidad;


type ValidacionAutomatica = {
  estado_validacion:
    | 'pendiente'
    | 'consistente'
    | 'requiere_revision';

  analisis_disponible:
    boolean;

  estado_analisis:
    | 'pendiente'
    | 'completado'
    | 'requiere_revision'
    | 'error'
    | null;

  estado_estructura:
    | 'valido'
    | 'requiere_revision'
    | 'invalido'
    | null;

  puntaje_estructura:
    number | null;

  pdf_version:
    string | null;

  duplicado_detectado:
    boolean;

  duplicado_de_incapacidad_id:
    number | null;

  motivos_revision:
    (
      | 'DOCUMENTO_DUPLICADO'
      | 'ESTRUCTURA_PDF'
      | 'ERROR_ANALISIS'
    )[];

  analizado_at:
    string | null;
};


type Incapacidad = {
  id: number;
  usuario_id: number;

  fecha_inicio: string;
  fecha_fin: string;
  dias_calculados: number;

  motivo: string;
  estado: EstadoIncapacidad;

  comprobante_key?: string | null;
  comprobante_nombre?: string | null;
  comprobante_mime?: string | null;
  comprobante_tamano?: number | null;

  observaciones_admin?: string | null;
  revisado_por_admin_id?: number | null;
  revisado_at?: string | null;

  usuario_nombre?: string | null;
  usuario_apellido?: string | null;
  usuario_correo?: string | null;

  admin_nombre?: string | null;
  admin_apellido?: string | null;

  created_at?: string | null;

  validacion_automatica?:
    ValidacionAutomatica;
};


const PAGE_SIZE = 6;


function formatDate(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const clean =
    String(value)
      .slice(
        0,
        10
      );

  const [
    year,
    month,
    day,
  ] =
    clean.split('-');

  if (
    year &&
    month &&
    day
  ) {
    return (
      `${day}/${month}/${year}`
    );
  }

  return clean;
}


function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    'es-MX'
  );
}


function employeeName(
  item: Incapacidad
) {
  const full =
    [
      item.usuario_nombre,
      item.usuario_apellido,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  return (
    full ||
    `Empleado #${item.usuario_id}`
  );
}


function statusLabel(
  estado: EstadoIncapacidad
) {
  if (
    estado ===
    'aprobada'
  ) {
    return 'Aprobada';
  }

  if (
    estado ===
    'rechazada'
  ) {
    return 'Rechazada';
  }

  return 'Pendiente';
}


function statusClass(
  estado: EstadoIncapacidad
) {
  if (
    estado ===
    'aprobada'
  ) {
    return 'active';
  }

  if (
    estado ===
    'rechazada'
  ) {
    return 'inactive';
  }

  return 'pending';
}


function validationLabel(
  validation:
    ValidacionAutomatica | undefined
): string {
  if (
    !validation ||
    validation.estado_validacion ===
      'pendiente'
  ) {
    return 'Pendiente de análisis';
  }

  if (
    validation.estado_validacion ===
    'consistente'
  ) {
    return 'Consistente';
  }

  return 'Requiere revisión';
}


function validationStatusClass(
  validation:
    ValidacionAutomatica | undefined
): string {
  if (
    validation?.estado_validacion ===
    'consistente'
  ) {
    return statusClass(
      'aprobada'
    );
  }

  if (
    validation?.estado_validacion ===
    'requiere_revision'
  ) {
    return statusClass(
      'pendiente'
    );
  }

  return statusClass(
    'pendiente'
  );
}


function validationDescription(
  validation:
    ValidacionAutomatica | undefined
): string {
  if (
    !validation ||
    !validation.analisis_disponible ||
    validation.estado_validacion ===
      'pendiente'
  ) {
    return (
      'La validación automática todavía no está disponible para este comprobante.'
    );
  }

  if (
    validation.estado_validacion ===
    'consistente'
  ) {
    return (
      'La revisión técnica del PDF no detectó un duplicado exacto ni anomalías estructurales. Esto no confirma la autenticidad médica del documento.'
    );
  }

  return (
    'SMART RH detectó señales técnicas que requieren revisión humana antes de tomar una decisión administrativa.'
  );
}


function validationReasonLabel(
  reason:
    ValidacionAutomatica[
      'motivos_revision'
    ][number]
): string {
  switch (reason) {
    case 'DOCUMENTO_DUPLICADO':
      return (
        'El mismo archivo PDF ya aparece asociado a otra incapacidad.'
      );

    case 'ESTRUCTURA_PDF':
      return (
        'La estructura técnica del PDF requiere revisión.'
      );

    case 'ERROR_ANALISIS':
      return (
        'El análisis automático no pudo completarse correctamente.'
      );

    default:
      return (
        'Se requiere revisión administrativa.'
      );
  }
}


function validationScoreLabel(
  validation:
    ValidacionAutomatica | undefined
): string {
  const score =
    validation?.puntaje_estructura;

  if (
    typeof score !==
      'number' ||
    !Number.isFinite(
      score
    )
  ) {
    return 'No disponible';
  }

  const normalized =
    Math.max(
      0,
      Math.min(
        1,
        score
      )
    );

  return `${Math.round(
    normalized * 100
  )}%`;
}


function validationDateLabel(
  value:
    string | null | undefined
): string {
  if (!value) {
    return 'No disponible';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    'es-MX'
  );
}


function proofUrl(
  item: Incapacidad
): string | null {
  const key =
    String(
      item.comprobante_key ||
      ''
    )
      .trim()
      .replace(
        /^\/+/,
        ''
      );

  if (!key) {
    return null;
  }

  if (
    key.startsWith(
      'uploads/'
    )
  ) {
    return `/${key}`;
  }

  return `/uploads/${key}`;
}


function formatBytes(
  value?: number | null
) {
  const bytes =
    Number(
      value || 0
    );

  if (!bytes) {
    return '—';
  }

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return (
      `${(
        bytes /
        1024
      ).toFixed(1)} KB`
    );
  }

  return (
    `${(
      bytes /
      (
        1024 *
        1024
      )
    ).toFixed(1)} MB`
  );
}


export default function Incapacidades() {
  const [
    items,
    setItems,
  ] =
    useState<Incapacidad[]>(
      []
    );

  const [
    filtro,
    setFiltro,
  ] =
    useState<EstadoFiltro>(
      'todos'
    );

  const [
    loading,
    setLoading,
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

  const [
    success,
    setSuccess,
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
    useState<Incapacidad | null>(
      null
    );

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(
      false
    );

  const [
    reviewing,
    setReviewing,
  ] =
    useState(
      false
    );

  const [
    observaciones,
    setObservaciones,
  ] =
    useState(
      ''
    );


  const load =
    useCallback(
      async () => {
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
              '/incapacidades'
            );

          const list =
            Array.isArray(
              data?.incapacidades
            )
              ? data.incapacidades
              : [];

          setItems(
            list
          );

          setCurrentPage(
            1
          );
        } catch (e: any) {
          setItems(
            []
          );

          setError(
            e?.response?.data?.message ??
              'No se pudieron cargar las incapacidades.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );


  useEffect(
    () => {
      load();
    },
    [load]
  );


  const summary =
    useMemo(
      () => ({
        total:
          items.length,

        pendientes:
          items.filter(
            (item) =>
              item.estado ===
              'pendiente'
          ).length,

        aprobadas:
          items.filter(
            (item) =>
              item.estado ===
              'aprobada'
          ).length,

        rechazadas:
          items.filter(
            (item) =>
              item.estado ===
              'rechazada'
          ).length,
      }),
      [items]
    );


  const filteredItems =
    useMemo(
      () =>
        filtro ===
        'todos'
          ? items
          : items.filter(
              (item) =>
                item.estado ===
                filtro
            ),
      [
        filtro,
        items,
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredItems.length /
        PAGE_SIZE
      )
    );


  const pageItems =
    useMemo(
      () => {
        const start =
          (
            currentPage -
            1
          ) *
          PAGE_SIZE;

        return (
          filteredItems.slice(
            start,
            start +
              PAGE_SIZE
          )
        );
      },
      [
        currentPage,
        filteredItems,
      ]
    );


  useEffect(
    () => {
      setCurrentPage(
        1
      );
    },
    [filtro]
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


  const openDetail =
    async (
      item: Incapacidad
    ) => {
      try {
        setDetailLoading(
          true
        );

        setError(
          ''
        );

        setSuccess(
          ''
        );

        const {
          data,
        } =
          await api.get(
            `/incapacidades/${item.id}`
          );

        if (
          !data?.incapacidad
        ) {
          throw new Error(
            'Detalle no disponible'
          );
        }

        setSelected(
          data.incapacidad
        );

        setObservaciones(
          data.incapacidad
            .observaciones_admin ||
            ''
        );
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            'No se pudo consultar el detalle de la incapacidad.'
        );
      } finally {
        setDetailLoading(
          false
        );
      }
    };


  const openProof =
    async (
      item: Incapacidad
    ) => {
      const url =
        proofUrl(
          item
        );

      if (!url) {
        setError(
          'La solicitud no tiene comprobante adjunto.'
        );

        return;
      }

      try {
        setError(
          ''
        );

        await openProtectedResource(
          url
        );
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            'No se pudo abrir el comprobante médico.'
        );
      }
    };


  const resolve =
    async (
      estado:
        | 'aprobada'
        | 'rechazada'
    ) => {
      if (
        !selected ||
        reviewing
      ) {
        return;
      }

      if (
        estado ===
          'rechazada' &&
        !observaciones.trim()
      ) {
        setError(
          'La observación es obligatoria para rechazar una incapacidad.'
        );

        return;
      }

      try {
        setReviewing(
          true
        );

        setError(
          ''
        );

        setSuccess(
          ''
        );

        const {
          data,
        } =
          await api.patch(
            `/incapacidades/${selected.id}/revision`,
            {
              estado,

              observaciones_admin:
                observaciones
                  .trim() ||
                undefined,
            }
          );

        if (
          !data?.ok ||
          !data?.incapacidad
        ) {
          throw new Error(
            'Respuesta inválida'
          );
        }

        setSelected(
          data.incapacidad
        );

        setObservaciones(
          data.incapacidad
            .observaciones_admin ||
            ''
        );

        setSuccess(
          estado ===
            'aprobada'
            ? 'Incapacidad aprobada correctamente.'
            : 'Incapacidad rechazada correctamente.'
        );

        await load();
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            (
              estado ===
              'aprobada'
                ? 'No se pudo aprobar la incapacidad.'
                : 'No se pudo rechazar la incapacidad.'
            )
        );
      } finally {
        setReviewing(
          false
        );
      }
    };


  return (
    <div className="dashboard-page">
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">
              Recursos Humanos
            </p>

            <h2 className="module-title">
              Incapacidades
            </h2>

            <p className="module-subtitle">
              Revisa solicitudes médicas,
              comprobantes y periodos de
              ausencia registrados por los
              empleados.
            </p>
          </div>
        </div>

        <div className="module-hero-banner incap-hero-banner">
          <div className="module-hero-copy">
            <h3>
              Gestión de incapacidades médicas
            </h3>

            <p>
              Consulta cada solicitud,
              valida su comprobante y
              registra una resolución
              administrativa trazable.
            </p>
          </div>

          <div className="module-hero-badge">
            Incapacidades Inteligentes
          </div>
        </div>

        <div className="asistencia-summary-grid">
          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />

            <h3>Total</h3>

            <p>
              {summary.total}
              {' '}
              solicitudes registradas.
            </p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />

            <h3>Pendientes</h3>

            <p>
              {summary.pendientes}
              {' '}
              solicitudes por revisar.
            </p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent blue" />

            <h3>Aprobadas</h3>

            <p>
              {summary.aprobadas}
              {' '}
              solicitudes aprobadas.
            </p>
          </div>

          <div className="asistencia-summary-card">
            <div className="dashboard-card-accent teal" />

            <h3>Rechazadas</h3>

            <p>
              {summary.rechazadas}
              {' '}
              solicitudes rechazadas.
            </p>
          </div>
        </div>
      </div>

      <div className="module-card incap-list-card">
        <div className="module-card-header">
          <div>
            <p className="module-eyebrow">
              Control administrativo
            </p>

            <h2 className="module-title">
              Solicitudes
            </h2>

            <p className="module-subtitle">
              Filtra y revisa solicitudes
              médicas registradas.
            </p>
          </div>

          <label>
            Estado
            {' '}

            <select
              value={filtro}
              onChange={
                (event) =>
                  setFiltro(
                    event.target
                      .value as EstadoFiltro
                  )
              }
            >
              <option value="todos">
                Todos
              </option>

              <option value="pendiente">
                Pendientes
              </option>

              <option value="aprobada">
                Aprobadas
              </option>

              <option value="rechazada">
                Rechazadas
              </option>
            </select>
          </label>
        </div>

        {loading && (
          <p className="module-info">
            Cargando incapacidades...
          </p>
        )}

        {error && (
          <p className="module-error">
            {error}
          </p>
        )}

        {success && (
          <p className="module-info">
            {success}
          </p>
        )}

        {!loading &&
          !error &&
          filteredItems.length ===
            0 && (
            <div className="empty-state-card">
              <h3>
                Sin solicitudes
              </h3>

              <p>
                No hay incapacidades
                para este filtro.
              </p>
            </div>
          )}

        {filteredItems.length >
          0 && (
          <>
            <div className="table-wrapper">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Empleado</th>
                    <th>Periodo</th>
                    <th>Días</th>
                    <th>Comprobante</th>
                    <th>Validación automática</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {pageItems.map(
                    (item) => (
                      <tr key={item.id}>
                        <td>
                          {item.id}
                        </td>

                        <td>
                          <div className="table-main-text">
                            {employeeName(
                              item
                            )}
                          </div>

                          <div className="table-secondary-text">
                            {item.usuario_correo ||
                              `Usuario ${item.usuario_id}`}
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            item.fecha_inicio
                          )}
                          {' → '}
                          {formatDate(
                            item.fecha_fin
                          )}
                        </td>

                        <td>
                          {item.dias_calculados}
                        </td>

                        <td>
                          {item.comprobante_key ? (
                            <button
                              type="button"
                              className="action-btn"
                              onClick={
                                () =>
                                  openProof(
                                    item
                                  )
                              }
                            >
                              Ver comprobante
                            </button>
                          ) : (
                            <span className="table-secondary-text">
                              Sin archivo
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              `status-pill ${validationStatusClass(
                                item.validacion_automatica
                              )}`
                            }
                            title={
                              validationDescription(
                                item.validacion_automatica
                              )
                            }
                          >
                            {validationLabel(
                              item.validacion_automatica
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              `status-pill ${statusClass(
                                item.estado
                              )}`
                            }
                          >
                            {statusLabel(
                              item.estado
                            )}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="action-btn"
                            disabled={
                              detailLoading
                            }
                            style={{
                              position:
                                'relative',

                              zIndex:
                                5,

                              pointerEvents:
                                'auto',
                            }}
                            onClick={
                              () => {
                                /*
                                 * INC81J_REVIEW_FIX
                                 *
                                 * La selección inmediata da
                                 * respuesta visual al clic.
                                 * Después se consulta el
                                 * detalle oficial al Backend.
                                 */
                                setSelected(
                                  item
                                );

                                setObservaciones(
                                  item
                                    .observaciones_admin ||
                                    ''
                                );

                                window
                                  .requestAnimationFrame(
                                    () => {
                                      document
                                        .getElementById(
                                          'incapacidad-review-detail'
                                        )
                                        ?.scrollIntoView({
                                          behavior:
                                            'smooth',

                                          block:
                                            'start',
                                        });
                                    }
                                  );

                                void openDetail(
                                  item
                                );
                              }
                            }
                          >
                            {detailLoading
                              ? 'Abriendo...'
                              : item.estado ===
                                'pendiente'
                                ? 'Revisar'
                                : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={
                  currentPage <= 1
                }
                onClick={
                  () =>
                    setCurrentPage(
                      (value) =>
                        Math.max(
                          1,
                          value - 1
                        )
                    )
                }
              >
                Anterior
              </button>

              <span className="table-secondary-text">
                Página
                {' '}
                {currentPage}
                {' '}
                de
                {' '}
                {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={
                  () =>
                    setCurrentPage(
                      (value) =>
                        Math.min(
                          totalPages,
                          value + 1
                        )
                    )
                }
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </div>

      {selected && (
        <div
          id="incapacidad-review-detail"
          className="module-card incap-detail-card"
          style={{
            scrollMarginTop:
              '96px',
          }}
        >
          <div className="module-card-header">
            <div>
              <p className="module-eyebrow">
                Expediente médico
              </p>

              <h2 className="module-title">
                Incapacidad #{selected.id}
              </h2>

              <p className="module-subtitle">
                {employeeName(
                  selected
                )}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={reviewing}
              onClick={
                () => {
                  setSelected(
                    null
                  );

                  setObservaciones(
                    ''
                  );
                }
              }
            >
              Cerrar
            </button>
          </div>

          <div className="asistencia-summary-grid">
            <div className="asistencia-summary-card">
              <h3>Periodo</h3>

              <p>
                {formatDate(
                  selected.fecha_inicio
                )}
                {' → '}
                {formatDate(
                  selected.fecha_fin
                )}
              </p>
            </div>

            <div className="asistencia-summary-card">
              <h3>Días</h3>

              <p>
                {selected.dias_calculados}
              </p>
            </div>

            <div className="asistencia-summary-card">
              <h3>Estado</h3>

              <p>
                {statusLabel(
                  selected.estado
                )}
              </p>
            </div>

            <div className="asistencia-summary-card">
              <h3>Comprobante</h3>

              <p>
                {selected.comprobante_nombre ||
                  'Sin comprobante'}
              </p>
            </div>
          </div>

          <div className="module-card">
            <p className="module-eyebrow">
              Motivo registrado
            </p>

            <p className="module-subtitle">
              {selected.motivo}
            </p>

            {selected.comprobante_key && (
              <div className="table-actions">
                <button
                  type="button"
                  className="action-btn"
                  onClick={
                    () =>
                      openProof(
                        selected
                      )
                  }
                >
                  Abrir comprobante
                </button>

                <span className="table-secondary-text">
                  {selected.comprobante_mime ||
                    'Archivo'}
                  {' · '}
                  {formatBytes(
                    selected.comprobante_tamano
                  )}
                </span>
              </div>
            )}
          </div>

          <section
            className="module-card"
            data-testid="incapacidad-validacion-automatica"
          >
            <div>
              <p className="module-eyebrow">
                Apoyo para Recursos Humanos
              </p>

              <h3 className="module-title">
                Validación automática
              </h3>

              <p className="module-subtitle">
                Revisión técnica del comprobante PDF.
                La decisión final continúa en manos
                de Recursos Humanos.
              </p>
            </div>

            <div className="table-actions">
              <span
                className={
                  `status-pill ${validationStatusClass(
                    selected.validacion_automatica
                  )}`
                }
              >
                {validationLabel(
                  selected.validacion_automatica
                )}
              </span>
            </div>

            <p className="table-secondary-text">
              {validationDescription(
                selected.validacion_automatica
              )}
            </p>

            <div className="asistencia-summary-grid">
              <div className="asistencia-summary-card">
                <h3>
                  Integridad técnica
                </h3>

                <p>
                  {validationScoreLabel(
                    selected.validacion_automatica
                  )}
                </p>
              </div>

              <div className="asistencia-summary-card">
                <h3>
                  Versión PDF
                </h3>

                <p>
                  {selected.validacion_automatica
                    ?.pdf_version ||
                    'No disponible'}
                </p>
              </div>

              <div className="asistencia-summary-card">
                <h3>
                  Duplicado exacto
                </h3>

                <p>
                  {selected.validacion_automatica
                    ?.duplicado_detectado
                    ? 'Detectado'
                    : 'No detectado'}
                </p>
              </div>
            </div>

            {selected.validacion_automatica
              ?.duplicado_detectado &&
              selected.validacion_automatica
                .duplicado_de_incapacidad_id ? (
                <p className="table-secondary-text">
                  Coincide exactamente con el archivo
                  de la incapacidad #
                  {selected.validacion_automatica
                    .duplicado_de_incapacidad_id}.
                  Esta coincidencia no implica por sí
                  sola fraude.
                </p>
              ) : null}

            {selected.validacion_automatica
              ?.motivos_revision?.length ? (
                <div>
                  <strong>
                    Motivos para revisión
                  </strong>

                  <ul>
                    {selected.validacion_automatica
                      .motivos_revision
                      .map(
                        reason => (
                          <li key={reason}>
                            {validationReasonLabel(
                              reason
                            )}
                          </li>
                        )
                      )}
                  </ul>
                </div>
              ) : null}

            <p className="table-secondary-text">
              Último análisis:{' '}
              {validationDateLabel(
                selected.validacion_automatica
                  ?.analizado_at
              )}
            </p>
          </section>

          {selected.estado ===
          'pendiente' ? (
            <div className="module-card incap-review-card">
              <p className="module-eyebrow">
                Revisión administrativa
              </p>

              <h3 className="module-title">
                Resolver solicitud
              </h3>

              <p className="module-subtitle">
                La observación es obligatoria
                para rechazar y opcional para
                aprobar.
              </p>

              <label>
                Observaciones administrativas

                <textarea
                  rows={5}
                  value={observaciones}
                  disabled={reviewing}
                  placeholder="Escribe la resolución de Recursos Humanos..."
                  onChange={
                    (event) =>
                      setObservaciones(
                        event.target.value
                      )
                  }
                />
              </label>

              <div className="table-actions">
                <button
                  type="button"
                  className="action-btn action-btn-success"
                  disabled={reviewing}
                  onClick={
                    () =>
                      resolve(
                        'aprobada'
                      )
                  }
                >
                  {reviewing
                    ? 'Procesando...'
                    : 'Aprobar'}
                </button>

                <button
                  type="button"
                  className="action-btn action-btn-danger"
                  disabled={reviewing}
                  onClick={
                    () =>
                      resolve(
                        'rechazada'
                      )
                  }
                >
                  {reviewing
                    ? 'Procesando...'
                    : 'Rechazar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="module-card">
              <p className="module-eyebrow">
                Resolución administrativa
              </p>

              <h3 className="module-title">
                {statusLabel(
                  selected.estado
                )}
              </h3>

              <p className="module-subtitle">
                {selected.observaciones_admin ||
                  'Sin observaciones administrativas.'}
              </p>

              <p className="table-secondary-text">
                Revisado por:
                {' '}
                {
                  [
                    selected.admin_nombre,
                    selected.admin_apellido,
                  ]
                    .filter(Boolean)
                    .join(' ') ||
                  (
                    selected
                      .revisado_por_admin_id
                      ? `Administrador #${selected.revisado_por_admin_id}`
                      : 'Administrador'
                  )
                }
                {' · '}
                {formatDateTime(
                  selected.revisado_at
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
