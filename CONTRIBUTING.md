# Colaboración en SMART RH — Portal

## Ramas y revisión

`main` representa la versión estable. Crear una rama corta por objetivo, subirla, abrir un pull request hacia main y revisar personalmente el diff. Fusionar cuando CI esté verde, los comentarios resueltos y la revisión personal concluida. No se exige aprobación externa mientras el desarrollo sea individual. No hacer commits ni push directos a main.

Usar `feature/descripcion` para funcionalidades, `fix/descripcion` para errores, `docs/descripcion` para documentación y `chore/descripcion` para mantenimiento. No se añade una rama develop permanente; se puede incorporar posteriormente si el equipo necesita una integración independiente.

## Comandos habituales

Con la copia de trabajo limpia:

```bash
git switch main
git pull --ff-only origin main
git switch -c fix/descripcion-concreta
# Editar y validar.
git diff --check
git diff
# Seleccionar rutas concretas, por ejemplo:
git add ruta/del/archivo
git diff --cached
git commit -m "fix(modulo): describir el resultado"
git push -u origin "$(git branch --show-current)"
```

Crear el PR en GitHub. Nunca usar `git add .` sin revisar los archivos que se incluirán. No usar force push en main ni reescribir historia compartida. Si main avanzó, integrar `origin/main` en la rama mediante merge y volver a validar, sin forzar el historial de otros integrantes.

## Commits

Cada commit debe tener un propósito verificable. Ejemplos: `fix(auth): corregir contraste del acceso administrativo`, `feat(incapacidades): permitir adjuntar comprobante`, `docs: documentar configuracion SMTP`, `chore(ci): agregar validaciones de pull requests`.

Un PR puede contener varios commits relacionados. Separar correo público y estilos en commits distintos ayuda a revisar; cuando son objetivos independientes, preferir también PRs separados. El PR de correo y estilos ya subido puede cerrarse como una excepción de transición, sin reescribir sus commits.

## Validación de este repositorio

Comandos del pipeline:

```bash
npm ci
npm test
npm run build
```

Check requerido: `portal-ci`. CI usa Node 24 y los archivos de bloqueo del repositorio. Esto no cambia automáticamente el runtime productivo. No configura secretos de AWS, no ejecuta Terraform ni despliega producción.

Las pruebas del backend en CI son unitarias. La validación móvil es de tipos, no una compilación de Android/iOS ni una prueba en dispositivo. Pruebas de integración, sistema, aceptación y revisiones visuales deben registrarse como evidencias adicionales según el cambio.

## Integración y despliegue

Integrar mediante PR revisado personalmente y con CI correcto. Se recomienda Squash and merge para dejar un commit por PR en main, preservando el detalle en el PR. Si el equipo necesita conservar cada commit del PR, puede usar merge commit; aplicar un criterio consistente.

Después de integrar: actualizar main local con `git pull --ff-only origin main`. Desplegar desde el commit integrado en main, registrar su SHA y comprobar el resultado. Un push o un merge no despliega AWS con este pipeline.

Para incidentes, crear una rama hotfix desde main y pasar por PR/CI. Para recuperar, preferir un PR con `git revert` o el mecanismo de respaldo del despliegue; no usar reset y force push sobre main.

## Protección de main

Una vez que el workflow esté integrado y el check de main haya terminado bien: exigir PR, cero aprobaciones externas, check `portal-ci` y resolución de conversaciones. Bloquear force push y borrado, incluyendo administradores. La protección debe activarse en GitHub; este documento por sí solo no la aplica.

El flujo individual conserva el PR para revisar el diff y las evidencias; no se intenta aprobar el propio PR ni se exige aprobación del último push por otra persona. El desarrollador puede integrarlo cuando CI pase. Si posteriormente se incorpora otro colaborador, podrá acordarse una revisión independiente.
