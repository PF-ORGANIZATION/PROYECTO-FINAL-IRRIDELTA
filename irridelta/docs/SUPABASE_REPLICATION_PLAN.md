# Supabase Replication Plan

Este documento deja preparado el trabajo para replicar el proyecto Supabase de
IRRIDELTA en otra cuenta/proyecto, manteniendo lo que hoy funciona y corrigiendo
la deuda detectada antes de crear el entorno nuevo.

No incluir secretos en este archivo. Usar nombres de variables, placeholders y
comandos genericos.

## Objetivo

Crear una forma repetible de levantar un Supabase nuevo con:

- Schema versionado en migrations.
- Row Level Security y policies corregidas.
- Buckets de Storage con permisos, limites y MIME types explicitos.
- Edge Functions desplegadas desde el repo.
- Variables de entorno documentadas sin valores reales.
- Seed opcional para datos publicos/de negocio.
- Sin copiar usuarios, tokens, service-role keys ni datos privados por defecto.

## Snapshot del estado actual

Fecha del relevamiento: 2026-06-12.

Proyecto remoto revisado:

- Project ref: `skiwambsxnbjajmgewdi`
- Estado: `ACTIVE_HEALTHY`
- Region: `us-east-2`
- Postgres: `17.6.1`

Tablas principales observadas:

- `public.archivos_fuente`
- `public.documentos_kb`
- `public.capacitaciones`
- `public.capacitacion_modulos`
- `public.modulo_recursos`
- `public.certificaciones`
- `public.certification_requests`
- `public.exam_attempts`
- `public.progreso_recursos`
- `public.user_progress`
- `public.categorias`
- `public.productos`

Datos observados en produccion:

- `documentos_kb`: 1455 filas
- `archivos_fuente`: 8 filas
- `capacitaciones`: 8 filas
- `capacitacion_modulos`: 15 filas
- `modulo_recursos`: 19 filas
- `certificaciones`: 3 filas
- `certification_requests`: 16 filas
- `progreso_recursos`: 91 filas
- `exam_attempts`: 43 filas
- `categorias`: 0 filas
- `productos`: 0 filas

Extensiones relevantes instaladas:

- `vector`, instalada hoy en schema `public`
- `pgcrypto`
- `uuid-ossp`
- `pg_stat_statements`
- `supabase_vault`

Buckets observados:

- `formacion-archivos`: publico, sin limite de tamano, sin MIME allowlist.
- `kb-files`: privado, MIME allowlist: `application/pdf`, `text/markdown`,
  `text/plain`.

Edge Functions:

- Remoto: `chat`, activa, `verify_jwt = true`.
- Repo local: `supabase/functions/chat/index.ts`.
- Repo local tambien tiene `supabase/functions/learning-feed/index.ts`, pero no
  aparece desplegada en Supabase.
- Logs recientes muestran 404 contra `/functions/v1/learning-feed`.

Migrations:

- Supabase reporta `migrations: []`.
- El schema actual no esta versionado desde `supabase/migrations`.

## Deuda a corregir antes de replicar

### Seguridad

1. Fijar `search_path` en funciones SQL:
   - `public.is_admin`
   - `public.is_authenticated`
   - `public.buscar_contexto_kb`

2. Endurecer `public.is_admin()`:
   - Hoy es `SECURITY DEFINER`.
   - Hoy puede ejecutarse por `anon` y `authenticated` via RPC.
   - Decidir si debe ser RPC publica o helper interno para RLS.
   - Si es helper interno, revocar `EXECUTE` a `anon` y `authenticated`.
   - Usar `app_metadata.role = "admin"` como fuente de verdad.

3. Revisar policies que usan `user_metadata`.
   - La documentacion del proyecto define admin con:
     `app_metadata.role = "admin"`.
   - Evitar depender de `user_metadata.role` para privilegios admin.

4. Evitar bucket publico listable:
   - `formacion-archivos` puede seguir siendo publico si se necesitan URLs
     publicas.
   - No debe tener una policy amplia que permita listar todo el bucket.
   - Public object URL access no requiere permitir `SELECT` amplio sobre
     `storage.objects`.

5. Definir limite de tamano y MIME types para `formacion-archivos`.
   - MVP documentado: `pdf`, `docx`, `pptx`, `xlsx`, `jpg`, `png`, `mp4`.
   - Convertir esto a MIME types reales en el bucket.

6. Activar leaked password protection en Supabase Auth desde dashboard.

7. Evitar copiar usuarios y datos privados por defecto.
   - No replicar `auth.users`.
   - No replicar solicitudes, intentos o progreso con `user_id` real salvo que
     exista una razon explicita y datos anonimizados.

### Performance

1. Agregar indices para foreign keys sin cobertura:
   - `certification_requests.capacitacion_id`
   - `certification_requests.exam_attempt_id`
   - `documentos_kb.archivo_id`
   - `exam_attempts.capacitacion_id`
   - `exam_attempts.certificacion_id`
   - `exam_attempts.modulo_id`
   - `productos.id_categoria`
   - `progreso_recursos.capacitacion_id`
   - `progreso_recursos.modulo_id`
   - `progreso_recursos.recurso_id`
   - `user_progress.modulo_id`

2. Optimizar RLS con auth initplan:
   - Reemplazar `auth.uid()` por `(select auth.uid())`.
   - Reemplazar `auth.jwt()` por `(select auth.jwt())`.
   - Aplicar en `user_progress`, `exam_attempts`, `certification_requests` y
     `progreso_recursos`.

3. Consolidar policies permisivas duplicadas:
   - `archivos_fuente`
   - `capacitacion_modulos`
   - `capacitaciones`
   - `certificaciones`
   - `certification_requests`
   - `documentos_kb`
   - `exam_attempts`
   - `modulo_recursos`
   - `storage.objects`

4. Resolver indice duplicado:
   - `documentos_kb_embedding_idx`
   - `documentos_kb_embedding_idx1`
   - Mantener solo uno.

5. Revisar indice vectorial:
   - Mantener HNSW para busqueda semantica si `buscar_contexto_kb` lo usa.
   - No eliminar el indice marcado como unused sin validar uso real del chatbot.

## Estado objetivo para un Supabase nuevo

### Estructura esperada del repo

Crear y mantener:

```txt
supabase/
  config.toml
  migrations/
    0001_extensions.sql
    0002_schema.sql
    0003_functions.sql
    0004_rls_policies.sql
    0005_storage.sql
    0006_indexes.sql
    0007_seed_public_content.sql
  functions/
    chat/
      index.ts
    learning-feed/
      index.ts
```

El numero exacto de migrations puede cambiar, pero debe quedar versionado y
ordenado por dependencias.

### Datos a replicar

Replicar por defecto:

- Estructura de tablas, constraints, indexes, functions y policies.
- Buckets y policies de Storage.
- Edge Functions.
- Contenido publico/de negocio no sensible:
  - `capacitaciones`
  - `capacitacion_modulos`
  - `modulo_recursos` metadata
  - `certificaciones`
  - `archivos_fuente` metadata si no contiene datos privados
  - `documentos_kb` si el contenido es publico o autorizado para migrar
  - `categorias` y `productos`, si se cargan luego

No replicar por defecto:

- `auth.users`
- `certification_requests`
- `exam_attempts`
- `progreso_recursos`
- `user_progress`
- Tokens, passwords, anon keys, service-role keys, refresh tokens.

Si se necesita demo data para tablas de usuario, crear usuarios ficticios y datos
anonimizados en una migration/seed separada.

### Variables y secretos

Frontend `.env`:

```env
VITE_SUPABASE_URL=your_new_supabase_url
VITE_SUPABASE_KEY=your_new_supabase_anon_key
```

Admin/local:

```env
SUPABASE_URL=your_new_supabase_url
SUPABASE_PROJECT_REF=your_new_project_ref
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
DEMO_USER_PASSWORD=your_local_demo_password
DEMO_MANUAL_PDF=./Manual_tecnico_de_operaciones_de_riego.pdf
```

Edge Functions secrets:

```bash
supabase secrets set GROQ_API_KEY=your_groq_key
```

`learning-feed` requiere revisar y documentar:

```env
SUPABASE_URL=your_new_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
SUPABASE_ANON_KEY=your_new_supabase_anon_key
```

No commitear valores reales.

## Guia operativa paso a paso

Esta es la guia corta para ejecutar una replica o un nuevo deploy sin volver a
deducir el proceso desde cero.

### 0. Elegir escenario

Escenario recomendado:

- Crear un proyecto Supabase nuevo, aunque sea dentro de una cuenta existente.
- Aplicar migrations desde el repo.
- Cargar solo datos publicos/de negocio autorizados.
- Crear usuarios reales de nuevo en Supabase Auth.
- Conectar Vercel al repo GitHub y usar `main` como production branch.

Escenario con mas riesgo:

- Reusar un proyecto Supabase existente que ya tiene tablas/datos.
- Antes de aplicar migrations, hacer backup y revisar conflictos de nombres.
- No ejecutar `db push` sobre un proyecto con datos importantes sin `--dry-run`
  y revision manual.

### 1. Preparar el entorno local

Desde la carpeta `irridelta/`:

```bash
npm ci
npm run lint
npm run build
./node_modules/.bin/supabase --version
```

Crear o actualizar el archivo privado admin local:

```bash
cp .env.admin.example .env.admin.local
```

Completar `.env.admin.local` con valores reales del proyecto Supabase destino:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEMO_USER_PASSWORD=your_local_demo_password
DEMO_MANUAL_PDF=./Manual_tecnico_de_operaciones_de_riego.pdf
```

Completar `.env` solo con variables publicas del frontend:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_KEY=your_anon_or_publishable_key
```

Regla de seguridad: `.env`, `.env.admin.local`, PDFs locales y service-role keys
no se commitean.

### 2. Crear o seleccionar el proyecto Supabase destino

Para una cuenta nueva o una cuenta existente sin proyecto:

1. Entrar al dashboard de Supabase.
2. Crear un proyecto nuevo.
3. Elegir region.
4. Confirmar costo/plan antes de crearlo.
5. Guardar localmente:
   - Project ref.
   - Project URL.
   - Anon/publishable key.
   - Service-role key.

Para un proyecto Supabase existente:

1. Confirmar que ese proyecto es realmente el destino.
2. Revisar si ya tiene tablas en `public`.
3. Hacer backup antes de tocar schema:

```bash
./node_modules/.bin/supabase db dump --linked --file /tmp/irridelta-pre-migration.sql
```

Si el proyecto existente no esta linkeado todavia, linkear primero con el paso
siguiente.

### 3. Linkear la CLI al proyecto destino

Desde `irridelta/`:

```bash
./node_modules/.bin/supabase login
./node_modules/.bin/supabase link --project-ref <target_project_ref>
./node_modules/.bin/supabase migration list --linked
```

El repo actualmente tiene la migration base:

```txt
supabase/migrations/0001_irridelta_schema.sql
```

Esa migration crea tablas, indices, funciones SQL, RLS, policies y buckets de
Storage necesarios para el estado base de IRRIDELTA.

### 4. Aplicar migrations al destino

Primero simular:

```bash
./node_modules/.bin/supabase db push --linked --dry-run
```

Si el resultado es el esperado, aplicar:

```bash
./node_modules/.bin/supabase db push --linked
./node_modules/.bin/supabase migration list --linked
```

En un proyecto existente, si el `dry-run` muestra conflictos de objetos ya
existentes, frenar y resolver manualmente. No usar `migration repair` para
saltear errores salvo que se haya confirmado que el schema real ya coincide con
la migration.

### 5. Configurar secrets y Edge Functions

Configurar secrets propios de las funciones. Como minimo, el chatbot necesita:

```bash
./node_modules/.bin/supabase secrets set GROQ_API_KEY=your_groq_key --project-ref <target_project_ref>
```

Desplegar funciones desde el repo:

```bash
./node_modules/.bin/supabase functions deploy chat --project-ref <target_project_ref> --use-api
./node_modules/.bin/supabase functions deploy learning-feed --project-ref <target_project_ref> --use-api
```

Despues de desplegar, probar:

- `/functions/v1/chat`
- `/functions/v1/learning-feed`
- Logs de Edge Functions en Supabase.

Si `learning-feed` no se va a usar, quitar su consumo del frontend en lugar de
dejar una funcion local sin deploy remoto.

### 6. Storage y archivos

La migration crea los buckets:

- `formacion-archivos`
- `kb-files`

La migration no copia automaticamente objetos de Storage. Para replicar
contenido real:

1. Confirmar que esos PDFs/archivos se pueden migrar.
2. Descargar/exportar objetos desde el proyecto origen o fuente autorizada.
3. Subirlos al bucket destino manteniendo los paths que espera la base.
4. Verificar que los registros de `modulo_recursos`, `archivos_fuente` y
   `documentos_kb` apunten a paths existentes.

Para una demo local, `npm run seed:demo` usa `DEMO_MANUAL_PDF` desde
`.env.admin.local`, sube ese PDF y crea usuarios/datos demo. No ejecutarlo sobre
produccion real salvo que se quiera reemplazar datos demo.

### 7. Crear usuarios admin

Crear el usuario en Supabase Auth desde dashboard o flujo de registro.

Promoverlo a admin desde `irridelta/`:

```bash
npm run make-admin -- usuario@dominio.com
```

La fuente de verdad del rol admin es:

```txt
app_metadata.role = "admin"
```

### 8. Validar Supabase antes del deploy frontend

```bash
./node_modules/.bin/supabase db advisors --linked --type security
./node_modules/.bin/supabase db advisors --linked --type performance
npm run lint
npm run build
```

Tambien validar manualmente:

- Login con usuario cliente.
- Login con usuario admin.
- CRUD de productos/categorias.
- Admin capacitaciones.
- Admin certificaciones.
- Admin KB.
- Chatbot.
- Carga/lectura de recursos de capacitaciones.

## Deploy recomendado: Vercel + GitHub `main`

La opcion mas simple para este proyecto es conectar Vercel al repo GitHub y
dejar que cada merge a `main` genere un deploy de produccion.

Estado versionado en el repo:

- `irridelta/vercel.json` ya existe.
- Ese archivo tiene rewrite SPA a `/index.html`, necesario por `BrowserRouter`.

### 1. Preparar GitHub

1. Trabajar cambios en `develop` o en una feature branch.
2. Verificar localmente:

```bash
cd irridelta
npm run lint
npm run build
```

3. Abrir Pull Request hacia `main`.
4. Mergear a `main` cuando este validado.

Vercel debe tomar `main` como branch de produccion. Las demas ramas pueden
generar previews.

### 2. Crear el proyecto en Vercel

En Vercel dashboard:

1. `Add New Project`.
2. Importar el repo:
   `PF-ORGANIZATION/PROYECTO-FINAL-IRRIDELTA`.
3. Production branch: `main`.
4. Root directory: `irridelta`.
5. Framework preset: `Vite`.
6. Install command: `npm ci`.
7. Build command: `npm run build`.
8. Output directory: `dist`.
9. Node version: 22 o una version compatible con Vite 7.

### 3. Variables de entorno en Vercel

Configurar en Vercel solo variables publicas del frontend:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_KEY=your_anon_or_publishable_key
```

No configurar en Vercel:

```env
SUPABASE_SERVICE_ROLE_KEY=never_put_this_in_frontend_hosting
GROQ_API_KEY=belongs_in_supabase_edge_function_secrets
DEMO_USER_PASSWORD=local_only
```

Si se usan previews contra otro Supabase, definir variables distintas para
Preview. Si no, Production y Preview pueden apuntar al mismo proyecto, sabiendo
que las previews impactan el mismo backend.

### 4. Configurar Supabase Auth para el dominio Vercel

En Supabase Dashboard del proyecto destino:

1. Auth.
2. URL Configuration.
3. Site URL: dominio final de Vercel.
4. Redirect URLs:
   - Dominio final de Vercel.
   - `http://localhost:5173` para desarrollo.
   - URLs preview exactas si se van a probar flujos Auth en previews.

No agregar redirects de dominios que no controles.

### 5. Validar el deploy

Despues del primer deploy en Vercel:

1. Abrir `/`.
2. Abrir directo `/productos`.
3. Abrir directo `/login`.
4. Abrir directo `/capacitaciones`.
5. Abrir directo `/admin/capacitaciones`.
6. Confirmar que ninguna ruta da 404 al refrescar.
7. Probar login/logout.
8. Probar un usuario admin.
9. Probar chatbot.
10. Revisar logs de Vercel y Supabase.

### 6. Redeploy por cambios de codigo

Con Git integration:

1. Hacer cambios en una branch.
2. Correr `npm run lint` y `npm run build`.
3. Abrir PR hacia `main`.
4. Vercel genera preview para la branch/PR.
5. Validar preview.
6. Mergear a `main`.
7. Vercel despliega produccion automaticamente desde `main`.

Sin Git integration:

1. Correr `npm run lint` y `npm run build`.
2. Usar deploy manual desde dashboard o Vercel CLI.
3. Preferir la integracion GitHub para evitar deploys manuales fuera de
   historial.

## Alternativa si no se usa Vercel: Netlify

Vercel + GitHub `main` es el camino recomendado para este repo. Si se decide
usar Netlify, configurar:

- Base directory: `irridelta`
- Build command: `npm run build`
- Publish directory: `irridelta/dist` si el base directory queda en repo root, o
  `dist` si el base directory es `irridelta`.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`

Agregar `netlify.toml` si se quiere dejar la configuracion versionada:

```toml
[build]
  base = "irridelta"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Alternativa minima para Netlify: crear `public/_redirects` con:

```txt
/* /index.html 200
```

Usar una sola estrategia: `netlify.toml` o `_redirects`, no ambas salvo que haya
una razon puntual.

## Plan de ejecucion futuro

Cuando se pida ejecutar esta tarea, hacer esto en orden:

1. Relevamiento actual
   - Confirmar proyecto origen y proyecto destino.
   - Correr advisors de seguridad y performance.
   - Listar tablas, funciones, policies, indexes, buckets y Edge Functions.
   - Confirmar si `learning-feed` debe existir o si se debe quitar el uso.

2. Crear proyecto destino
   - Usar una cuenta/organizacion Supabase nueva.
   - Confirmar costo antes de crear el proyecto.
   - Elegir region.
   - Guardar project ref destino solo en notas locales seguras, no en docs
     publicos si no hace falta.

3. Generar migrations
   - Crear migrations desde el schema actual.
   - Incorporar fixes de seguridad y performance.
   - No generar migrations que contengan secretos.
   - No hardcodear IDs generados salvo que sean datos semilla estables y
     deliberados.

4. Aplicar migrations al destino
   - Simular con `./node_modules/.bin/supabase db push --linked --dry-run`.
   - Aplicar con `./node_modules/.bin/supabase db push --linked`.
   - Verificar que todas las tablas tengan RLS esperado.
   - Verificar advisors despues de aplicar.

5. Configurar Storage
   - Crear buckets.
   - Aplicar limites y MIME allowlists.
   - Aplicar policies corregidas.
   - Subir objetos solo si se confirmo que los archivos pueden migrarse.

6. Deploy de Edge Functions
   - Deploy `chat` con `verify_jwt = true`.
   - Deploy `learning-feed` si el frontend lo necesita.
   - Configurar secrets.
   - Probar CORS, JWT y respuestas basicas.

7. Seed de datos
   - Migrar contenido publico/de negocio autorizado.
   - Evitar datos privados de usuarios.
   - Si se migra KB, validar que embeddings y dimensiones coincidan con el
     modelo usado por el frontend.

8. Actualizar frontend
   - Actualizar `.env` local con el proyecto destino.
   - Validar `npm run build`.
   - Elegir proveedor de deploy si corresponde: Vercel o Netlify.
   - Configurar variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` en el
     proveedor elegido.
   - Agregar fallback SPA (`vercel.json`, `netlify.toml` o `_redirects`) si las
     rutas internas no resuelven al refrescar.
   - Validar flujos:
     - Productos/categorias
     - Login
     - Admin capacitaciones
     - Admin certificaciones
     - Admin KB
     - Chatbot
     - Certificaciones cliente

9. Auditoria final
   - `./node_modules/.bin/supabase db advisors --linked --type security`
   - `./node_modules/.bin/supabase db advisors --linked --type performance`
   - Logs API/Auth/Storage/Edge Function
   - Verificar que no haya 404 para funciones esperadas.
   - Documentar cualquier warning aceptado con razon.

## Prompt recomendado para pedir la ejecucion

```txt
Usa docs/SUPABASE_REPLICATION_PLAN.md como guia. Quiero replicar el proyecto
Supabase actual de IRRIDELTA en una nueva cuenta/proyecto, generando migrations
versionadas y corrigiendo los advisors de seguridad/performance listados.

No copies secretos ni datos privados. Confirmame primero proyecto origen,
organizacion destino, region y costos si hay que crear un proyecto. Luego
prepara/aplica migrations, configura storage, despliega Edge Functions, migra
solo datos publicos/de negocio autorizados, actualiza .env local y valida build
y flujos principales.
```

## Criterios de terminado

La tarea se considera terminada cuando:

- El proyecto destino esta `ACTIVE_HEALTHY`.
- Las migrations estan en el repo y aplicadas al destino.
- `chat` funciona y `learning-feed` esta desplegada o removida del flujo.
- Buckets y policies no permiten listados amplios innecesarios.
- `is_admin` no queda expuesta como RPC peligrosa.
- Advisors de seguridad quedan sin warnings criticos o con excepciones
  documentadas.
- Advisors de performance quedan corregidos o con excepciones documentadas.
- `npm run build` pasa apuntando al proyecto destino.
- El deploy en Vercel/Netlify carga rutas publicas y deep links sin 404.
- Supabase Auth tiene configuradas las redirect URLs del dominio deployado.
- La documentacion indica que datos fueron migrados y cuales quedaron fuera.
