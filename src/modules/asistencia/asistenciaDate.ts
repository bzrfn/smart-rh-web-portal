export function formatAttendanceDate(
  value?: string | null
) {
  if (
    value === null ||
    value === undefined ||
    !String(value).trim()
  ) {
    return 'Sin fecha';
  }

  const normalized =
    String(value).trim();

  /*
   * `fecha` representa un día calendario proveniente de
   * una columna DATE. No debe interpretarse como un instante,
   * porque una conversión de zona horaria podría cambiar
   * accidentalmente el día mostrado.
   *
   * Aceptamos tanto:
   *   2026-09-22
   * como:
   *   2099-12-30T06:00:00.000Z
   */
  const match =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/
    );

  if (!match) {
    return normalized;
  }

  const [
    ,
    year,
    month,
    day,
  ] = match;

  return `${day}/${month}/${year}`;
}
