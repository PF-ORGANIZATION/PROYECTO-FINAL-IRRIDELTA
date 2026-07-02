# Chatbot y Knowledge Base: Deep Dive

Este documento describe en detalle la feature de chatbot y base de conocimientos
de IRRIDELTA. No incluye secretos, llaves, tokens, correos privados ni contenido
real de los documentos cargados.

La informacion operativa esta expresada por ambiente para que sirva en
desarrollo, staging o produccion. Los ejemplos usan placeholders como
`<supabase_url>`, `<project_ref>`, `<frontend_domain>` y
`<production_branch>` en lugar de valores reales de cuentas, dominios o deploys.

Diagramas importables en draw.io:

- `docs/diagrams/chatbot_kb.drawio`

## Resumen ejecutivo

La feature esta formada por dos flujos principales:

1. **Admin KB** (`/admin/kb`): un administrador sube PDFs, Markdown, TXT o texto
   manual. El frontend extrae texto, sube el archivo a Supabase Storage, crea un
   registro en `archivos_fuente`, genera chunks y embeddings en un Web Worker, y
   guarda los fragmentos en `documentos_kb`.
2. **Chatbot RAG**: cualquier usuario autenticado ve un widget flotante. Cuando
   pregunta algo, el navegador genera un embedding con `Supabase/gte-small`,
   llama al RPC `buscar_contexto_kb`, arma un prompt con el contexto recuperado y
   delega la llamada al LLM a la Edge Function `chat`, que actua como proxy seguro
   hacia Groq para no exponer `GROQ_API_KEY`.

Puntos criticos de diseno:

- El RAG corre mayormente en el navegador. El backend solo hace busqueda SQL/RPC
  y proxy a Groq.
- El embedding se calcula en el cliente con `@xenova/transformers`, no en una
  funcion server-side.
- La Edge Function `chat` debe responder `OPTIONS` para CORS y exigir
  autorizacion en `POST`.
- La URL real de Supabase debe provenir de variables de entorno del ambiente, no
  de este documento.

## Validacion por ambiente

### Frontend hosting

Verificar en cada ambiente:

- El proyecto frontend usa root directory `irridelta`.
- Framework preset: `Vite`.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Production branch: `<production_branch>`.
- Variables configuradas:
  - `VITE_SUPABASE_URL=<supabase_url>`
  - `VITE_SUPABASE_KEY=<supabase_anon_or_publishable_key>`
  - `VITE_ENABLE_PUBLIC_REGISTRATION=false`, salvo decision explicita.

Build esperado:

- `npm ci` ejecutado correctamente.
- `npm run build` / `vite build` completa correctamente.
- El bundle publica assets de la app, worker de embeddings y worker PDF.
- Warnings de chunks grandes o auditoria de dependencias quedan revisados.

Rutas a verificar:

- `/` devuelve HTML de la SPA.
- `/productos` devuelve HTML de la SPA.
- `/admin/kb` devuelve HTML de la SPA, confirmando que el rewrite SPA funciona
  para deep links. La proteccion real de esa pantalla queda en el cliente/Auth.

### Supabase y Edge Function

Verificar en cada proyecto Supabase destino:

- El frontend compila contra el `VITE_SUPABASE_URL` del ambiente correcto.
- La Edge Function `/functions/v1/chat` responde `OPTIONS 200`.
- Un `POST` sin Authorization a `/functions/v1/chat` devuelve `401` con
  error de falta de autorizacion.
- Un `POST` con key publica del ambiente, pero con body invalido, devuelve `400`
  por `messages` requerido. Esto confirma que:
  - El endpoint existe.
  - La key publica pertenece a ese backend.
  - La llamada llega al codigo de la funcion.
  - La prueba no consumio Groq porque fallo antes de validar/generar respuesta.
- `supabase db advisors --linked --type security` no reporta bloqueantes.
- `supabase db advisors --linked --type performance` no reporta bloqueantes.

## Archivos y responsabilidades

| Archivo | Rol en la feature |
| --- | --- |
| `src/App.jsx` | Monta rutas protegidas y renderiza `<Chatbot />` globalmente dentro del router. |
| `src/features/chatbot/pages/Chatbot.jsx` | Punto de entrada del widget. Lee sesion/bloqueo de examen y compone launcher + ventana usando `useChatbotController`. |
| `src/features/chatbot/hooks/useChatbotController.js` | Orquesta estado visible, historial conversacional, cooldown, abort controller, RAG, guardrails y streaming. |
| `src/features/chatbot/components/ChatbotLauncher.jsx` | Boton flotante para abrir/cerrar el asistente. |
| `src/features/chatbot/components/ChatbotWindow.jsx` | Contenedor visual de header, lista de mensajes e input. |
| `src/features/chatbot/components/ChatbotHeader.jsx` | Header de la ventana, acciones de expandir/reducir y cerrar. |
| `src/features/chatbot/components/ChatbotMessages.jsx` | Render de lista de mensajes, burbujas y estado `Analizando...`. |
| `src/features/chatbot/components/ChatbotInput.jsx` | Formulario controlado de envio, cooldown y estado deshabilitado. |
| `src/features/chatbot/components/ChatBubble.jsx` | Render de burbujas; mensajes del bot usan Markdown y fuentes RAG opcionales. |
| `src/features/chatbot/services/chatbotConfig.js` | Constantes del RAG/LLM y re-exports publicos de prompt/guardrails. |
| `src/features/chatbot/services/chatbotGuardrails.js` | Keywords de dominio, respuestas de bloqueo y regla de "sin contexto activo". |
| `src/features/chatbot/services/chatbotPrompt.js` | System prompt y armado de mensajes para el LLM. |
| `src/features/chatbot/services/ragService.js` | Query de embedding, RPC `buscar_contexto_kb` y construccion de contexto/fuentes. |
| `src/features/chatbot/services/chatCompletionService.js` | POST a Edge Function `chat`, lectura SSE y acumulacion de tokens. |
| `src/features/chatbot/services/chatbotErrors.js` | Traduccion de errores HTTP/red/RPC a mensajes de usuario. |
| `src/features/chatbot/services/chatbotMessages.js` | Factory de mensajes visibles e historial `user/assistant`. |
| `src/features/chatbot/services/embeddingService.js` | Singleton del modelo `Supabase/gte-small` para embeddings de consultas en el navegador. |
| `src/store/examLockStore.js` | Bloquea el chatbot mientras hay examen activo, incluso entre pestañas del mismo navegador. |
| `src/features/kb/pages/AdminKB.jsx` | UI admin para carga, extraccion, upload, listado, preview, activacion/desactivacion y borrado de documentos KB. |
| `src/features/kb/services/embeddingWorker.js` | Web Worker que chunkifica texto y genera embeddings para los documentos cargados. |
| `supabase/functions/chat/index.ts` | Edge Function que proxyfica llamadas a Groq y soporta streaming/no streaming. |
| `supabase/migrations/0001_irridelta_schema.sql` | Schema esperado: tablas KB, funcion de busqueda vectorial, RLS, grants, buckets e indices. |
| `src/supabaseClient.js` | Crea el cliente Supabase del navegador con `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`. |
| `src/store/sessionStore.js` | Guarda sesion, usuario y rol actual desde Supabase Auth. |
| `src/features/auth/authRoles.js` | Deriva `admin` desde `user.app_metadata.role`; todo usuario autenticado no-admin es `cliente`. |
| `src/utils/navigationConfig.js` | Agrega `Admin KB` al menu y footer cuando el rol es admin. |

## Superficie de usuario

### Chatbot

El chatbot se monta siempre en `App.jsx`, debajo de las rutas y antes del footer.
El propio componente devuelve `null` si no hay usuario autenticado, por lo que:

- Usuarios anonimos no ven el widget.
- Usuarios `cliente` si lo ven.
- Usuarios `admin` tambien lo ven.

La UI es un FAB flotante que abre/cierra una ventana. La ventana puede estar en
modo colapsado o expandido. No hay ruta dedicada para chat, persistencia de chat
en base de datos ni historial compartido entre sesiones.

### Admin KB

La ruta `/admin/kb` esta protegida por `ProtectedRoute` y solo acepta
`USER_ROLES.ADMIN`. El acceso tambien aparece en el dropdown `Admin` del navbar
cuando el usuario autenticado tiene rol admin.

Importante: el control de ruta es solo UX/frontend. La autorizacion real de
lectura/escritura se apoya en RLS, policies de Storage y `app_metadata.role =
"admin"`.

## Dependencias runtime

### Frontend

El frontend necesita:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

`src/supabaseClient.js` hace fail-fast si falta alguna. En el checkout revisado,
no se detectaron nombres `VITE_*` en `irridelta/.env`; si se intenta levantar el
frontend sin inyectarlas por otro medio, la app falla al importar el cliente
Supabase. Si se despliega en Vercel/Netlify, esas variables deben configurarse
en el proveedor de hosting.

En hosting frontend, confirmar que `VITE_SUPABASE_URL` apunte al proyecto
Supabase del ambiente desplegado. El archivo local `.env.admin.local` es solo
para scripts admin y no representa necesariamente el deploy productivo.

### Edge Function `chat`

La funcion necesita el secret:

- `GROQ_API_KEY`

Ese secret debe vivir en Supabase Edge Function secrets, no en `.env` del
frontend ni en Vercel. La funcion lee `Deno.env.get("GROQ_API_KEY")` y devuelve
error si no esta configurada.

### Modelos y red

El navegador descarga/carga `Supabase/gte-small` mediante `@xenova/transformers`.
El runtime WASM de ONNX se carga desde:

```txt
https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/
```

Consecuencias:

- La primera consulta o primera carga de Admin KB puede tardar por carga de modelo.
- Si el CDN de ONNX o el modelo no estan accesibles, embeddings y RAG fallan.
- El procesamiento de documentos grandes ocurre del lado del navegador del admin.

## Flujo del chatbot

### Estado local

`Chatbot.jsx` ya no contiene la logica principal. Solo:

- Lee usuario/rol desde `sessionStore`.
- Lee bloqueo de examen desde `examLockStore`.
- Llama `useExamLockSync()` para enterarse de examenes activos en otras pestañas.
- Crea el controlador con `useChatbotController`.
- Renderiza `ChatbotLauncher` y `ChatbotWindow`.

`useChatbotController.js` mantiene:

- `input`: texto actual del usuario.
- `isLoading`: estado de analisis antes o durante procesamiento.
- `cooldown`: bloqueo temporal entre consultas.
- `isOpen`: si la ventana esta visible.
- `isExpanded`: si la ventana esta expandida.
- `messages`: burbujas visibles.
- `conversationHistory`: historial enviado al LLM, guardado en `useRef`, no en DB.
- `requestControllerRef`: abort controller para cortar requests al cambiar sesion.
- `sessionKey`: `${user.id}:${role}`, usado para reiniciar chat si cambia usuario o rol.
- `isExamInProgressRef`: snapshot del bloqueo de examen para abortar flujos async.

Cuando cambia `sessionKey`, el hook:

- Aborta request activa.
- Limpia timer de cooldown.
- Borra historial.
- Restaura el mensaje inicial.
- Cierra la ventana.
- Limpia loading/cooldown.

Esto evita mezclar respuestas viejas entre usuarios distintos o despues de un
cambio de rol.

Cuando `examLockStore` marca examen activo, el hook:

- Aborta request activa.
- Cierra la ventana.
- Limpia input, loading y cooldown.
- Hace que `Chatbot.jsx` devuelva `null` mientras dure el examen.

### Paso a paso al enviar una consulta

1. **Validacion de entrada**
   - Si el input esta vacio, si hay request en curso o si `cooldown > 0`, no hace nada.
   - Agrega inmediatamente el mensaje del usuario a `messages`.
   - Crea un `AbortController`.

2. **Deteccion de follow-up corto**
   - Si ya hay historial y el mensaje tiene 5 palabras o menos, se considera follow-up.
   - Para mejorar la busqueda vectorial, concatena los primeros 200 caracteres de
     la ultima respuesta del asistente con el mensaje nuevo.
   - Esto afecta solo al embedding de busqueda, no cambia el mensaje real enviado al LLM.
   - La regla vive en `ragService.buildEmbeddingQuery()`.

3. **Embedding de consulta**
   - Llama a `embed(queryParaEmbedding)`.
   - `embed()` usa `getEmbedder()` y el modelo `Supabase/gte-small`.
   - El vector resultante tiene 384 dimensiones.

4. **Busqueda semantica en Supabase**
   - `ragService.searchKnowledgeBase()` ejecuta
     `supabase.rpc("buscar_contexto_kb", ...)`.
   - Parametros actuales:
     - `match_threshold = 0.15`
     - `match_count = 5`
   - El RPC devuelve `contenido`, `metadata` y `similitud`.

5. **Construccion de contexto**
   - `ragService.buildRagContext()` une todos los `doc.contenido` con separador `---`.
   - Extrae fuentes unicas desde `doc.metadata?.source`.
   - Las fuentes solo se adjuntan al mensaje si `userRole === "admin"`.

6. **Filtro previo al LLM**
   - Si no hay contexto y el input no contiene ninguna keyword de Irridelta,
     responde con `OFF_TOPIC_RESPONSE` sin llamar al LLM.
   - Si no hay contexto pero el input sí es del dominio, responde con
     `NO_CONTEXT_RESPONSE` sin llamar al LLM. Esto evita que el modelo conteste
     temas como sistemas de riego con conocimiento general cuando todos los
     documentos estan inactivos o la busqueda no trajo chunks.
   - Sin chunks activos, solo se permite llamar al LLM para respuestas que salen
     del prompt estatico: contacto, sucursales, horarios o informacion basica de
     Irridelta.
   - Si hay contexto, no bloquea aunque la keyword no este.
   - La regla vive en `chatbotGuardrails.getGuardrailResponse()`.

7. **Prompt al LLM**
   - `chatbotPrompt.buildAssistantMessages()` llama a `buildSystemPrompt(contexto)`.
   - Arma:
     - `system`
     - historial previo
     - mensaje actual del usuario
   - El prompt fija identidad, tono, limites de tema, uso exclusivo del contexto
     para detalles tecnicos, reglas de precios y formato Markdown.

8. **Llamada a Edge Function**
   - `chatCompletionService.streamAssistantResponse()` hace POST a
     `${VITE_SUPABASE_URL}/functions/v1/chat`.
   - Headers:
     - `Content-Type: application/json`
     - `Authorization: Bearer ${VITE_SUPABASE_KEY}`
     - `apikey: ${VITE_SUPABASE_KEY}`
   - Body:
     - `model = "openai/gpt-oss-20b"`
     - `temperature = 0.1`
     - `max_tokens = 2048`
     - `stream = true`
     - `messages = llmMessages`

9. **Streaming SSE**
   - La funcion devuelve `text/event-stream`.
   - `chatCompletionService` lee con `response.body.getReader()`.
   - Usa `TextDecoder` y un buffer `sseBuffer` para soportar chunks parciales.
   - Por cada linea `data: ...`, parsea JSON y agrega `choices[0].delta.content`.
   - Actualiza la burbuja del bot token por token.

10. **Cierre de turno**
    - Si el stream no trajo texto, usa fallback generico.
    - Guarda el turno user/assistant en `conversationHistory`.
    - Recorta historial a `MAX_HISTORY_TURNS * 2`, hoy 20 mensajes.
    - Marca la burbuja como no streaming.
    - Inicia cooldown de 5 segundos.

### Manejo de errores

Errores HTTP de la Edge Function:

- `401` o `403`: mensaje de sesion no habilitada.
- `429`: servicio saturado.
- `>=500`: asistente no disponible.
- Otros: respuesta generica de fallo.

Errores del flujo general:

- Problemas de red: pide revisar conexion.
- Errores que mencionan Supabase/RPC: indica que no se pudo consultar la KB.
- Otros: muestra el mensaje del error si existe.

Si el error ocurre despues de crear la burbuja streaming, reemplaza esa burbuja
por el mensaje de error. Si ocurre antes, agrega una nueva burbuja del bot.

## Prompt y comportamiento esperado

Constantes principales:

| Constante | Valor |
| --- | --- |
| `MAX_HISTORY_TURNS` | `10` |
| `MATCH_THRESHOLD` | `0.15` |
| `MATCH_COUNT` | `5` |
| `COOLDOWN_SECONDS` | `5` |
| `LLM_MODEL` | `openai/gpt-oss-20b` |
| `LLM_TEMPERATURE` | `0.1` |
| `LLM_MAX_TOKENS` | `2048` |

El system prompt incluye:

- Identidad: asistente virtual tecnico de Irridelta.
- Datos generales de empresa.
- Sucursales, direcciones, WhatsApp, horarios y redes.
- Regla de hablar en primera persona plural.
- Manejo de follow-ups.
- Limite tematico.
- Fuente unica para detalles tecnicos: el bloque `CONTEXTO`.
- Prohibicion de inventar precios.
- Markdown sin tablas.
- Anti-manipulacion para intentos fuera de tema.

La regla mas importante para calidad es esta: si el contexto no trae la respuesta
tecnica, el bot debe decir que no dispone de esa informacion en sus manuales y
recomendar contacto con asesores. No debe completar detalles tecnicos por memoria.

## Edge Function `chat`

La funcion `supabase/functions/chat/index.ts`:

- Solo acepta `POST` y `OPTIONS`.
- Devuelve 405 para otros metodos.
- Lee `GROQ_API_KEY` desde secrets.
- Valida que `messages` exista y sea array.
- Reenvia a `https://api.groq.com/openai/v1/chat/completions`.
- Soporta `stream: true` y no-streaming.
- En streaming, pipea directamente el body SSE de Groq al navegador.
- Si el modelo elegido falla con 400 o 404, reintenta con fallback
  `llama-3.1-8b-instant`.
- En no-streaming, reintenta 429 hasta 3 veces con backoff simple.

Estado esperado en cualquier ambiente productivo:

- Edge Function desplegada: `chat`.
- Estado: `ACTIVE`.
- `verify_jwt = true`.
- Cualquier funcion consumida por el frontend debe estar desplegada. Hoy el repo
  incluye `chat` y `learning-feed`.

Riesgo operativo importante:

- La funcion no valida el usuario por si misma.
- El frontend manda la anon key como bearer.
- Con `Access-Control-Allow-Origin: *`, cualquier origen podria intentar usar la
  funcion si conoce la URL y una anon key valida.
- Para reducir abuso/costo, conviene enviar el access token real del usuario y
  validar sesion/rol en la funcion, o agregar rate limiting/server-side checks.

## Admin KB

### Carga aceptada

`AdminKB.jsx` acepta:

- `.pdf`
- `.md`
- `.txt`

Limite de frontend:

- `MAX_SIZE_MB = 15`

La migration local define el bucket `kb-files` con limite `20971520` bytes
(20 MB). En cada ambiente, verificar que Storage refuerce ese limite y no dependa
solo del limite de frontend.

### Modos de carga

El admin puede:

- Subir un archivo.
- Pegar texto manual.
- Combinar texto manual + archivo; el resultado se concatena.

Si no hay texto resultante, cancela el proceso.

### Extraccion de texto

Para PDFs:

- Usa `pdfjs-dist`.
- Recorre todas las paginas.
- Lee `page.getTextContent()`.
- Une `item.str` con espacios.

Para TXT/MD:

- Usa `file.text()`.

Limitaciones:

- No hay OCR. Un PDF escaneado como imagen puede generar poco o ningun texto.
- La extraccion de PDF puede perder estructura visual, tablas, columnas o saltos.
- No se guarda el texto completo como una entidad separada; se guardan chunks.

### Sanitizacion

Antes de procesar:

- Elimina caracteres nulos `\0`, porque rompen PostgreSQL.

No hay sanitizacion semantica del contenido. Si el documento contiene texto
hostil para prompt injection, ese contenido puede entrar al bloque `CONTEXTO`.
El system prompt incluye anti-manipulacion, pero no hay un filtro especifico de
documentos.

### Storage path

Genera:

```txt
kb/{timestamp}_{fileName_sanitizado}
```

La sanitizacion del nombre reemplaza caracteres fuera de `[a-zA-Z0-9.-]` por `_`.

Para cargas manuales:

```txt
Carga_Manual_YYYY-MM-DD-HH-MM-SS.txt
```

Tambien sube un `.txt` al bucket para que el registro tenga archivo descargable.

### Reemplazo de duplicados

Antes de subir, busca `archivos_fuente` por `nombre`.

Si existe:

- Pregunta si se desea reemplazar.
- Si el admin cancela, aborta.
- Si confirma, borra el objeto viejo de Storage si existe.
- Borra el registro viejo de `archivos_fuente`.
- Por `on delete cascade`, se eliminan sus chunks en `documentos_kb`.

Esto deduplica por nombre, no por hash de contenido. Dos archivos con distinto
nombre y mismo contenido quedan como documentos distintos.

### Persistencia

Flujo de escritura:

1. Sube objeto a `kb-files`.
2. Inserta fila en `archivos_fuente` con:
   - `nombre`
   - `storage_path`
3. Guarda en `sessionStorage` un marcador `kb_pending_upload`.
4. Levanta `EmbeddingWorker`.
5. El worker devuelve `rowsToInsert`.
6. El frontend agrega `archivo_id` a cada row.
7. Inserta en masa en `documentos_kb`.
8. Limpia `kb_pending_upload`.
9. Resetea UI y refresca la lista.

Rollback:

- Al montar `AdminKB`, si existe `kb_pending_upload`, intenta eliminar el objeto
  de Storage y el registro `archivos_fuente`.
- Esto cubre refresh/cierre durante procesamiento.
- Si falla la insercion de chunks sin desmontar la pantalla, el marcador queda
  para limpiarse en el siguiente montaje; no hay transaccion atomica Storage + DB.

### Worker de embeddings

`embeddingWorker.js`:

- Corre fuera del hilo principal.
- Usa el mismo modelo `Supabase/gte-small`.
- Crea chunks de aproximadamente 1000 caracteres.
- Usa overlap de 200 caracteres.
- Intenta cortar en el ultimo salto de linea o punto antes del limite.
- Si encuentra un corte razonable despues de `i + overlap`, corta ahi.
- Para cada chunk genera embedding normalizado con `pooling: "mean"`.
- Devuelve filas:
  - `contenido`
  - `metadata.source = fileName`
  - `metadata.chunk_index = i`
  - `embedding = Array<number>`

El worker no habla con Supabase. Solo procesa texto y devuelve datos al hilo React.

### Gestion de documentos

La tabla de Admin KB permite:

- Listar documentos (`archivos_fuente`) ordenados por `created_at desc`.
- Ver fecha de carga.
- Activar/desactivar documento para RAG (`activo`).
- Descargar con signed URL de 60 segundos.
- Ver detalle/preview.
- Eliminar documento y sus chunks.

Vista previa:

- Cuenta chunks asociados en `documentos_kb`.
- Crea signed URL de 120 segundos.
- Para PDF: descarga, lee cantidad de paginas y renderiza primera pagina a canvas.
- Para TXT/MD: descarga y muestra primeros 2000 caracteres.

Activacion:

- `activo !== false` se interpreta como activo.
- `buscar_contexto_kb` solo devuelve chunks cuyo `archivos_fuente.activo = true`.

## Modelo de datos

### `archivos_fuente`

Tabla fuente de documentos KB.

Columnas esperadas:

| Columna | Tipo | Uso |
| --- | --- | --- |
| `id` | uuid | PK. |
| `nombre` | text | Nombre visible y deduplicacion por nombre. |
| `storage_path` | text | Path en bucket `kb-files`. |
| `tipo` | text | Campo opcional, no usado de forma central por AdminKB actual. |
| `created_at` | timestamptz | Fecha de carga. |
| `activo` | boolean | Si participa o no del RAG. Default `true`. |

### `documentos_kb`

Tabla de chunks vectorizados.

Columnas esperadas:

| Columna | Tipo | Uso |
| --- | --- | --- |
| `id` | uuid | PK. |
| `contenido` | text | Texto del chunk. |
| `metadata` | jsonb | Hoy guarda `source` y `chunk_index`. |
| `embedding` | vector(384) | Vector normalizado de `Supabase/gte-small`. |
| `archivo_id` | uuid | FK a `archivos_fuente.id`, cascade delete. |

### Funcion `buscar_contexto_kb`

Contrato:

```sql
buscar_contexto_kb(
  query_embedding vector(384),
  match_threshold double precision,
  match_count integer
)
returns table(contenido text, metadata jsonb, similitud double precision)
```

Comportamiento:

- Une `documentos_kb` con `archivos_fuente`.
- Filtra `a.activo = true`.
- Filtra similitud mayor que threshold.
- Ordena por distancia coseno ascendente.
- Limita por `match_count`.

La migration local agrega `d.embedding is not null` y `set search_path = ''`.
En cada ambiente, confirmar que la funcion desplegada conserve esas defensas.

### Indices

Migration local:

- `idx_documentos_kb_archivo_id` sobre `documentos_kb(archivo_id)`.
- `documentos_kb_embedding_idx` HNSW sobre `embedding vector_cosine_ops`.

Validar en cada ambiente:

- Existe un solo indice vectorial HNSW efectivo sobre `embedding`.
- Existe indice sobre `documentos_kb.archivo_id`.
- Los advisors no reportan FK sin indice ni indices duplicados.

## Storage

### Bucket `kb-files`

Uso:

- Guarda PDFs/TXT/MD de la base de conocimiento.
- Es privado.
- AdminKB genera signed URLs para descargar o preview.

Migration local:

- `public = false`
- `file_size_limit = 20971520`
- MIME allowlist: `application/pdf`, `text/markdown`, `text/plain`

Validar en cada ambiente:

- `public = false`
- `file_size_limit = 20971520`
- MIME allowlist: `application/pdf`, `text/markdown`, `text/plain`

### Bucket `formacion-archivos`

No es parte directa del chatbot/KB, pero aparece en la misma migration y advisors.

Validar en cada ambiente:

- Si el bucket es publico, que sea una decision explicita.
- Debe tener limite de tamano.
- Debe tener MIME allowlist.
- No debe permitir listados amplios innecesarios de objetos.

## Seguridad y permisos

### Roles

La fuente esperada para admin es:

```txt
app_metadata.role = "admin"
```

En frontend, esto esta codificado en `src/features/auth/authRoles.js`: solo ese
valor normalizado a minusculas devuelve `USER_ROLES.ADMIN`; cualquier usuario
autenticado sin ese valor queda como `cliente`.

No se debe usar `user_metadata` para autorizacion, porque es editable por el
usuario en Supabase.

### RLS de KB esperada

Migration local:

- `archivos_fuente_admin_all`: admin puede todo.
- `archivos_fuente_authenticated_read`: usuarios autenticados pueden leer metadata.
- `documentos_kb_admin_all`: admin puede todo.
- `documentos_kb_authenticated_read`: usuarios autenticados pueden leer chunks.
- `kb_storage_admin_all`: admin puede operar sobre objetos `kb-files`.

Esto significa que, por diseno actual, cualquier usuario autenticado puede leer
los chunks de KB por API si tiene la anon key y sesion valida. La UI no ofrece
un explorador de chunks a clientes, pero RLS si permite SELECT autenticado.

### Policies y funciones a verificar

Validar en cada ambiente:

- No hay policies permisivas duplicadas en `archivos_fuente`, `documentos_kb` ni
  `storage.objects`.
- `is_admin()` fija `search_path` y no queda expuesta como RPC peligrosa.
- `is_authenticated()` fija `search_path`.
- `buscar_contexto_kb()` fija `search_path` y filtra embeddings nulos.
- `is_admin()` usa `app_metadata.role = "admin"` como fuente de verdad.
- `vector` esta instalada en un schema deliberado y documentado.
- Leaked password protection esta activado si Supabase Auth usa password login.
- Los buckets no permiten listados publicos innecesarios.

Migration local esperada:

- `is_admin()` como `language sql stable set search_path = ''`.
- `is_authenticated()` con `set search_path = ''`.
- `buscar_contexto_kb()` con `set search_path = ''`.
- Revoca execute de `is_admin()` a `anon, authenticated`.

## Auditoria portable por ambiente

Para auditar un ambiente concreto, usar esta lista como base y guardar las
evidencias operativas en el espacio privado que corresponda para ese proyecto.

Checklist:

- `supabase migration list --linked` muestra las migrations esperadas.
- `supabase db advisors --linked --type security` no tiene bloqueantes.
- `supabase db advisors --linked --type performance` no tiene bloqueantes.
- Edge Functions requeridas estan activas y con `verify_jwt = true`, salvo
  excepcion documentada.
- Extensiones requeridas existen:
  - `vector`
  - `pgcrypto`
  - `uuid-ossp`, si alguna migration la requiere.
- `documentos_kb` tiene chunks con embedding para documentos activos.
- No hay chunks huerfanos sin `archivo_id` valido.
- Los buckets tienen limites, MIME allowlists y policies esperadas.
- Las pruebas de chatbot recuperan contexto real antes de llamar al LLM.

## Calidad de respuestas y limites del RAG

Fortalezas:

- Usa embeddings normalizados y busqueda vectorial.
- Usa contexto recuperado antes de consultar al LLM.
- Mantiene historial breve para follow-ups.
- Tiene filtro previo al LLM si no hay contexto activo o el tema esta fuera del
  alcance.
- El prompt y el guardrail de frontend obligan a no inventar detalles tecnicos
  fuera del contexto.
- Fuentes RAG visibles para admin ayudan a depurar.

Limites:

- `MATCH_THRESHOLD = 0.15` es permisivo. Puede traer contexto debil o ruido.
- No hay reranking.
- No hay citas visibles para clientes.
- No hay evaluacion automatica de calidad de respuestas.
- No hay logs estructurados por pregunta, fuentes usadas, similitudes o tokens.
- No hay cache de embeddings de consultas.
- No hay deteccion de prompt injection dentro de documentos.
- No hay OCR para documentos escaneados.
- No hay separacion por categoria/producto/tipo de documento en la busqueda.
- No hay versionado de documentos ni historico de cambios de KB.

## Riesgos principales

1. **Abuso/costo de Edge Function**
   - `chat` acepta payload arbitrario de `messages`, `model`, `temperature`,
     `max_tokens` y `stream`.
   - No valida sesion real del usuario en el body ni con access token.
   - Recomendacion: enviar access token de usuario, verificarlo dentro de la
     funcion, limitar modelos/parametros server-side y agregar rate limit.

2. **KB legible por usuarios autenticados**
   - RLS permite SELECT de chunks a authenticated.
   - Si la KB incluye manuales no publicos o informacion sensible, esto es una
     decision a revisar.

3. **Auditoria de ambiente pendiente por permisos**
   - No asumir estado de schema/advisors si la cuenta actual no puede consultar
     el proyecto Supabase destino.
   - Cualquier drift observado en otro proyecto no debe atribuirse al ambiente
     productivo.
   - Para cerrar este punto hace falta acceso Supabase Management/API al proyecto
     destino o ejecutar los queries/advisors desde una cuenta autorizada.

4. **Consistencia no atomica**
   - Storage upload, `archivos_fuente` y `documentos_kb` no se escriben en una
     unica transaccion.
   - Hay rollback por `sessionStorage`, pero no cubre todos los escenarios en
     tiempo real.

5. **Dependencia fuerte del navegador admin**
   - El admin procesa PDFs, chunks y embeddings localmente.
   - Para documentos grandes o equipos lentos, la experiencia puede degradar.

6. **Falta de observabilidad de RAG**
   - No se guardan metricas de similitud ni fuentes usadas por respuesta.
   - Debuggear calidad requiere reproducir manualmente.

## Operacion: agregar o reemplazar un documento KB

1. Ingresar como admin.
2. Abrir `/admin/kb`.
3. Subir PDF/MD/TXT o pegar texto.
4. Confirmar reemplazo si ya existe un documento con el mismo nombre.
5. Esperar:
   - Extraccion.
   - Upload a Storage.
   - Insercion en `archivos_fuente`.
   - Carga de modelo.
   - Generacion de embeddings.
   - Insercion en `documentos_kb`.
6. Confirmar que aparece en la tabla.
7. Abrir preview y verificar cantidad de chunks.
8. Hacer una pregunta al chatbot que deberia recuperar ese contenido.
9. Si la respuesta no usa el documento:
   - Confirmar que el documento esta `Activo`.
   - Confirmar que tiene chunks.
   - Revisar si el texto extraido contiene realmente los terminos esperados.
   - Revisar threshold/similitud via RPC si hace falta.

## Operacion: desactivar contenido del RAG

1. Abrir `/admin/kb`.
2. En la tabla, cambiar estado a `Inactivo`.
3. El registro permanece en DB y Storage.
4. `buscar_contexto_kb` deja de devolver sus chunks porque filtra `a.activo = true`.
5. Se puede reactivar sin reprocesar embeddings.

## Operacion: eliminar contenido de la KB

1. Abrir `/admin/kb`.
2. Click en eliminar.
3. Confirmar.
4. El frontend intenta borrar primero el objeto en `kb-files`.
5. Luego borra `archivos_fuente`.
6. La FK `documentos_kb.archivo_id on delete cascade` borra los chunks asociados.

Si el borrado de Storage falla pero DB borra igual, puede quedar objeto huerfano.
Si DB falla pero Storage borra, puede quedar metadata apuntando a un objeto que ya
no existe. El codigo actual no implementa reconciliacion automatica completa.

## Operacion: desplegar o reparar backend

Desde `irridelta/`:

```bash
npm run lint
npm run build
./node_modules/.bin/supabase functions deploy chat --project-ref <project_ref> --use-api
```

Configurar secret:

```bash
./node_modules/.bin/supabase secrets set GROQ_API_KEY=your_groq_key --project-ref <project_ref>
```

Validar despues:

- Edge Function `chat` activa.
- `verify_jwt = true`.
- Logs de Edge Function sin 500/429 persistentes.
- Pregunta simple desde usuario autenticado.
- Pregunta que requiera KB.
- Pregunta fuera de tema.
- Follow-up corto despues de una respuesta.

## Debug rapido por sintoma

| Sintoma | Posibles causas | Donde mirar |
| --- | --- | --- |
| La app no arranca | Faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_KEY`. | `src/supabaseClient.js`, env del hosting. |
| El chatbot no aparece | Usuario no autenticado, session store sin user o examen activo en esta/otra pestaña. | `Chatbot.jsx`, `sessionStore.js`, `examLockStore.js`, login. |
| Error "base de conocimientos" | RPC falla, RLS, funcion ausente, embedding invalido. | `buscar_contexto_kb`, Supabase logs, browser console. |
| Error "asistente no disponible" | Edge Function 5xx, Groq secret ausente, Groq caido. | Edge Function logs, secrets. |
| Respuestas sin contexto | Documento inactivo, chunks ausentes, PDF sin texto, threshold/no match. | `/admin/kb`, conteo de chunks, RPC manual. |
| Respuestas fuera de tema | Keywords/contexto demasiado permisivos, historial contamina follow-up. | `chatbotGuardrails.js`, `useChatbotController.js`, historial local. |
| Upload queda a medias | Refresh/cierre, fallo en worker, fallo insert masivo. | `kb_pending_upload`, `archivos_fuente`, Storage. |
| Admin no puede subir | RLS/policy `kb-files`, rol admin no en `app_metadata`. | Auth metadata, Storage policies, `is_admin()`. |
| Cliente ve contenido que no deberia | SELECT authenticated sobre `documentos_kb`. | RLS policies KB. |

## Checklist de hardening recomendado

Prioridad alta:

- Enviar access token real del usuario a `chat` y validar usuario dentro de la
  Edge Function.
- Forzar allowlist server-side de `model`, `temperature`, `max_tokens` y `stream`.
- Agregar rate limiting por usuario/IP.
- Aplicar migration que corrija `is_admin()`, `is_authenticated()` y
  `buscar_contexto_kb()` con `set search_path`.
- Revocar execute de `is_admin()` para anon/authenticated si solo se usa como
  helper interno de RLS.
- Eliminar indice vectorial duplicado.
- Crear indice sobre `documentos_kb(archivo_id)`.
- Consolidar policies duplicadas de `documentos_kb` y `archivos_fuente`.

Prioridad media:

- Mover embeddings de documentos a una funcion/backend para no depender del
  navegador admin.
- Registrar logs RAG: query, chunks ids, similitud, fuentes, latencia y resultado.
- Agregar pruebas manuales documentadas para preguntas esperadas.
- Agregar OCR o advertencia clara para PDFs escaneados.
- Agregar hash de documento para detectar duplicados reales.
- Versionar documentos o guardar historial de reemplazos.
- Mostrar fuentes a clientes de forma controlada si el negocio lo permite.

Prioridad baja:

- Agregar categorias/tags a documentos.
- Agregar busqueda hibrida keyword + vector.
- Agregar reranking.
- Agregar cache de embeddings de queries frecuentes.
- Agregar panel admin de salud de KB: documentos activos, chunks, ultimas cargas,
  errores recientes.

## Criterios para decir que la feature esta sana

- Un usuario anonimo no ve el chatbot.
- Un usuario cliente ve el chatbot.
- Un admin ve el chatbot y `/admin/kb`.
- `/admin/kb` puede subir, previsualizar, desactivar, reactivar, descargar y
  borrar documentos.
- Cada documento activo tiene chunks con embeddings de 384 dimensiones.
- `buscar_contexto_kb` devuelve solo chunks de archivos activos.
- El chatbot responde preguntas de KB con informacion del contexto.
- El chatbot rechaza preguntas fuera del dominio.
- Los follow-ups cortos usan historial sin mezclar usuarios.
- Edge Function `chat` no expone `GROQ_API_KEY`.
- Las policies no permiten escrituras KB a usuarios no admin.
- Los advisors criticos de seguridad estan resueltos o documentados.
- `npm run lint` y `npm run build` pasan con las env correctas.
