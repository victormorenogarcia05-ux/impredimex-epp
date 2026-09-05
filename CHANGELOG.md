# Changelog

Todos los cambios relevantes de la aplicación de EPP (`impredimex-epp`).

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [Versionado Semántico](https://semver.org/lang/es/).

---

## [2.0.0] — 2026-09-04

Integración con la suite Impredimex. Es un cambio mayor: desaparecen las
contraseñas compartidas y la lista de personal propia de esta app.

### Agregado

- Acceso con nómina y clave personal contra Firebase Auth del proyecto
  `impredimex-suite` (SPEC-001). La sesión sobrevive al recargar y al cerrar el
  navegador, y se cierra con el botón Salir del encabezado.
- Bloqueo de pantalla a los 30 minutos de inactividad, que se abre con huella o
  con la clave sin cerrar la sesión de Firebase (SPEC-002).
- Los registros guardan `supNomina` y `trabNomina` además de los nombres
  (SPEC-003), como copia y no como referencia: corregir después la lista de
  personal no altera el histórico.
- Bitácora de correcciones. Cada registro conserva una lista `correcciones` con
  quién la hizo, cuándo, qué campo, valor anterior y valor nuevo (SPEC-006).
- Sesión anónima en el proyecto de EPP y soporte de App Check, para que las
  reglas puedan exigir ambas cosas (SPEC-008).
- Carga inicial del historial por bloques y botón «Cargar más». La función
  existía desde la v1.1, pero el botón nunca se dibujaba, así que la paginación
  era inalcanzable (SPEC-006).
- SPEC-011, que documenta la pestaña Catálogo, hasta ahora sin especificar.
- Instalación como aplicación en PC, Android e iOS, con icono propio
  (SPEC-012). La app no tenía `manifest.json` ni service worker, así que hasta
  ahora no era instalable de ninguna forma.

### Cambiado

- El supervisor ya no se escribe: se toma de la sesión y el campo no es
  editable. Es el cambio central de la versión y elimina la posibilidad de
  registrar a nombre de otra persona (SPEC-003).
- El trabajador se busca sobre `colaboradores` de la suite. Si no está en esa
  lista no se puede registrar; primero hay que darlo de alta en RRHH.
- Los papeles pasan de `admin` / `supervisor` a `ADMIN` / `SUPERVISOR`, leídos
  de `roles.epp` en la suite. La ausencia de papel equivale a `SUPERVISOR`.
- La credencial biométrica se asocia a la nómina y no al papel. Antes, la huella
  de una persona abría la sesión de cualquiera con el mismo papel.
- La pestaña Catálogo administra únicamente el equipo de protección. El personal
  remite a la app de RRHH.

### Eliminado

- Las dos contraseñas compartidas que estaban escritas en el código de un
  repositorio público.
- La lista de 121 nombres con su departamento, escrita en el código.
- El nodo `imd_personal` de la Realtime Database y la pantalla que permitía
  agregar, editar y dar de baja trabajadores desde esta app.
- El tablero de indicadores: unas 120 líneas que nunca se mostraron, porque nada
  las invocaba y sus contenedores no existían en el HTML. Vuelve como SPEC-010,
  alimentado por un acumulado y no por el historial completo.
- Chart.js, que solo usaba ese tablero y se descargaba en cada apertura.

### Pendiente de configurar

La aplicación funciona en cuanto se publica, pero la SPEC-008 no queda cerrada
hasta hacer tres cosas en la consola de Firebase, **en este orden**:

1. Habilitar el proveedor Anónimo en `impredimex-epp`.
2. Registrar App Check con reCAPTCHA v3 y poner la clave de sitio en
   `APPCHECK_SITE_KEY`, dejando App Check en modo monitoreo.
3. Verificado el monitoreo, activar la exigencia y publicar
   `database.rules.json`.

Publicar las reglas antes de que esta versión esté en producción deja sin leer
ni escribir a la que está en línea hoy, que no inicia sesión de ninguna clase.

---

## [1.1.0] — anterior a este archivo

Versión con contraseñas compartidas, lista de personal escrita en el código y
biometría asociada al papel. Su comportamiento está descrito en la versión 1.1
de `SPECS.md`, que queda en el historial del repositorio.
