# SMART RH - Expo Ingenierías

## Qué se publica

La entrada `expo/index.html` es una presentación pública con capturas y un recorrido interactivo para evaluadores. El diseño conserva la identidad de SMART RH. La demo es una reproducción de flujos, no un usuario del sistema de producción ni una copia de sus bases de datos.

- Administrador de muestra: `evaluador@demo.example`.
- Empleado de muestra: `empleado@demo.example`.
- Contraseña pública para ambas vistas: `ExpoSMART2026!`.
- Las cuentas son selectores locales de una simulación pública; esta contraseña no protege información privada.
- No hay JWT, invitaciones reales, acceso a MySQL/MongoDB ni cambios en la lista de excepciones 2FA de revisión de las tiendas.
- La sesión de interfaz dura dos horas. Los datos se guardan en `sessionStorage` bajo una clave exclusiva. Al recargar hay que volver a entrar; se conserva el estado de muestra de esa pestaña.
- No se envían correos, archivos o mensajes. Los PDFs se generan en el navegador con marcas de demostración.
- Max usa respuestas locales limitadas y tickets simulados. No consulta IA, conocimiento ni APIs reales.
- Asistencia QR, revisión documental, nómina y transformación de datos son recorridos simulados, identificados como tales. El conteo de días de solicitud es ilustrativo con días naturales.
- Las tres capturas públicas son del entorno de demostración y solo contienen nombres ficticios.

## Desarrollo

Reutiliza React/Vite del repositorio y los iconos de `src/components/SmartRhIcon.tsx`, pero tiene entrada, estilos, estado y compilación independientes. No importa `AuthContext` ni `services/api`.

```
npm ci --no-audit --no-fund
npm run check:expo
python3 ops/expo/deploy.test.py
npm run build:expo
```

La salida se genera en `dist-expo/`. La compilación operativa `npm run build` conserva su salida en `dist/` sin incluir esta demo.

## Publicación

El instalador del paquete crea un worktree, valida, abre un PR y, con `--integrar`, lo integra por squash una vez aprobado `portal-ci`. Después genera `SMART_RH_Expo_Demo_AWS.zip` con el build cotejado y el commit integrado.

En el Mac:

```
cd /Users/brandonbernal/Downloads
unzip -oq "SMART_RH_Expo_Demo.zip"
python3 SMART_RH_Expo_Demo/aplicar_mac.py --portal "/Users/brandonbernal/Downloads/rrhh-web-portal-v3" --integrar
```

El resultado imprime `ZIP_AWS=/Users/brandonbernal/Downloads/SMART_RH_Expo_Demo_AWS.zip`. Sube ese archivo a CloudShell.

CloudShell:

```
cd /home/cloudshell-user
unzip -oq "SMART_RH_Expo_Demo_AWS.zip"
python3 -u SMART_RH_Expo_Demo_AWS/desplegar_aws.py --apply
```

El script valida cuenta AWS, alias/origen CloudFront, API /ready y manifiesto. Sube únicamente claves `expo/`, respaldando versiones anteriores de esas claves. El archivo `index.html` del portal principal se verifica sin modificarlo. La invalidación se limita a `/expo/*`. No se cambian configuraciones de CloudFront, EC2, DNS, IAM ni bases de datos. El índice de la demo se sube después de sus dependencias.

Compartir únicamente cuando la salida muestre `DEMO_PUBLICA_VERIFICADA=OK` y `URL_PARA_COMPARTIR`:

https://portal.smart-rh.com.mx/expo/index.html

Si la invalidación queda pendiente, no vuelvas a compilar ni a registrar el PR:

```
python3 -u SMART_RH_Expo_Demo_AWS/desplegar_aws.py --verificar
```

## Cierre posterior a la evaluación

```
python3 -u SMART_RH_Expo_Demo_AWS/desplegar_aws.py --retirar
```

Sustituye la entrada pública por un aviso de cierre y conserva una copia previa en `backups/expo/<id>/`. No elimina datos ni afecta el portal. Una demo estática pública puede ser descargada; retirar su entrada no revoca copias locales. No hay cuentas privadas que revocar en esta simulación.

## Validación realizada

- TypeScript sin errores y build Vite de la demo.
- 11 pruebas del modelo, límites de rol de interfaz, flujos y aislamiento estático.
- 8 pruebas del publicador S3/CloudFront con almacenamiento simulado, condiciones de concurrencia, reintento y restauración.
- 182 pruebas existentes del portal; TypeScript y build operativo conservados.
- Navegador de escritorio: entrada preactivada, cambio de vista, solicitud creada por empleado y aprobada por administrador, ticket con folio y respuesta/resolución, reinicio, modo oscuro y descarga PDF.
- PDF descargado inspeccionado con Poppler: una página, encabezado y marca sin validez laboral.
- Presentación pública y carga de sus tres imágenes comprobadas visualmente.
- Estilos responsivos implementados; no se verificó en dispositivo móvil físico.
- Publicación AWS y verificación de URL requieren ejecutar el paquete en CloudShell.

No se incorporaron capturas de empleados reales, contraseñas, tokens, conexiones ni datos privados.
