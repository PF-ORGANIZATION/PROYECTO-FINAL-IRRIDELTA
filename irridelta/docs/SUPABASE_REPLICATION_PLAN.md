# Runbook de produccion: Supabase y deploy frontend

Este runbook describe como dejar IRRIDELTA productivo en un entorno nuevo o
existente, con foco en Supabase, Edge Functions, Storage, variables de entorno y
deploy frontend.

## Objetivo

Levantar un entorno productivo repetible con:

- Schema versionado en `supabase/migrations`.
- Row Level Security, policies, functions SQL, indices y extensiones aplicadas
  desde migrations.
- Buckets de Storage con limites, MIME allowlists y policies revisadas.
- Todas las Edge Functions del repo desplegadas.
- Secrets configurados en Supabase, nunca en el frontend ni en el repo.
- Variables publicas del frontend configuradas en el proveedor de hosting.
- Seed opcional solo para datos publicos, demo o negocio autorizado.
- Validacion de Auth, Storage, Edge Functions, chatbot, admin y deep links.

## Reglas de seguridad

- No commitear `.env`, `.env.admin.local`, service-role keys, tokens, passwords
  ni PDFs privados.
- `.env` queda reservado para variables publicas que Vite expone al navegador.
- `.env.admin.local` queda reservado para scripts administrativos locales.
- Los secrets de Edge Functions se cargan en Supabase con `supabase secrets`.
- Vercel u otro hosting frontend solo recibe variables `VITE_*`.
- No copiar `auth.users`, refresh tokens ni datos privados de usuarios por
  defecto.
- Los valores reales de proyectos y deploys quedan fuera del repositorio y se
  guardan solo en los dashboards o notas operativas privadas que correspondan.

## Estado esperado del repo

Desde `irridelta/`, el repo debe tener esta forma minima:

```txt
supabase/
  migrations/
    0001_irridelta_schema.sql
  functions/
    chat/
      index.ts
    learning-feed/
      index.ts
```

Si se agregan nuevas tablas, policies, funciones SQL, buckets o indices, crear
una nueva migration. No editar una migration ya aplicada a un entorno compartido.

Si se agregan nuevas Edge Functions, deben vivir bajo:

```txt
supabase/functions/<function_name>/index.ts
```

El deploy debe descubrir y desplegar todas las carpetas de `supabase/functions`.

## Variables por ambiente

Frontend local o hosting frontend:

```env
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_KEY=<supabase_anon_or_publishable_key>
VITE_ENABLE_PUBLIC_REGISTRATION=false
```

Admin local:

```env
SUPABASE_URL=<supabase_url>
SUPABASE_PROJECT_REF=<target_project_ref>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
DEMO_USER_PASSWORD=<local_demo_password>
DEMO_MANUAL_PDF=./Manual_tecnico_de_operaciones_de_riego.pdf
```

Edge Function secrets:

```bash
./node_modules/.bin/supabase secrets set \
  GROQ_API_KEY=<groq_api_key> \
  CHAT_ALLOWED_ORIGINS=<frontend_domain> \
  --project-ref <target_project_ref>
```

`chat` requiere `GROQ_API_KEY`, `SUPABASE_URL` y `SUPABASE_ANON_KEY` en el
runtime de Edge Functions. Tambien lee `CHAT_ALLOWED_ORIGINS` para restringir
CORS; en produccion debe contener solo dominios frontend permitidos, separados
por comas si hay mas de uno. En desarrollo local, agregar explicitamente el
origen local usado, por ejemplo `http://localhost:5173`.

Opcionales de `chat`:

- `CHAT_RATE_LIMIT_WINDOW_SECONDS`
- `CHAT_RATE_LIMIT_MAX_REQUESTS`
- `GROQ_CHAT_MODEL`
- `GROQ_CHAT_FALLBACK_MODEL`

`learning-feed` usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` dentro del runtime de Edge Functions. Confirmar que
esas variables existan en el runtime del proyecto destino antes de validar la
funcion. No pasarlas al frontend salvo la key publica `VITE_SUPABASE_KEY`.

## Datos a migrar y excluir

Migrar por defecto:

- Estructura de tablas, constraints, indexes, functions y policies.
- Buckets y policies de Storage.
- Edge Functions.
- Contenido publico o de negocio autorizado:
  - `capacitaciones`
  - `capacitacion_modulos`
  - `modulo_recursos` metadata
  - `certificaciones`
  - `archivos_fuente` metadata si no contiene datos privados
  - `documentos_kb` si el contenido esta autorizado para migrar
  - `categorias`
  - `productos`

No migrar por defecto:

- `auth.users`
- `certification_requests`
- `exam_attempts`
- `progreso_recursos`
- `user_progress`
- Passwords, refresh tokens, anon keys, service-role keys o provider tokens.

Si se necesitan datos demo para tablas de usuario, crear usuarios ficticios y
datos anonimizados desde un seed separado.

## Flujo recomendado de primera puesta en produccion

### 1. Preparar local

Desde `irridelta/`:

```bash
npm ci
npm run lint
npm run build
./node_modules/.bin/supabase --version
```

Crear `.env.admin.local` desde el ejemplo si todavia no existe:

```bash
cp .env.admin.example .env.admin.local
```

Crear `.env` local sin commitearlo:

```env
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_KEY=<supabase_anon_or_publishable_key>
VITE_ENABLE_PUBLIC_REGISTRATION=false
```

### 2. Crear o elegir proyecto Supabase destino

Para un proyecto nuevo:

1. Crear el proyecto en Supabase Dashboard.
2. Elegir region y plan.
3. Confirmar costo antes de crear recursos pagos.
4. Guardar localmente project ref, URL, anon/publishable key y service-role key.

Para un proyecto existente:

1. Confirmar que es el destino correcto.
2. Revisar si ya contiene tablas, buckets o funciones.
3. Hacer backup antes de aplicar migrations.
4. Ejecutar siempre `db push --dry-run` antes de tocar el schema.

Backup recomendado cuando el proyecto ya tiene datos:

```bash
./node_modules/.bin/supabase db dump \
  --linked \
  --file /tmp/irridelta-pre-migration.sql
```

Si el proyecto aun no esta linkeado, hacer el link en el paso siguiente antes
del backup.

### 3. Linkear la CLI

```bash
./node_modules/.bin/supabase login
./node_modules/.bin/supabase link --project-ref <target_project_ref>
./node_modules/.bin/supabase migration list --linked
```

La CLI queda apuntando al proyecto destino. No commitear archivos temporales que
la CLI genere con datos locales.

### 4. Aplicar migrations

Simular primero:

```bash
./node_modules/.bin/supabase db push --linked --dry-run
```

Revisar manualmente el resultado. Si coincide con lo esperado, aplicar:

```bash
./node_modules/.bin/supabase db push --linked
./node_modules/.bin/supabase migration list --linked
```

Si el dry-run muestra conflictos de objetos existentes:

- Frenar.
- Revisar el schema real.
- Decidir si hay que adaptar la migration, crear una migration incremental o
  limpiar el proyecto destino.
- No usar `migration repair` para saltear errores salvo que el schema real ya
  coincida con la migration y quede documentado.

### 5. Validar seguridad y performance

```bash
./node_modules/.bin/supabase db advisors --linked --type security
./node_modules/.bin/supabase db advisors --linked --type performance
```

Revisar especialmente:

- RLS habilitado en tablas expuestas.
- Policies que usen `(select auth.uid())` y `(select auth.jwt())` cuando aplique.
- Roles admin basados en `app_metadata.role = "admin"`.
- Funciones `security definer` con `search_path` fijo.
- RPCs peligrosas no expuestas a `anon` o `authenticated`.
- Indices para foreign keys y busquedas frecuentes.
- Buckets sin listados amplios innecesarios.

### 6. Configurar Storage

La migration debe crear buckets, limites, MIME allowlists y policies. Los
objetos de Storage no se copian automaticamente.

Para migrar objetos:

1. Confirmar que los archivos pueden migrarse legal y operativamente.
2. Exportarlos desde la fuente autorizada.
3. Subirlos al bucket destino preservando paths esperados.
4. Verificar que `modulo_recursos`, `archivos_fuente` y `documentos_kb` apunten a
   objetos existentes.

Para demo local:

```bash
npm run seed:demo
```

No ejecutar seed demo sobre produccion real salvo que se quiera cargar datos
demo deliberadamente.

### 7. Configurar secrets de Edge Functions

Configurar cada secret usado por las funciones:

```bash
./node_modules/.bin/supabase secrets set \
  GROQ_API_KEY=<groq_api_key> \
  --project-ref <target_project_ref>
```

Agregar en este paso cualquier secret nuevo que una funcion use con
`Deno.env.get(...)`.

Para auditar variables requeridas:

```bash
rg "Deno\.env\.get" supabase/functions
```

### 8. Desplegar todas las Edge Functions

Desplegar automaticamente todas las funciones versionadas en el repo:

```bash
export SUPABASE_PROJECT_REF=<target_project_ref>

for function_dir in supabase/functions/*; do
  [ -d "$function_dir" ] || continue
  function_name="$(basename "$function_dir")"
  ./node_modules/.bin/supabase functions deploy "$function_name" \
    --project-ref "$SUPABASE_PROJECT_REF" \
    --use-api
done
```

Tambien se puede desplegar una funcion puntual:

```bash
./node_modules/.bin/supabase functions deploy chat \
  --project-ref <target_project_ref> \
  --use-api
```

Mantener `verify_jwt` activo por defecto. Usar `--no-verify-jwt` solo si la
funcion es un webhook publico con autenticacion propia y la razon queda
documentada.

Funciones esperadas hoy:

- `chat`
- `learning-feed`

Si el frontend consume una funcion, esa funcion debe estar desplegada. Si una
funcion ya no se usa, quitar el consumo del frontend o eliminarla del repo en
una migration/cambio separado.

### 9. Probar Edge Functions

Validar CORS:

```bash
curl -i -X OPTIONS \
  "https://<target_project_ref>.supabase.co/functions/v1/chat" \
  -H "Origin: <frontend_domain>" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, apikey, content-type"
```

Validar CORS restringido:

```bash
curl -i -X OPTIONS \
  "https://<target_project_ref>.supabase.co/functions/v1/chat" \
  -H "Origin: https://origen-no-permitido.example" \
  -H "Access-Control-Request-Method: POST"
```

Debe responder `403` o no incluir `Access-Control-Allow-Origin` para el origen
no permitido.

Validar que `chat` rechaza anon/public key como bearer:

```bash
curl -i -X POST \
  "https://<target_project_ref>.supabase.co/functions/v1/chat" \
  -H "Origin: <frontend_domain>" \
  -H "Content-Type: application/json" \
  -H "apikey: <anon_or_publishable_key>" \
  -H "Authorization: Bearer <anon_or_publishable_key>" \
  -d '{"messages":[{"role":"system","content":"test"},{"role":"user","content":"hola"}]}'
```

Debe responder `401`. La prueba positiva debe hacerse desde la app o con un
`access_token` real de un usuario autenticado.

Validar que una llamada sin autorizacion no abra datos privados:

```bash
curl -i -X POST \
  "https://<target_project_ref>.supabase.co/functions/v1/learning-feed" \
  -H "Content-Type: application/json" \
  -d '{"view":"user-capacitaciones"}'
```

Validar llamada autenticada desde la app, no pegando service-role keys en el
navegador. Revisar logs de Edge Functions despues de cada prueba.

### 10. Crear usuarios y admin

Crear usuarios reales con Supabase Auth o con el flujo de registro de la app.

Promover admin desde `irridelta/`:

```bash
npm run make-admin -- usuario@dominio.com
```

La fuente de verdad del rol admin es:

```txt
app_metadata.role = "admin"
```

No usar `user_metadata` para autorizacion.

## Deploy frontend con Vercel

El camino recomendado es Git integration: cada merge a `<production_branch>`
genera un deploy de produccion y cada PR genera preview.

Configuracion del proyecto Vercel:

- Root directory: `irridelta`
- Framework preset: `Vite`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `<production_branch>` (normalmente `main`)
- Node version: una version compatible con Vite 7

Variables en Vercel:

```env
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_KEY=<supabase_anon_or_publishable_key>
VITE_ENABLE_PUBLIC_REGISTRATION=false
```

No configurar en Vercel:

```env
SUPABASE_SERVICE_ROLE_KEY=<never_in_frontend_hosting>
GROQ_API_KEY=<belongs_in_supabase_secrets>
DEMO_USER_PASSWORD=<local_only>
```

El repo incluye `vercel.json` con rewrite SPA a `/index.html`. Esto es necesario
porque la app usa routing del lado cliente y las rutas internas deben sobrevivir
un refresh directo.

## Configurar Supabase Auth para el dominio frontend

En Supabase Dashboard del proyecto destino:

1. Ir a Auth.
2. Abrir URL Configuration.
3. Configurar Site URL con `<frontend_domain>`.
4. Agregar Redirect URLs necesarias:
   - `<frontend_domain>`
   - `http://localhost:5173`
   - URLs preview exactas si se prueban flujos Auth en previews.

No agregar dominios que no controles.

Si se habilita registro publico o reset de password en produccion, configurar
antes SMTP propio, protecciones anti-abuso y revisar deliverability.

## Orden recomendado para cambios futuros

### Cambio de schema o policies

1. Crear migration nueva.
2. Probar localmente.
3. Ejecutar `db push --dry-run` contra destino.
4. Aplicar `db push`.
5. Correr advisors.
6. Desplegar frontend solo si depende del cambio.

### Cambio de Edge Functions

1. Revisar nuevos `Deno.env.get(...)`.
2. Configurar secrets.
3. Desplegar todas las funciones o la funcion afectada.
4. Probar CORS, JWT, payloads validos y payloads invalidos.
5. Revisar logs.
6. Desplegar frontend solo si cambia el contrato de API.

### Cambio solo frontend

1. Correr `npm run lint`.
2. Correr `npm run build`.
3. Abrir PR hacia `<production_branch>`.
4. Validar preview.
5. Mergear para produccion.

## Validacion final

Antes de considerar productivo:

- `npm run lint` pasa.
- `npm run build` pasa.
- `supabase migration list --linked` muestra migrations aplicadas.
- `supabase db advisors --linked --type security` no tiene bloqueantes.
- `supabase db advisors --linked --type performance` no tiene bloqueantes.
- Todas las carpetas de `supabase/functions` estan desplegadas o justificadas
  como no usadas.
- `chat` responde con CORS restringido, exige access token de usuario, aplica
  parametros LLM server-side y no expone `GROQ_API_KEY`.
- `learning-feed` exige usuario autenticado para vistas privadas.
- Buckets existen, tienen MIME allowlists y limites esperados.
- Objetos de Storage requeridos existen en los paths esperados.
- Auth tiene Site URL y Redirect URLs correctas.
- Login/logout funciona.
- Usuario admin entra al panel admin.
- Productos/categorias funcionan.
- Capacitaciones y certificaciones funcionan.
- KB y chatbot funcionan.
- Rutas internas no devuelven 404 al refrescar en el hosting.
- Logs de Supabase y hosting no muestran errores repetidos.

## Criterios de terminado

La tarea termina cuando:

- El proyecto Supabase destino tiene schema, RLS, policies, functions SQL,
  indices y buckets aplicados desde migrations.
- Todos los secrets necesarios estan en Supabase, no en el repo ni en Vercel.
- Todas las Edge Functions requeridas estan desplegadas y probadas.
- El frontend apunta al proyecto destino con variables publicas `VITE_*`.
- El hosting frontend sirve la SPA y sus deep links.
- Auth esta configurado para el dominio final.
- Datos migrados y datos excluidos quedan registrados en una nota operativa
  privada o en un documento sin secretos ni IDs sensibles.
