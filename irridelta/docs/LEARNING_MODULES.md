# Learning Modules And Capacitaciones Admin

Este documento describe en detalle el modulo de administracion de capacitaciones. La idea es que una persona nueva pueda tocar este flujo sin tener que redescubrir como se conectan UI, estado, validaciones, Supabase y vistas cliente.

No incluir secretos, valores de `.env`, claves de Supabase, tokens ni datos privados en este archivo.

## Objetivo Del Modulo

Una `capacitacion` es un contenido de formacion que se arma desde el panel admin. Cada capacitacion tiene:

- Datos generales: titulo, descripcion y estado de publicacion.
- Uno o mas modulos.
- Recursos por modulo: archivos y links de YouTube.
- Una prueba obligatoria por modulo.
- Una prueba final obligatoria, guardada como certificacion asociada a la capacitacion.

Del lado cliente, solo se muestran capacitaciones publicadas. Las certificaciones finales visibles tambien salen de capacitaciones publicadas.

## Rutas Principales

- `/admin/capacitaciones`: listado admin de capacitaciones.
- `/admin/capacitaciones/nueva`: editor para crear una capacitacion.
- `/admin/capacitaciones/:capacitacionId/editar`: editor para una capacitacion existente.
- `/capacitaciones`: catalogo cliente de capacitaciones publicadas.
- `/certificaciones`: catalogo cliente de certificaciones finales asociadas a capacitaciones publicadas.
- `/certificaciones/:certificationId`: flujo de examen cliente.

El acceso admin esta protegido por `ProtectedRoute` en `src/App.jsx` y por el rol `USER_ROLES.ADMIN`.

## Navegacion Admin

La navegacion admin esta agrupada en `src/components/Navbar.jsx` bajo un solo dropdown `Admin`.

Items actuales del dropdown:

- Productos: `/admin/productos`
- Capacitaciones: `/admin/capacitaciones`
- Certificaciones: `/admin/certificaciones`
- Admin KB: `/admin/kb`

El dropdown existe tanto en desktop como en mobile. La seccion se marca activa si la ruta actual coincide con alguno de los items admin. Si se agrega una ruta admin nueva, hay que agregarla al arreglo `children` del item `Admin` y tambien al arreglo `adminItems` usado para calcular el estado activo.

## Archivos Relevantes

Paginas:

- `src/pages/AdminCapacitacionesList.jsx`: listado, busqueda, acciones de crear, editar, duplicar y eliminar capacitaciones.
- `src/pages/AdminCapacitacionEditor.jsx`: carga una capacitacion existente, crea el formulario inicial o prepara una duplicacion. Tambien maneja bloqueo de navegacion por cambios sin guardar.
- `src/pages/Capacitaciones.jsx`: vista cliente para capacitaciones publicadas.
- `src/pages/Certificaciones.jsx`: vista cliente para certificaciones finales publicadas.
- `src/pages/CertificationExam.jsx`: experiencia de rendir una certificacion.

Componentes admin:

- `src/components/AdminLearningManager.jsx`: componente principal del editor. Maneja tabs, estado visual, guardado, publicacion, preview y apertura de modales de prueba.
- `src/components/ModuleCard.jsx`: edicion visual de un modulo, recursos y resumen de prueba del modulo.
- `src/components/AssessmentModal.jsx`: modal grande para editar una prueba.
- `src/components/AssessmentEditor.jsx`: campos compartidos de prueba: cantidad de preguntas a mostrar, porcentaje de aprobacion, duracion y preguntas.
- `src/components/AssessmentSummaryCard.jsx`: resumen de una prueba.
- `src/components/CapacitacionPreviewModal.jsx`: preview admin sin salir del editor.
- `src/components/UnsavedChangesModal.jsx`: modal de confirmacion al salir con cambios.

Utilidades y servicios:

- `src/utils/adminCapacitacionesForm.js`: construccion, normalizacion, duplicacion, serializacion y validaciones de completitud del formulario.
- `src/utils/assessments.js`: logica comun de preguntas y pruebas.
- `src/utils/certifications.js`: calculos del examen cliente: cantidad de preguntas, aprobacion, duracion y formato.
- `src/services/learningContentService.js`: lectura, guardado, eliminacion, subida de archivos y persistencia de capacitaciones/modulos/recursos/certificaciones.

## Estructura Del Editor

El editor esta dividido en tres tabs:

- `Datos generales`
- `Modulos`
- `Evaluacion final`

Cada tab tiene un estado visual `Completo` o `Pendiente`. Ese estado no es decorativo: se calcula desde las mismas reglas que bloquean publicacion.

Las funciones centrales estan en `AdminLearningManager.jsx`:

- `getGeneralSectionComplete(form)`
- `getModulesSectionComplete(form)`
- `getFinalAssessmentSectionComplete(form)`
- `getPublishBlockInfo(form)`

`getPublishBlockInfo(form)` devuelve la primera seccion incompleta y el mensaje que explica por que no se puede publicar.

## Reglas De Publicacion

Una capacitacion se puede guardar como borrador aunque todavia no este completa. No se puede publicar si alguna seccion esta pendiente.

Para publicar, deben cumplirse todas estas condiciones:

- Datos generales completos: la capacitacion debe tener `titulo`.
- Modulos completos: debe existir al menos un modulo, todos los modulos deben tener titulo y cada modulo debe tener su prueba completa.
- Evaluacion final completa: debe tener titulo, preguntas validas, cantidad de preguntas a mostrar valida, porcentaje de aprobacion valido y duracion valida.

UI:

- El boton `Publicar` queda deshabilitado cuando la capacitacion no esta publicada y `getPublishBlockInfo(form)` devuelve un bloqueo.
- Si esta publicada, el mismo boton permite volver a borrador.
- El `title` del boton deshabilitado muestra el motivo de bloqueo.

Validacion de guardado:

- `validateForm()` en `AdminLearningManager.jsx` vuelve a validar antes de persistir.
- Si `form.publicada` es `true` y hay algo pendiente, el guardado no avanza y lleva al admin a la tab correspondiente.
- Esta doble proteccion es intencional: UI para guiar, validacion para proteger datos.

## Estado Del Formulario

El formulario base se construye en `src/utils/adminCapacitacionesForm.js`.

Funciones importantes:

- `createEmptyModule(index)`: crea un modulo vacio con una prueba inicial.
- `createEmptyFinalCertification()`: crea la prueba final inicial.
- `getInitialCapacitacionForm(type)`: crea el formulario completo para alta.
- `buildFormFromCapacitacion(item, type)`: adapta datos de Supabase al formulario del editor.
- `buildDuplicateForm(item, type)`: prepara una copia sin ids persistidos.
- `serializeCapacitacionForm(form)`: serializa los campos relevantes para detectar cambios sin guardar.

El editor mantiene al menos un modulo en el formulario. Si el admin elimina el ultimo modulo, se reemplaza por un modulo vacio. Esto evita estados raros de UI, pero el guardado igualmente valida que exista al menos un modulo con titulo.

`isCollapsed` vive solo en UI. No se guarda en la base.

`selectedFiles` tambien vive solo en UI. Representa archivos elegidos pero todavia no subidos.

## Modulos

Cada modulo contiene:

- `clientId`: id local para React cuando todavia no hay id de base.
- `id`: id real de Supabase o `null` si es nuevo.
- `titulo`
- `descripcion`
- `youtubeLinksText`: textarea con un link por linea.
- `selectedFiles`: archivos elegidos localmente antes de guardar.
- `recursos`: recursos ya persistidos.
- `isCollapsed`: estado visual.
- Campos de prueba: `preguntas`, `cantidad_preguntas_a_mostrar`, `porcentaje_aprobacion`, `duracion_maxima_minutos`.

La tarjeta de modulo (`ModuleCard.jsx`) muestra:

- Estado completo/pendiente.
- Motivo si esta pendiente.
- Conteo de links/videos y archivos.
- Resumen de prueba: preguntas cargadas, preguntas a mostrar, aprobacion y duracion.
- Acceso al modal de prueba.

## Recursos De Modulo

Tipos soportados:

- `archivo`
- `youtube`

Los links de YouTube se ingresan uno por linea. Al guardar, `normalizeYoutubeResources(module)` genera un recurso por link.

Los archivos permitidos se controlan con `ALLOWED_RESOURCE_EXTENSIONS` en `learningContentService.js`:

- `pdf`
- `docx`
- `pptx`
- `xlsx`
- `jpg`
- `png`
- `mp4`

La UI valida extensiones al seleccionar archivos y el servicio vuelve a validar antes de subir. Mantener ambas validaciones.

Los archivos se suben al bucket `LEARNING_BUCKET`, definido en `learningContentService.js`. El path incluye el id de la capacitacion, el indice del modulo, un id unico y el nombre sanitizado.

## Pruebas Compartidas

La logica de pruebas esta centralizada en `src/utils/assessments.js` y se usa tanto para pruebas de modulo como para la prueba final.

Tipos de pregunta:

- `multiple_choice`
- `true_false`

Limites y defaults:

- `MAX_QUESTIONS = 100`
- `MIN_OPTIONS = 2`
- `MAX_OPTIONS = 6`
- `MAX_DURATION_MINUTES = 600`
- `DEFAULT_PASSING_SCORE = 70`
- `DEFAULT_DURATION_MINUTES = 30`

Campos comunes:

- `preguntas`
- `porcentaje_aprobacion`
- `duracion_maxima_minutos`

Campos de cantidad a mostrar:

- Modulos: `cantidad_preguntas_a_mostrar`
- Prueba final: `cantidad_preguntas_examen`

`AssessmentEditor.jsx` muestra el campo de cantidad solo si recibe `countFieldKey`. Por eso:

- El modal de modulo pasa `countFieldKey="cantidad_preguntas_a_mostrar"`.
- El modal de prueba final pasa `countFieldKey="cantidad_preguntas_examen"`.

No crear una segunda logica para la prueba final. Si se cambia el comportamiento de preguntas, primero revisar `assessments.js`, `AssessmentEditor.jsx` y `AssessmentModal.jsx`.

## Validacion De Pruebas

La validacion comun esta en `validateAssessment(assessment, options)`.

Valida:

- Al menos una pregunta.
- No superar `MAX_QUESTIONS`.
- Si `includeQuestionCount` esta activo, que la cantidad a mostrar este entre 1 y la cantidad total de preguntas.
- Porcentaje de aprobacion entre 1 y 100.
- Duracion entre 1 y `MAX_DURATION_MINUTES`.
- Enunciado obligatorio por pregunta.
- En multiple choice, minimo de opciones y ninguna opcion vacia.

Para modulos:

```js
validateAssessment(module, {
  name: `El test del modulo "${module.titulo}"`,
  includeQuestionCount: true,
  questionCountKey: "cantidad_preguntas_a_mostrar",
  questionCountLabel: "La cantidad de preguntas a mostrar del test del modulo",
});
```

Para prueba final:

```js
validateAssessment(certification, {
  name: "El test final",
  includeQuestionCount: true,
  questionCountKey: "cantidad_preguntas_examen",
  questionCountLabel: "La cantidad de preguntas a mostrar del test final",
});
```

## Prueba Final

La prueba final se guarda en la tabla `certificaciones` con `capacitacion_id`.

En el admin se edita desde la tab `Evaluacion final` y se abre en el mismo `AssessmentModal` que las pruebas de modulo.

Campos importantes:

- `titulo`
- `descripcion`
- `preguntas`
- `cantidad_preguntas_examen`
- `porcentaje_aprobacion`
- `duracion_maxima_minutos`

La cantidad `cantidad_preguntas_examen` define cuantas preguntas rinde el cliente. `CertificationExam.jsx` usa `getCertificationExamQuestionCount(certification)` para limitar el examen y luego elige preguntas aleatorias con `shuffleQuestions(...).slice(0, totalQuestions)`.

Si `cantidad_preguntas_examen` falta o es invalida, el cliente cae al fallback de usar todas las preguntas disponibles. En el admin actual, el campo es obligatorio y se valida antes de publicar/guardar como publicada.

## Importar Preguntas Desde Modulos

La tab `Evaluacion final` permite importar preguntas listas desde los modulos.

Flujo en `importModuleQuestionsToFinal()`:

1. Toma todas las preguntas de modulos.
2. Filtra con `isQuestionReadyForImport`.
3. Compara contra preguntas ya existentes usando `getQuestionFingerprint`.
4. Genera copias nuevas con `buildImportedQuestion`.
5. Si la prueba final tenia una unica pregunta vacia inicial, la reemplaza.
6. Si ya tenia preguntas reales, agrega solo las nuevas.

Esto evita duplicados por contenido y evita arrastrar ids de preguntas originales.

Importante: importar preguntas no ajusta automaticamente la cantidad a mostrar mas alla de las reglas del editor. Si se importan muchas preguntas, el admin debe revisar `cantidad_preguntas_examen`.

## Guardado

La persistencia vive en `src/services/learningContentService.js`.

Flujo general de `saveLearningItem(item)`:

1. Arma payload de capacitacion con `titulo`, `descripcion`, `publicada` y `updated_at`.
2. Valida modulos con `validateLearningModules(modules)`.
3. Exige que exista `item.certificacion`.
4. Si la capacitacion existe, actualiza la fila padre.
5. Si es nueva, inserta la fila padre.
6. Llama a `replaceCapacitacionModules(data.id, modules)`.
7. Llama a `upsertFinalCertification(data.id, item.certificacion)`.
8. Rehidrata la capacitacion desde Supabase con `hydrateCapacitaciones`.

`replaceCapacitacionModules(capacitacionId, modules)`:

- Obtiene recursos anteriores.
- Calcula archivos que se removieron.
- Borra recursos anteriores.
- Borra modulos anteriores.
- Elimina archivos removidos del bucket cuando corresponde.
- Inserta modulos nuevos en orden.
- Sube archivos nuevos.
- Inserta recursos de YouTube y archivo.

Este enfoque reemplaza modulos/recursos completos en cada guardado. Es simple para MVP, pero no es transaccional.

`upsertFinalCertification(capacitacionId, certification)`:

- Valida la prueba final.
- Arma payload con preguntas, aprobacion, duracion y cantidad de preguntas de examen.
- Busca certificacion existente por `capacitacion_id`.
- Si existe, actualiza.
- Si no existe, inserta.

## Lectura

`fetchLearningItems(type, options)` decide que leer segun `LEARNING_TYPES`.

Para capacitaciones:

- Lee `capacitaciones`.
- Si `options.onlyPublished` esta activo, filtra `publicada = true`.
- Llama a `hydrateCapacitaciones`.

`hydrateCapacitaciones(capacitaciones)`:

- Lee modulos relacionados.
- Lee recursos relacionados.
- Lee certificaciones relacionadas.
- Agrupa modulos por `capacitacion_id`.
- Agrupa recursos por `modulo_id`.
- Asocia una certificacion final por capacitacion.

Para certificaciones:

- Lee `certificaciones`.
- Si `onlyPublished` esta activo, primero obtiene capacitaciones publicadas y filtra certificaciones por esos ids.

## Eliminacion

`deleteLearningItem(item)` decide por tipo.

Si el item es una capacitacion:

1. Lee recursos asociados.
2. Borra certificacion asociada.
3. Borra recursos de modulos.
4. Borra modulos.
5. Borra archivos del bucket cuando tienen `archivo_path`.
6. Borra la capacitacion.

Si el item es una certificacion suelta:

- Borra en tabla `certificaciones`.

## Preview Admin

El editor puede abrir una preview sin salir de la pagina. Esto evita perder el contexto de edicion.

La preview usa `CapacitacionPreviewModal.jsx`, que reutiliza el mismo componente presentacional que el catalogo cliente. La decision es intencional para que admin y cliente vean el contenido con el mismo criterio visual.

## Cambios Sin Guardar

`AdminCapacitacionEditor.jsx` compara el formulario actual contra una serializacion inicial.

La serializacion esta en `serializeCapacitacionForm(form)` e incluye:

- Datos generales.
- Estado publicado.
- Modulos.
- Recursos existentes.
- Archivos seleccionados.
- Preguntas de modulos.
- Cantidad a mostrar, aprobacion y duracion de modulos.
- Prueba final, incluyendo `cantidad_preguntas_examen`.

Si se agregan campos nuevos al formulario, hay que agregarlos a `serializeCapacitacionForm`, o el modal de cambios sin guardar puede no detectar modificaciones.

## Reglas Para Tocar Este Modulo

- No duplicar logica de pruebas: usar `assessments.js`.
- No guardar secretos ni valores de entorno en docs o codigo.
- Si se agrega un campo persistido, actualizar formulario inicial, normalizacion, serializacion, guardado, lectura y docs.
- Si se agrega un recurso nuevo, actualizar constantes de tipos, UI, normalizacion y persistencia.
- Si se cambia publicacion, revisar UI y validacion de guardado.
- Si se cambia `cantidad_preguntas_examen`, revisar tambien `CertificationExam.jsx` y `utils/certifications.js`.
- Si se cambia `cantidad_preguntas_a_mostrar`, revisar pruebas de modulo y `ModuleCard.jsx`.
- Mantener el boton publicar bloqueado cuando alguna seccion esta pendiente.
- Mantener el guardado protegido para no persistir una capacitacion publicada incompleta.

## Tradeoffs Actuales

- El guardado de modulos y recursos reemplaza filas en vez de editar incrementalmente.
- Las escrituras multi-tabla no son transaccionales desde el frontend.
- Las subidas a Storage y escrituras en DB no son atomicas.
- No hay progreso de upload.
- No hay limite de peso de archivo en UI.
- No hay ordenamiento manual de recursos.
- No hay reutilizacion de recursos entre modulos.
- No se generan certificados PDF.

## Mejoras Futuras Posibles

- Mover guardado multi-tabla a una RPC o funcion de Postgres.
- Agregar rollback/cleanup mas robusto para fallos parciales.
- Agregar progreso y limite de peso para archivos.
- Agregar controles de orden para recursos.
- Dividir `AdminLearningManager.jsx` en componentes mas chicos.
- Agregar tests automatizados para normalizacion y validacion de pruebas.
- Agregar paginacion si crece el volumen de capacitaciones.

## Checklist Para Cambios Futuros

Cuando alguien toque administracion de capacitaciones, revisar:

- `npm run build` pasa.
- El dropdown admin sigue mostrando Capacitaciones.
- Una capacitacion nueva arranca con un modulo y una prueba final.
- No se puede publicar si Datos generales esta pendiente.
- No se puede publicar si Modulos esta pendiente.
- No se puede publicar si Evaluacion final esta pendiente.
- Se puede guardar borrador incompleto.
- Se puede publicar cuando todo esta completo.
- Las pruebas de modulo respetan `cantidad_preguntas_a_mostrar`.
- La prueba final respeta `cantidad_preguntas_examen`.
- El preview abre sin perder cambios.
- El aviso de cambios sin guardar aparece al navegar si corresponde.
- Los archivos invalidos se rechazan antes de guardar.
- Las certificaciones cliente solo aparecen para capacitaciones publicadas.
