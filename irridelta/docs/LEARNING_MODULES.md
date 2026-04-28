# Learning Modules And Capacitaciones Admin

Este documento describe el modulo de administracion de capacitaciones y certificaciones. La idea es que una persona nueva pueda tocar este flujo sin redescubrir como se conectan UI, estado, validaciones, Supabase y vistas cliente.

No incluir secretos, valores de `.env`, claves de Supabase, tokens ni datos privados.

## Objetivo Del Modulo

Una `capacitacion` es un contenido de formacion armado desde el panel admin. Cada capacitacion tiene:

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
- `/admin/certificaciones`: solicitudes de certificados.

El acceso admin esta protegido por `ProtectedRoute` en `src/App.jsx` y por `USER_ROLES.ADMIN`.

## Navegacion Admin

La navegacion admin esta agrupada en `src/components/Navbar.jsx` bajo un dropdown `Admin`.

Items actuales:

- Productos: `/admin/productos`
- Capacitaciones: `/admin/capacitaciones`
- Certificaciones: `/admin/certificaciones`
- Admin KB: `/admin/kb`

Si se agrega una ruta admin nueva, agregarla al `children` del item `Admin` y a `adminItems`, que calcula el estado activo.

## Archivos Relevantes

Paginas:

- `src/pages/AdminCapacitacionesList.jsx`: listado, filtros, preview y eliminacion de capacitaciones.
- `src/pages/AdminCapacitacionEditor.jsx`: carga una capacitacion existente, alta nueva, duplicacion y bloqueo por cambios sin guardar.
- `src/pages/Capacitaciones.jsx`: vista cliente para capacitaciones publicadas.
- `src/pages/Certificaciones.jsx`: vista cliente para certificaciones finales publicadas.
- `src/pages/CertificationExam.jsx`: experiencia de rendir una certificacion y solicitar certificado si aprueba.

Componentes admin:

- `src/components/AdminLearningManager.jsx`: editor principal, tabs, publicacion, guardado, preview y modales de prueba.
- `src/components/ModuleCard.jsx`: edicion visual de modulo, recursos y resumen de prueba.
- `src/components/AssessmentModal.jsx`: modal grande para editar una prueba.
- `src/components/AssessmentEditor.jsx`: campos compartidos de prueba.
- `src/components/AssessmentSummaryCard.jsx`: resumen de prueba.
- `src/components/CapacitacionPreviewModal.jsx`: preview admin sin salir del editor.
- `src/components/UnsavedChangesModal.jsx`: confirmacion al salir con cambios.

Servicios y utilidades:

- `src/services/learningContentService.js`: lectura, guardado, eliminacion, storage y persistencia de capacitaciones/modulos/recursos/certificaciones.
- `src/services/certificationRequestService.js`: alta, lectura, aprobacion y rechazo de solicitudes de certificado.
- `src/utils/adminCapacitacionesForm.js`: construccion, normalizacion, duplicacion, serializacion y completitud del formulario.
- `src/utils/assessments.js`: logica comun de preguntas y pruebas.
- `src/utils/certifications.js`: calculos del examen cliente.
- `src/utils/certificateDownloads.js`: generacion de certificado PNG/PDF en navegador.

## Editor De Capacitaciones

El editor se divide en tres tabs:

- `Datos generales`
- `Modulos`
- `Evaluacion final`

Cada tab muestra `Completo` o `Pendiente`. Ese estado se calcula con:

- `getGeneralSectionComplete(form)`
- `getModulesSectionComplete(form)`
- `getFinalAssessmentSectionComplete(form)`
- `getPublishBlockInfo(form)`

Una capacitacion se puede guardar como borrador aunque este incompleta. No se puede publicar si alguna seccion esta pendiente.

Para publicar, debe cumplirse:

- La capacitacion tiene titulo.
- Existe al menos un modulo.
- Todos los modulos tienen titulo.
- Cada modulo tiene prueba completa.
- La evaluacion final tiene titulo y prueba completa.

El boton `Publicar` queda deshabilitado si hay bloqueo. Si la capacitacion ya esta publicada, el mismo boton permite volver a borrador. `validateForm()` vuelve a proteger el guardado para que no se persista contenido publicado incompleto.

## Estado Del Formulario

El formulario base vive en `src/utils/adminCapacitacionesForm.js`.

Funciones importantes:

- `createEmptyModule(index)`
- `createEmptyFinalCertification()`
- `getInitialCapacitacionForm(type)`
- `buildFormFromCapacitacion(item, type)`
- `buildDuplicateForm(item, type)`
- `serializeCapacitacionForm(form)`

El editor mantiene al menos un modulo en UI. `isCollapsed` y `selectedFiles` son estado local de UI y no se guardan directamente como columnas.

Si se agrega un campo nuevo al formulario, agregarlo a `serializeCapacitacionForm` para que el aviso de cambios sin guardar lo detecte.

## Modulos Y Recursos

Cada modulo contiene datos de contenido y una prueba:

- `titulo`
- `descripcion`
- `youtubeLinksText`
- `selectedFiles`
- `recursos`
- `preguntas`
- `cantidad_preguntas_a_mostrar`
- `porcentaje_aprobacion`
- `duracion_maxima_minutos`

Tipos de recurso:

- `archivo`
- `youtube`

Extensiones permitidas:

- `pdf`
- `docx`
- `pptx`
- `xlsx`
- `jpg`
- `png`
- `mp4`

La UI valida extensiones al seleccionar archivos y el servicio vuelve a validar antes de subir. Mantener ambas validaciones.

## Pruebas Compartidas

La logica de pruebas esta centralizada en `src/utils/assessments.js`.

Tipos de pregunta:

- `multiple_choice`
- `true_false`

Limites:

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

`AssessmentEditor.jsx` muestra el input de cantidad solo si recibe `countFieldKey`. No crear una logica paralela para prueba final: se usa el mismo editor que los modulos.

`validateAssessment()` valida preguntas, opciones, porcentaje, duracion y cantidad a mostrar.

## Prueba Final

La prueba final se guarda en `certificaciones` con `capacitacion_id`.

Campos importantes:

- `titulo`
- `descripcion`
- `preguntas`
- `cantidad_preguntas_examen`
- `porcentaje_aprobacion`
- `duracion_maxima_minutos`

`CertificationExam.jsx` usa `getCertificationExamQuestionCount(certification)` para decidir cuantas preguntas rendir y toma preguntas aleatorias con `shuffleQuestions(...).slice(0, totalQuestions)`.

## Importar Preguntas Desde Modulos

La tab `Evaluacion final` permite importar preguntas listas desde modulos.

Flujo:

1. Toma preguntas de modulos.
2. Filtra con `isQuestionReadyForImport`.
3. Evita duplicados usando `getQuestionFingerprint`.
4. Copia preguntas con `buildImportedQuestion`.
5. Reemplaza la pregunta vacia inicial si corresponde.

Importar preguntas no debe ajustar silenciosamente `cantidad_preguntas_examen`; el admin debe revisarlo.

## Guardado

`saveLearningItem(item)` en `learningContentService.js`:

1. Valida datos generales, modulos y pruebas.
2. Guarda o actualiza la fila padre de `capacitaciones`.
3. Reemplaza modulos y recursos con `replaceCapacitacionModules`.
4. Sube archivos nuevos a Storage.
5. Upsertea la certificacion final con `upsertFinalCertification`.
6. Rehidrata la capacitacion con `hydrateCapacitaciones`.

Tradeoff actual: modulos y recursos se reemplazan completos en cada guardado. Es simple para MVP, pero no es transaccional.

## Flujo De Solicitud De Certificado

La evaluacion final y el certificado son cosas separadas:

- La evaluacion prueba que el usuario aprobo.
- La solicitud pide validacion admin para emitir el certificado.
- La descarga queda disponible solo despues de aprobar.

Flujo MVP:

1. El cliente rinde `/certificaciones/:certificationId`.
2. Si aprueba, ve `Obtener certificado`.
3. Completa `Nombre y apellido`.
4. `certificationRequestService.js` crea una fila en `certification_requests` con `status = pending`.
5. El admin entra a `/admin/certificaciones`.
6. Ve solicitudes pendientes, aprobadas y rechazadas.
7. El admin puede aprobar.
8. El admin puede rechazar con motivo.
9. Si se rechaza, el cliente puede volver a solicitar.
10. Si se aprueba, se puede descargar PNG o PDF.

Notas:

- No hay envio de email en este MVP.
- No hay historial persistido de intentos de examen.
- `certification_requests` denormaliza `certification_title` y `capacitacion_title`.
- PNG usa `canvas`.
- PDF se genera en navegador sin dependencias externas.
- Una futura subtab cliente `Mis certificaciones` puede reutilizar `fetchUserCertificationRequest` y `certificateDownloads.js`.

## Eliminacion

`deleteLearningItem(item)` borra capacitaciones junto con certificacion, modulos, recursos y archivos asociados cuando corresponde.

Si se borra una certificacion o capacitacion, las solicitudes de certificado deberian caer por `on delete cascade` segun el schema recomendado.

## Checklist Para Cambios Futuros

- `npm run build` pasa.
- El dropdown admin sigue mostrando Capacitaciones.
- Una capacitacion nueva arranca con un modulo y una prueba final.
- No se puede publicar si Datos generales, Modulos o Evaluacion final esta pendiente.
- Se puede guardar borrador incompleto.
- Se puede publicar cuando todo esta completo.
- Las pruebas de modulo respetan `cantidad_preguntas_a_mostrar`.
- La prueba final respeta `cantidad_preguntas_examen`.
- El preview abre sin perder cambios.
- El aviso de cambios sin guardar aparece al navegar si corresponde.
- Los archivos invalidos se rechazan antes de guardar.
- Las certificaciones cliente solo aparecen para capacitaciones publicadas.
- Las solicitudes de certificado se pueden aprobar/rechazar desde Admin Certificaciones.
- Un certificado aprobado descarga PNG y PDF.

## No Hacer Salvo Que Se Pida

- No implementar reutilizacion de recursos.
- No agregar email hasta elegir proveedor.
- No agregar historial persistido de intentos salvo pedido explicito.
- No exponer secretos ni valores de entorno.
