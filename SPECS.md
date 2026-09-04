# SPECS.md — Entrega y verificación de EPP (impredimex-epp)

## Especificaciones funcionales del sistema

Este documento es la **fuente de verdad** del comportamiento de la aplicación.
Cualquier cambio futuro debe partir de actualizar primero estas specs y luego
implementar el código.

**Versión:** 1.1
**Fecha:** 4 de septiembre de 2026
**Metodología:** Spec-Driven Development (SDD)

> **Nota de origen.** Esta es documentación retroactiva. La aplicación se
> construyó antes de adoptar SDD y está en uso productivo, así que estas specs
> describen **lo que hace hoy**, no lo que debería hacer. Los problemas
> detectados no se corrigieron al documentar: quedaron anotados como deuda
> técnica para resolverse por separado y a propósito.

---

## Contexto

Aplicación de una sola página (`index.html`, 2099 líneas, sin compilación) que
registra la verificación de equipo de protección personal y buenas prácticas de
manufactura por trabajador, turno y departamento.

Datos en Firebase Realtime Database, proyecto `impredimex-epp`, en tres nodos:

| Nodo | Contenido |
|---|---|
| `imd_personal` | Lista de trabajadores: nombre y departamento |
| `imd_catalogo_epp` | Catálogo de equipo, con los departamentos donde aplica |
| `imd_registros` | Registros de verificación |

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

### Actor
Cualquier persona que abra la dirección de la aplicación.

### Precondiciones
- Conocer una de las dos contraseñas compartidas

### Flujo principal
1. Sistema muestra una pantalla de bloqueo con un campo de contraseña
2. Usuario escribe la contraseña y presiona Entrar, o la tecla Enter
3. Sistema compara el texto contra dos valores fijos en el código
4. Si coincide con el primero, asigna el rol `admin`; si coincide con el segundo,
   asigna `supervisor`
5. Sistema aplica la visibilidad correspondiente al rol y muestra la aplicación

### Postcondiciones
- La variable `currentRole` contiene `admin` o `supervisor`
- Se muestra una insignia con el rol en la cabecera
- La sesión dura lo que dure la pestaña abierta

### Reglas de negocio
- **El acceso es por contraseña compartida, no por persona.** No existe el
  concepto de usuario individual. La aplicación no sabe quién está operando.
- **Solo hay dos roles**, determinados por cuál de las dos contraseñas se escribió.
- **No hay cierre de sesión ni caducidad.** La sesión termina al cerrar la pestaña.
- Ambas contraseñas están escritas en el código fuente, en un repositorio público.

### Flujos alternativos
- **Contraseña incorrecta:** el sistema no concede acceso y permite reintentar,
  sin límite de intentos ni bloqueo
- **Acceso por biometría:** ver SPEC-002

---

# SPEC-002 — Acceso por biometría

### Actor
Usuario que ya entró con contraseña al menos una vez en ese dispositivo.

### Precondiciones
- Dispositivo con lector de huella o reconocimiento facial compatible con WebAuthn
- Credencial registrada previamente en ese mismo dispositivo

### Flujo principal
1. Estando dentro de la aplicación, el usuario registra su biometría
2. Sistema genera una credencial WebAuthn y la guarda en el almacenamiento local
   del navegador
3. En aperturas posteriores, la pantalla de bloqueo ofrece entrar con biometría
4. El usuario se autentica con su huella o rostro
5. Sistema concede el rol asociado a la credencial registrada

### Postcondiciones
- El usuario entra sin escribir la contraseña

### Reglas de negocio
- **La biometría es un atajo del dispositivo, no una identidad.** Confirma que
  quien abre es el dueño del dedo registrado en ese aparato, pero la aplicación
  no guarda de quién se trata ni lo asocia a ninguna persona del personal.
- **Las credenciales viven en el navegador**, no en el servidor. Cambiar de
  dispositivo o borrar los datos del navegador obliga a registrarla de nuevo.
- **No sustituye a la contraseña**, la complementa: la contraseña sigue funcionando
  y sigue siendo la que otorga el rol.

### Flujos alternativos
- **Dispositivo sin biometría o sin credencial registrada:** la opción no se
  muestra y se entra con contraseña

---

# SPEC-003 — Registro de verificación de EPP

### Actor
Usuario con rol `supervisor` o `admin`.

### Precondiciones
- Sesión iniciada
- Conexión a internet

### Flujo principal
1. Usuario escribe el nombre del supervisor que realiza la verificación, con
   ayuda de autocompletado sobre la lista de personal
2. Usuario selecciona el turno: Matutino, Vespertino o Nocturno
3. Usuario escribe el nombre del trabajador verificado, con autocompletado
4. Sistema toma el departamento del trabajador desde `imd_personal`
5. Sistema arma la cuadrícula de EPP aplicable a ese departamento
6. Usuario marca cada equipo como cumple, no cumple o no aplica
7. Usuario marca los puntos de buenas prácticas de manufactura
8. Si hubo algún incumplimiento, el sistema exige firma o rechazo explícito
   (SPEC-004)
9. Usuario puede adjuntar una fotografía y observaciones en texto libre
10. Usuario guarda; el sistema escribe el registro en `imd_registros`

### Postcondiciones
- Se agrega un registro con: marca de tiempo, fecha, hora, semana del año,
  supervisor, turno, trabajador, departamento, lista de faltantes, lista de no
  aplicables, conteos de cumplimiento, estado de cada punto de EPP y de BPM,
  observaciones, fotografía y firma
- El formulario se limpia y queda listo para el siguiente trabajador

### Reglas de negocio
- **El catálogo de EPP se filtra por departamento.** Cada equipo declara en qué
  departamentos aplica, y la comparación es por texto exacto contra el
  departamento del trabajador.
- **El supervisor se declara, no se autentica.** Es un campo de texto: quien opera
  puede escribir cualquier nombre de la lista, incluido uno que no sea el suyo.
- **Los puntos marcados como no aplica se excluyen del conteo** de cumplimiento.
- Las personas se identifican **por nombre**, no por número de nómina. El registro
  guarda el nombre en texto.

### Flujos alternativos
- **Sin conexión:** el guardado falla y se muestra un aviso. La aplicación no
  guarda el registro para enviarlo después.
- **Trabajador que no está en la lista:** no se puede registrar

---

# SPEC-004 — Firma y evidencia

### Actor
Trabajador verificado, en el dispositivo del supervisor.

### Precondiciones
- Al menos un punto de EPP o de BPM marcado como incumplimiento

### Flujo principal
1. Sistema detecta el incumplimiento y habilita el área de firma
2. El trabajador firma con el dedo sobre la pantalla
3. Al guardar, la firma se almacena como imagen dentro del registro

### Postcondiciones
- El registro conserva la firma como evidencia del incumplimiento notificado

### Reglas de negocio
- **La firma solo se pide cuando hay incumplimiento.** Una verificación sin
  hallazgos se guarda sin firma.
- **El trabajador puede negarse a firmar.** En ese caso el registro guarda el
  valor `rechazada` en lugar de la imagen, y la negativa queda documentada.
- **La fotografía es opcional** y siempre lo es, haya o no incumplimiento.

### Flujos alternativos
- **Firma vacía:** el sistema no permite guardar hasta firmar o rechazar
  explícitamente

---

# SPEC-005 — Visibilidad por rol

### Actor
Sistema.

### Flujo principal
1. Al conceder el acceso, el sistema evalúa el rol
2. Si es `supervisor`, oculta las pestañas de Historial y Catálogo

### Postcondiciones
- El rol `supervisor` ve Checklist y Exportar
- El rol `admin` ve además Historial y Catálogo

### Reglas de negocio
- **La restricción es visual, no de datos.** Se ocultan pestañas en la interfaz,
  pero las reglas de la base de datos no distinguen roles: quien tenga la
  dirección de la base puede leer y escribir todo.
- Solo el rol `admin` puede modificar el catálogo de EPP y la lista de personal.

---

# SPEC-006 — Historial y corrección de registros

### Actor
Usuario con rol `admin`.

### Flujo principal
1. Usuario abre la pestaña Historial
2. Sistema carga los registros por bloques, con botón para cargar más
3. Usuario puede buscar por trabajador
4. Usuario puede abrir un registro y modificar sus datos, incluido el supervisor

### Postcondiciones
- El registro queda modificado en la base

### Reglas de negocio
- **Los registros se pueden editar después de guardados**, incluyendo el nombre
  del supervisor que realizó la verificación.
- **No queda rastro de la edición**: no se guarda quién la hizo, cuándo, ni cuál
  era el valor anterior.

---

# SPEC-007 — Exportación

### Actor
Cualquier usuario con sesión iniciada.

### Flujo principal
1. Usuario abre la pestaña Exportar y elige el periodo
2. Sistema genera un archivo XLSX con los registros del periodo

### Reglas de negocio
- La exportación está disponible para ambos roles, incluido `supervisor`, que no
  puede ver el historial dentro de la aplicación pero sí puede exportarlo.

---

# SPEC-008 — Purga automática de imágenes

### Actor
Sistema, al iniciar la aplicación.

### Flujo principal
1. Sistema busca registros con más de 90 días de antigüedad
2. Borra sus fotografías y firmas, conservando el resto del registro

### Postcondiciones
- Los registros viejos conservan sus datos pero pierden la evidencia visual

### Reglas de negocio
- **El propósito es contener el crecimiento de la base**, que en el plan gratuito
  tiene 1 GB. Las imágenes se guardan codificadas dentro del propio registro.
- **El borrado es permanente y silencioso.** No hay aviso previo ni respaldo.
- **90 días puede ser insuficiente para efectos legales.** La evidencia de un
  incumplimiento firmado desaparece a los tres meses; si la evidencia se requiere
  para un procedimiento laboral posterior, ya no existe.

---

# Deuda técnica conocida

| # | Tema | Detalle |
|---|---|---|
| 1 | Contraseñas en el código | Las dos contraseñas compartidas están en un repositorio público. |
| 2 | Sin identidad individual | La aplicación no sabe quién opera. El supervisor es un campo escrito a mano y editable después, así que la trazabilidad es declarativa, no verificable. |
| 3 | Personal identificado por nombre | Los registros guardan el nombre en texto, no el número de nómina. Un cambio de nombre rompe el vínculo con el histórico. |
| 4 | Personal duplicado | `imd_personal` es una copia propia del personal, independiente de la suite. |
| 5 | Base sin reglas | Al no haber autenticación, las reglas de la base no pueden restringir por usuario. |
| 6 | Ediciones sin rastro | Modificar un registro no deja constancia de quién ni cuándo. |
| 7 | Sin modo sin conexión | Un guardado sin red se pierde. En piso esto ocurre. |
| 8 | Imágenes dentro de la base | Fotografías y firmas se guardan codificadas en el registro, no en almacenamiento de archivos. Es lo que obliga a la purga de 90 días. |
| 9 | Departamento como texto | El filtrado del catálogo compara cadenas exactas. Un acento o mayúscula distinta deja a un trabajador sin equipo asignado. |
