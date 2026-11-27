# Entrega de la demo para Expo Ingenierías

El job SMART-RH-Expo valida el portal y publica la compilación estática de la demo en un staging local. El Jenkinsfile utiliza el agente de la práctica con etiqueta `agente-python`, Python 3.9 o posterior, el cliente Docker y el daemon DinD. Los archivos pasan al daemon mediante la API de Docker. El agente puede tener un sistema de archivos distinto.

Con Jenkins, Gitea y DinD en línea, ejecuta desde el checkout del portal en la Mac:

```bash
python3 ops/devops/laboratorio/configurar.py
```

El configurador usa el usuario y token de API de Jenkins, un token de Gitea con lectura del usuario y escritura de repositorios, y la credencial SCM de Jenkins `gitea-cred` para leer el espejo. Puedes elegir otra con `--credencial`. La URL del staging en la Mac es http://127.0.0.1:8094/expo/. El puerto 8094 dentro de DinD lo usa Nginx y el proxy de la Mac publica su propio puerto 8094 solo en loopback.

| Parámetro ACCION | Resultado |
| --- | --- |
| STAGING | Ejecuta Jest, compila el portal y la demo, despliega la demo y verifica por HTTP el SHA-256 de cada archivo. Archiva el recibo y presenta JUnit. |
| PREPARAR_AWS | Repite las validaciones, espera una aprobación y archiva el ZIP del candidato verificado. |
| REVERTIR_STAGING | Vuelve a la última versión distinta activada y verifica su contenido. |

Cada revisión queda registrada en el volumen `smartrh-expo-ensayo-v1-sitio`. La selección activa se actualiza mediante un enlace atómico y el diario permite recuperar una activación interrumpida. Conserva el volumen para retener el historial. El ZIP aprobado incluye el publicador existente de `ops/expo`, su manifiesto y el contenido validado. Para comprobar un ZIP extraído ejecuta `python3 desplegar_aws.py --check-package` desde el directorio que contiene el publicador.
