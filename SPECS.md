# SPECS.md — Entrega y verificación de EPP (impredimex-epp)

## Especificaciones funcionales del sistema

Este documento es la **fuente de verdad** del comportamiento de la aplicación.
Cualquier cambio futuro debe partir de actualizar primero estas specs y luego
implementar el código.

**Versión objetivo:** 2.0
**Fecha:** 4 de septiembre de 2026
**Metodología:** Spec-Driven Development (SDD)
**Revisión:** 2.0-b — se marcan como implementadas las specs entregadas en esta
versión y se agregan SPEC-010 y SPEC-011.

> **Cómo leer este documento.** Cada spec lleva un **Estado**. Las marcadas como
> `implementado` describen lo que la aplicación hace hoy. Las marcadas como
> `pendiente` describen el objetivo acordado y todavía no existen en el código.
> Conforme se implementen, se cambia la marca. La versión 1.1 de este documento,
> que describía únicamente el estado anterior, queda en el historial del
> repositorio.

---

## Contexto

Aplicación de una sola página (`index.html`, sin compilación) que registra la
verificación de equipo de protección personal y buenas prácticas de manufactura
por trabajador, turno y departamento.

A partir de la v2 la aplicación se conecta a **dos proyectos de Firebase**:

| Proyecto | Qué aporta |
|---|---|
| `impredimex-epp` | Realtime Database con sus datos: catálogo y registros |
| `impredimex-suite` | Autenticación y lista de personal (`colaboradores`) |

Sus datos propios **no se mueven** a la suite. Es deliberado: el plan gratuito
otorga cuota por proyecto, y concentrarlo todo colapsaría cinco cuotas en una.

---

## Convenciones del documento

- **Actor** — Quién ejecuta el flujo
- **Precondiciones** — Qué debe cumplirse antes de iniciar
- **Flujo principal** — Pasos exactos del comportamiento esperado
- **Postcondiciones** — Estado del sistema al terminar correctamente
- **Reglas de negocio** — Condiciones especiales y restricciones
- **Flujos alternativos** — Casos de error o rutas opcionales

---

# SPEC-001 — Acceso a la aplicación

**Estado:** implementado
**Sustituye a:** SPEC-001 y SPEC-002 de la v1.1 (contraseñas compartidas y
biometría sin identidad)

### Actor
Persona autorizada para operar EPP.

### Precondiciones
- Existe en `colaboradores` de la suite, con `estatus` igual a `ACTIVO`
- Su campo `apps` incluye `epp`
- Tiene cuenta en Firebase Auth con identificador `<noNomina>@impredimex.local`
- Conexión a internet

### Flujo principal
1. Sistema muestra la pantalla de acceso con dos campos: nómina y clave
2. Usuario escribe su número de nómina y su clave
3. Sistema compone `<nómina>@impredimex.local` e inicia sesión contra la suite
4. Sistema lee el documento del colaborador y valida estatus y permiso de `epp`
5. Sistema toma el papel de `roles.epp`
6. Sistema carga la lista de personal desde `colaboradores`
7. Sistema muestra la aplicación con la visibilidad correspondiente al papel

### Postcondiciones
- La sesión queda abierta y administrada por Firebase Auth
- La aplicación sabe **quién** está operando, no solo con qué papel
- La sesión sobrevive al recargar y al cerrar el navegador

### Reglas de negocio
- **Una persona, una cuenta.** Desaparecen las contraseñas compartidas. La
  aplicación deja de tener dos claves para dos papeles y pasa a tener una cuenta
  por operador.
- **Tener cuenta no da acceso.** Lo da el valor `epp` en el campo `apps`.
- **Ausencia de papel equivale a supervisor.** Nunca se concede privilegio por
  omisión.
- **Las claves no viven en el repositorio.** Las guarda Firebase cifradas.
- El identificador es la nómina; el dominio `@impredimex.local` no existe como
  dominio real y Firebase no envía correos ni lo verifica.
- **No hay autoservicio de recuperación.** El administrador restablece la clave
  desde la consola.
- **La sesión se guarda en el dispositivo.** Se usa persistencia local de Firebase
  Auth, así que cerrar el navegador no cierra la sesión. Salir es un acto
  explícito: el botón Salir.

### Flujos alternativos
- **Nómina o clave incorrecta:** "Nómina o clave incorrecta"
- **Cuenta sin permiso de EPP, o colaborador dado de baja:** el sistema cierra la
  sesión recién abierta y avisa que la cuenta no tiene acceso
- **Sin conexión:** no se puede iniciar sesión; una sesión ya abierta sigue válida

---

# SPEC-002 — Bloqueo local con biometría

**Estado:** implementado

### Actor
Usuario con sesión abierta en su dispositivo.

### Precondiciones
- Dispositivo con lector de huella o rostro compatible con WebAuthn
- Sesión de Firebase activa en ese dispositivo

### Flujo principal
1. Usuario registra su biometría desde la aplicación
2. Sistema guarda la credencial en el navegador, asociada a su nómina
3. Tras **30 minutos** sin actividad, el sistema bloquea la pantalla sin cerrar
   sesión
4. El usuario desbloquea con su huella o rostro
5. Sistema verifica que la credencial corresponda a la nómina de la sesión activa

### Postcondiciones
- La aplicación se desbloquea sin volver a teclear la clave
- La sesión de Firebase nunca se interrumpió

### Reglas de negocio
- **La biometría es un candado local, no un método de identificación.** Quien
  identifica a la persona ante el servidor es la sesión de Firebase, no la huella.
  Firebase no ofrece inicio de sesión con passkeys en producción, y la extensión
  de la comunidad que lo permite exige plan de pago y deja de existir en marzo
  de 2027.
- **Las credenciales viven en el navegador**, no en el servidor. Cambiar de
  dispositivo o borrar los datos obliga a registrarla de nuevo.
- **Es opcional.** La clave siempre funciona como alternativa.
- **Un dispositivo, una persona.** El bloqueo biométrico no está diseñado para
  equipos compartidos; para cambiar de operador se cierra sesión y se entra con
  la clave del siguiente.
- **La ventana de inactividad es de 30 minutos.** Se eligió pensando en un turno
  de piso: el supervisor deja el dispositivo entre una revisión y otra y no
  debería tener que desbloquear a cada rato. Cuenta cualquier toque, tecla o
  desplazamiento sobre la pantalla.
- **La credencial se asocia a la nómina, no al papel.** En la v1.1 se guardaba
  por papel (`admin` / `supervisor`), lo que permitía que la huella de una
  persona abriera la sesión de otra con el mismo papel.

### Flujos alternativos
- **Dispositivo sin biometría:** el bloqueo pide la clave en lugar de la huella
- **Huella no reconocida:** se puede desbloquear con la clave

---

# SPEC-003 — Registro de verificación de EPP

**Estado:** implementado

### Actor
Usuario con papel `SUPERVISOR` o `ADMIN`.

### Precondiciones
- Sesión iniciada
- Conexión a internet

### Flujo principal
1. Sistema muestra el nombre del supervisor **ya llenado**, tomado de la sesión,
   en un campo no editable
2. Usuario selecciona el turno: Matutino, Vespertino o Nocturno
3. Usuario busca al trabajador verificado, con autocompletado sobre `colaboradores`
4. Sistema toma el departamento del trabajador desde la suite
5. Sistema arma la cuadrícula de EPP aplicable a ese departamento
6. Usuario marca cada equipo como cumple, no cumple o no aplica
7. Usuario marca los puntos de buenas prácticas de manufactura
8. Si hubo incumplimiento, el sistema exige firma o rechazo (SPEC-004)
9. Usuario puede adjuntar fotografía y observaciones
10. Usuario guarda; el sistema escribe el registro en `imd_registros`

### Postcondiciones
- Se agrega un registro que incluye, además de lo que ya guardaba:
  `supNomina` y `trabNomina`

### Reglas de negocio
- **El supervisor no se escribe: se toma de la sesión.** Es el cambio central de
  la v2. Elimina la posibilidad de registrar a nombre de otra persona.
- **El registro guarda nómina y nombre, no una referencia.** Se conservan ambos
  tal como estaban al momento de guardar, igual que en Ingeniería de Procesos.
  Corregir después la lista de personal no altera el histórico.
- **Los registros anteriores a la v2 no tienen nómina.** No se migran: se quedan
  con el nombre que traen. Cualquier informe que cruce por nómina debe contemplar
  que el histórico viejo no la trae.
- El catálogo de EPP se filtra por departamento comparando texto exacto.
- Los puntos marcados como no aplica se excluyen del conteo de cumplimiento.

### Flujos alternativos
- **Sin conexión:** el guardado falla y se avisa. La aplicación no encola el
  registro para enviarlo después. Se mantiene el comportamiento actual.
- **Trabajador que no está en `colaboradores`:** no se puede registrar. Primero
  hay que darlo de alta en RRHH.

---

# SPEC-004 — Firma y evidencia

**Estado:** implementado, sin cambios en la v2

### Actor
Trabajador verificado, en el dispositivo del supervisor.

### Precondiciones
- Al menos un punto de EPP o de BPM marcado como incumplimiento

### Flujo principal
1. Sistema detecta el incumplimiento y habilita el área de firma
2. El trabajador firma con el dedo sobre la pantalla
3. Al guardar, la firma se almacena como imagen dentro del registro

### Reglas de negocio
- **La firma solo se pide cuando hay incumplimiento.**
- **El trabajador puede negarse a firmar.** El registro guarda `rechazada` y la
  negativa queda documentada.
- **La fotografía es opcional** en todos los casos.

### Flujos alternativos
- **Firma vacía:** no se permite guardar hasta firmar o rechazar explícitamente

---

# SPEC-005 — Papel del usuario dentro de la app

**Estado:** implementado
**Sustituye a:** SPEC-005 de la v1.1

### Actor
Sistema.

### Flujo principal
1. Al preparar la sesión, el sistema lee `roles.epp` del colaborador
2. Si el campo no existe, asume `SUPERVISOR`
3. Aplica la visibilidad correspondiente

### Postcondiciones
- `SUPERVISOR` ve Checklist y Exportar
- `ADMIN` ve además Historial y Catálogo

### Reglas de negocio
- **El papel es por app.** Una persona puede ser `ADMIN` aquí y `SUPERVISOR` en
  Ingeniería de Procesos. Cada app lee solo su entrada dentro de `roles`.
- **Se nombra desde la suite, no desde el código.** Cambiar un papel no requiere
  publicar la aplicación.
- **Cambiar un papel surte efecto en el siguiente inicio de sesión**, porque se
  lee una sola vez al entrar.
- **Ocultar el historial es una medida de rendimiento, no de confidencialidad.**
  Los registros no son información reservada. La pestaña se oculta al supervisor
  para no descargar todo el historial cada vez que alguien abre la aplicación,
  que es el consumo más pesado de la app. Las reglas de la base **no** deben
  restringir su lectura por papel: convertir una optimización en una restricción
  de seguridad complicaría el sistema sin proteger nada.

---

# SPEC-006 — Historial y corrección de registros

**Estado:** implementado

### Actor
Usuario con papel `ADMIN`.

### Flujo principal
1. Usuario abre la pestaña Historial
2. Sistema carga los registros por bloques, con botón para cargar más
3. Usuario puede buscar por trabajador
4. Usuario abre un registro y modifica los datos que necesite corregir
5. Al guardar, el sistema escribe una entrada en la bitácora del registro

### Postcondiciones
- El registro queda corregido
- El registro conserva una lista `correcciones` con una entrada por cada cambio:
  quién la hizo (nómina y nombre), cuándo, qué campo, valor anterior y valor nuevo

### Reglas de negocio
- **Corregir sigue siendo posible.** Los errores de captura existen y quitar esa
  capacidad genera más problemas de los que resuelve.
- **Toda corrección deja constancia.** El valor anterior no se pierde: se conserva
  junto al nuevo. Poder demostrar que un registro fue corregido, por quién y desde
  qué valor, vale más que impedir la corrección.
- **La bitácora no se puede editar ni borrar** desde la aplicación.
- **Borrar un registro completo sigue siendo posible para `ADMIN` y no deja
  rastro.** Es la única vía por la que un registro puede desaparecer sin
  constancia, y contradice el espíritu del resto de esta spec. Se conserva el
  comportamiento de la v1.1 porque cambiarlo no estaba acordado; queda anotado
  como punto abierto en la deuda técnica (#12).
- **El supervisor original sí es corregible**, pero la corrección queda asentada
  con la misma constancia que cualquier otra.

---

# SPEC-007 — Exportación

**Estado:** implementado, sin cambios en la v2

### Actor
Cualquier usuario con sesión iniciada.

### Flujo principal
1. Usuario abre la pestaña Exportar y elige el periodo
2. Sistema genera un archivo XLSX con los registros del periodo

### Reglas de negocio
- Disponible para ambos papeles, incluido `SUPERVISOR`, que no ve el historial
  dentro de la aplicación pero sí puede exportarlo.
- **No es una inconsistencia, es intencional.** El historial se oculta para no
  cargarlo en cada apertura; la exportación descarga los datos una sola vez y
  bajo demanda, que es justo el consumo que se quería evitar. El contenido nunca
  fue confidencial.

---

# SPEC-008 — Reglas de acceso a los datos

**Estado:** implementado en la aplicación; **pendiente de configuración** en la
consola de Firebase (App Check con reCAPTCHA, proveedor Anónimo y publicación de
las reglas). Hasta que eso ocurra, la aplicación funciona pero la base sigue
abierta.
**Nuevo en la v2**

### Actor
Sistema.

### Precondiciones
- App Check habilitado en el proyecto `impredimex-epp` con reCAPTCHA

### Flujo principal
1. Al arrancar, la aplicación inicia sesión **anónima** en el proyecto de EPP,
   además de la sesión real de la persona en la suite
2. Cada petición a la base viaja con esa sesión y con el testigo de App Check
3. Las reglas exigen ambas cosas para conceder lectura o escritura

### Postcondiciones
- La base deja de estar abierta a quien conozca su dirección
- Las peticiones que no vengan de esta aplicación son rechazadas

### Reglas de negocio
- **Las reglas distinguen entre la aplicación y el resto del mundo, no entre
  usuarios.** Las reglas viven en `impredimex-epp` y la autenticación real en
  `impredimex-suite`; un proyecto no valida los tokens del otro. Resolverlo con
  identidad por usuario exigiría duplicar todas las cuentas en ambos proyectos,
  o Cloud Functions, que requiere plan de pago.
- **La trazabilidad no depende de estas reglas.** Que cada registro quede
  estampado con la nómina de quien opera se resuelve en la aplicación leyendo la
  sesión de la suite (SPEC-003). Las reglas no participan en eso.
- **Riesgo aceptado conscientemente.** Un operador con conocimientos técnicos
  podría escribir directo a la base saltándose la interfaz. Son quince empleados
  de confianza; el riesgo relevante era el desconocido en internet con la
  dirección de la base tomada del repositorio público, y ese queda cerrado.
- **La verificación del papel sigue siendo del lado de la aplicación.** No es una
  frontera de seguridad, es una frontera de interfaz.
- **La sesión anónima no identifica a nadie** ni debe usarse para nada más que
  satisfacer las reglas.

### Flujos alternativos
- **Falla el inicio de sesión anónimo:** la aplicación no puede leer ni escribir
  y debe avisarlo con claridad, no fallar en silencio

### Orden de puesta en marcha
El orden importa y no se puede invertir:

1. Publicar esta versión de la aplicación, con App Check en modo **monitoreo**.
2. Verificar en la consola que las peticiones llegan con testigo válido.
3. Hasta entonces, activar la exigencia de App Check y publicar las reglas.

Aplicar las reglas antes del paso 1 deja sin leer ni escribir a la versión que
está en producción, que no inicia sesión de ninguna clase.

> **Ruta de mejora.** Si algún día el proyecto pasa a plan de pago, Cloud
> Functions permite emitir credenciales del proyecto de EPP a partir de la sesión
> de la suite, y las reglas pasarían a distinguir por usuario sin duplicar
> cuentas. El diseño de la aplicación no cambiaría; solo estas reglas.

---

# SPEC-009 — Purga automática de imágenes

**Estado:** implementado, confirmado sin cambios

### Flujo principal
1. Sistema busca registros con más de 90 días
2. Borra sus fotografías y firmas, conservando el resto del registro

### Reglas de negocio
- **El propósito es contener el crecimiento de la base**, que en el plan gratuito
  tiene 1 GB. Las imágenes se guardan codificadas dentro del propio registro.
- **El borrado es permanente y silencioso.** No hay aviso previo ni respaldo.

> **Decidido.** La ventana de 90 días se mantiene. Queda constancia de que la
> evidencia visual de un incumplimiento firmado no sobrevive más de ese plazo,
> aunque el registro y el hecho de que hubo firma sí se conservan.

---

# SPEC-010 — Tablero de indicadores

**Estado:** pendiente
**Nuevo en la v2**

### Antecedente
La v1.1 traía en el código un tablero completo —total de revisiones, porcentaje
de cumplimiento, revisiones del día, gráfica de tendencia de ocho semanas, barras
por EPP y por departamento, y lista de reincidentes— que **nunca se mostró**:
nada lo invocaba y sus contenedores no existían en el HTML. Se retiró en la v2
junto con la biblioteca de gráficas que solo él usaba.

### Regla de negocio que condiciona su regreso
- **No puede alimentarse del historial completo.** Calcular estos números sobre
  todos los registros obliga a descargarlos en cada apertura, que es justo el
  consumo que la SPEC-005 evita ocultándole el Historial al supervisor. Volver a
  encenderlo así desharía esa decisión.
- La vía viable es un **acumulado** que se actualice al guardar cada registro:
  contadores por semana, por departamento y por tipo de EPP, más el conteo de
  incumplimientos por trabajador. Leer eso cuesta unas cuantas lecturas, no miles.

### Pendiente de definir
Qué indicadores se quieren de verdad, quién los ve y con qué corte de tiempo.

---

# SPEC-011 — Catálogo de EPP

**Estado:** implementado
**Nuevo en la v2** — documenta una pestaña que la v1.1 tenía sin especificar

### Actor
Usuario con papel `ADMIN`.

### Flujo principal
1. Usuario abre la pestaña Catálogo
2. Agrega, edita o da de baja equipo de protección, indicando a qué
   departamentos aplica
3. Los cambios se guardan en `imd_catalogo_epp`, en el proyecto de EPP

### Reglas de negocio
- **El catálogo de EPP sí vive en esta app.** Es dato propio de EPP, no de la
  suite.
- **El personal ya no se administra aquí.** La v1.1 permitía agregar, editar y
  dar de baja trabajadores desde esta pestaña, guardándolos en `imd_personal`.
  Eso desaparece: la lista válida es `colaboradores` en la suite y solo RRHH la
  escribe. En su lugar la pestaña muestra un aviso con enlace a RRHH.
- **Los departamentos se comparan como texto exacto.** Un acento o una mayúscula
  distinta entre el catálogo y `colaboradores` deja al trabajador sin equipo
  asignado, y falla en silencio.

---

# SPEC-012 — Instalación como aplicación

**Estado:** implementado
**Nuevo en la v2**

### Flujo principal
1. Usuario abre la dirección de EPP en el navegador
2. El navegador ofrece instalarla; en iOS se agrega desde Compartir → Añadir a
   pantalla de inicio
3. La app queda con su propio icono, se abre sin barra de navegador y en
   vertical

### Reglas de negocio
- **El icono distingue a esta app de las demás.** Las cinco comparten marca, así
  que si todas usaran el logotipo de IMPREDIMEX el usuario tendría cinco iconos
  idénticos en su pantalla. El de EPP es un casco de seguridad, y las otras
  cuatro llevan un glifo propio con silueta deliberadamente distinta: personas
  para RRHH, barras de Gantt para Procesos, lupa para Calidad y engrane para
  Mantenimiento.
- **Relleno sólido, no contorno.** Un trazo delgado se ve bien a 512 píxeles y
  se rompe a 48, que es el tamaño al que el icono trabaja de verdad en la barra
  de tareas. Sin texto dentro del icono por la misma razón.
- **Instalable no significa que funcione sin conexión.** El service worker sirve
  la pantalla desde caché para que abra rápido, pero guardar un registro,
  consultar el historial o iniciar sesión siempre necesitan alcanzar Firebase.
  No hay cola de envíos pendientes.
- **La caché va con la red por delante.** Al revés, una versión vieja del
  `index.html` se quedaría pegada en los dispositivos y las correcciones no
  llegarían a nadie. En una app que se publica editando un solo archivo, ese es
  el riesgo real, no el ahorro de tráfico.

---

# Deuda técnica conocida

| # | Tema | Estado en la v2 |
|---|---|---|
| 1 | Contraseñas en el código | **Se resuelve** (SPEC-001) |
| 2 | Sin identidad individual | **Se resuelve** (SPEC-001, SPEC-003) |
| 3 | Trazabilidad declarativa | **Se resuelve** (SPEC-003, SPEC-006) |
| 4 | Personal duplicado | **Resuelto**: `imd_personal` y la lista de 121 nombres escrita en el código desaparecen |
| 5 | Base sin reglas | **Se resuelve parcialmente** (SPEC-008): se cierra a extraños, no se distingue por usuario |
| 6 | Ediciones sin rastro | **Se resuelve** (SPEC-006) |
| 7 | Histórico sin nómina | **Se acepta**: los registros viejos conservan solo el nombre |
| 8 | Sin modo sin conexión | **Sigue pendiente**: un guardado sin red se pierde |
| 9 | Imágenes dentro de la base | **Sigue pendiente**: obliga a la purga de 90 días |
| 10 | Departamento como texto | **Sigue pendiente**: un acento distinto deja a un trabajador sin equipo |
| 11 | Repositorio público | **Sigue pendiente** hasta migrar el hosting, pero ya no expone contraseñas |
| 12 | Borrar registros no deja rastro | **Punto abierto** (SPEC-006): un `ADMIN` puede eliminar una revisión sin constancia |
