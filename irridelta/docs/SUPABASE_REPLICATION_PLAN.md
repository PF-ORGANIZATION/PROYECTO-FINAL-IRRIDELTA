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
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
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

## Plan de deploy frontend simple

El frontend es una SPA React + Vite con `BrowserRouter`. El deploy mas simple es
usar Vercel o Netlify conectado al repo Git, con build estatico desde
`irridelta/`.

### Precondiciones

- El proyecto Supabase destino ya debe estar creado y saludable.
- Las migrations, buckets, policies y Edge Functions deben estar aplicadas al
  Supabase destino.
- `npm run build` debe pasar localmente apuntando al Supabase destino.
- No subir `.env`, `.env.admin.local` ni service-role keys al proveedor de
  hosting.
- Usar Node 22 o una version compatible con Vite 7.

### Variables para Vercel o Netlify

Configurar solo variables publicas del frontend:

```env
VITE_SUPABASE_URL=your_new_supabase_url
VITE_SUPABASE_KEY=your_new_supabase_anon_key
```

No configurar en Vercel/Netlify:

```env
SUPABASE_SERVICE_ROLE_KEY=never_put_this_in_frontend_hosting
GROQ_API_KEY=belongs_in_supabase_edge_function_secrets
```

Nota: las variables `VITE_*` quedan embebidas en el bundle del navegador. La anon
key de Supabase esta pensada para eso, siempre que RLS y policies esten bien.

### Opcion A: Vercel

Configuracion en dashboard:

- Framework preset: `Vite`
- Root directory: `irridelta`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`

Agregar `vercel.json` solo si Vercel no resuelve correctamente rutas internas de
la SPA:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Validar despues del deploy:

- Abrir `/`.
- Abrir directo `/productos`.
- Abrir directo `/login`.
- Abrir directo una ruta protegida como `/capacitaciones` y confirmar redirect o
  pantalla esperada.
- Confirmar que llamadas a Supabase responden contra el proyecto destino.

### Opcion B: Netlify

Configuracion en dashboard:

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

### Configuracion Supabase para dominio deployado

En Supabase Auth del proyecto destino:

- Site URL: dominio final de Vercel/Netlify.
- Additional Redirect URLs:
  - dominio final
  - dominio preview si se van a usar previews
  - `http://localhost:5173` para desarrollo local

Revisar tambien CORS de Edge Functions si alguna funcion valida origin
manualmente.

### Checklist post-deploy

1. Cargar home y rutas publicas.
2. Probar login, logout y refresh de sesion.
3. Probar deep links con refresh del navegador:
   - `/productos`
   - `/capacitaciones`
   - `/admin/capacitaciones`
   - `/certificaciones/:certificationId`
4. Probar lectura de productos/categorias aunque esten vacios.
5. Probar chatbot y confirmar que llama a Supabase destino.
6. Probar admin KB solo con usuario admin.
7. Confirmar que no hay errores CORS ni 404 de SPA fallback.
8. Confirmar que no se expuso ninguna service-role key en variables del hosting.
9. Revisar logs de Supabase API/Auth/Edge Function despues de navegar la app.

### Prompt recomendado para pedir el deploy

```txt
Usa docs/SUPABASE_REPLICATION_PLAN.md. Quiero hacer deploy del frontend de
IRRIDELTA en Vercel o Netlify de la forma mas simple. Confirma primero el
proveedor, dominio esperado y proyecto Supabase destino. Luego configura el
build desde irridelta/, agrega el fallback SPA si hace falta, define solo
VITE_SUPABASE_URL y VITE_SUPABASE_KEY en el hosting, actualiza Supabase Auth
redirect URLs y valida rutas publicas, rutas protegidas, login y chatbot.
```

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
   - Aplicar DDL con `apply_migration`.
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
   - `get_advisors security`
   - `get_advisors performance`
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
