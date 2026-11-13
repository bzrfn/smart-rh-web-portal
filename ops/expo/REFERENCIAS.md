# Dirección y alcance

Referencia dominante: interfaz existente de SMART RH: src/app/styles.css y src/components/SmartRhIcon.tsx, capturas del portal aportadas por Brandon. Conservar azul #0a57a4 para acciones, verde azulado para estados/acentos, lienzo azul claro, tipografía sans-serif y navegación de módulos. No cambiar el producto operativo.

Referencias secundarias: guías de formularios, foco, accesibilidad y contenido del paquete refero-design. Investigación Refero en vivo no disponible (NO_SUBSCRIPTION). Se usan las fuentes existentes y guías incluidas, sin atribuir referencias externas no consultadas.

| Decisión | Referencia | Aplicación |
|---|---|---|
| Azul/teal, iconos y contenedores | SMART RH existente | Identidad visual coherente con el proyecto |
| Presentación con evidencia de producto | Solicitud del usuario / formulario Expo pregunta 12 | Capturas públicas y botón a recorrido |
| Cuenta de muestra pública | Propuesta autorizada por usuario | Identidad local, sin contraseña secreta ni cuenta real |
| Banner persistente | Alcance de simulación | Informar datos ficticios y acciones locales |
| Foco visible, labels y diálogo nativo | Guía craft-details | Navegación accesible y confirmaciones claras |
| Pantallas responsivas | Capturas usuario / proyecto móvil | Lectura en móvil y escritorio |

Esta reproducción no ejecuta el backend de SMART RH. No implica que se haya creado un rol seguro de solo lectura en la API real. La entrada es pública; las cuentas solo seleccionan la vista de la simulación. CSP bloquea conexiones HTTP/WebSocket desde la demo. No se leen tokens, cookies o claves del portal. No se envían correos, archivos ni consultas a APIs.
