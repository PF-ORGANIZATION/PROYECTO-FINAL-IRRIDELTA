# Database Notes

This document describes the expected Supabase schema at a high level. It does not include project URLs, keys, credentials, or private data.

## Auth

The app uses Supabase Auth.

Application roles are derived from auth metadata:

```txt
app_metadata.role = "admin"
```

Any authenticated user without the admin metadata is treated as a client by the frontend.

## Products

Expected product tables:

- `categorias`
- `productos`

Expected relationship:

- `productos.id_categoria` references `categorias.id`.

## Learning Content

Expected learning tables:

- `capacitaciones`
- `capacitacion_modulos`
- `modulo_recursos`
- `certificaciones`
- `certification_requests`

Expected relationships:

- `capacitacion_modulos.capacitacion_id` references `capacitaciones.id`.
- `modulo_recursos.modulo_id` references `capacitacion_modulos.id`.
- `certificaciones.capacitacion_id` references `capacitaciones.id`.
- `certification_requests.certification_id` references `certificaciones.id`.
- `certification_requests.capacitacion_id` references `capacitaciones.id`.

## Capacitaciones

Suggested important columns:

- `id`
- `titulo`
- `descripcion`
- `publicada`
- `created_at`
- `updated_at`

Business rule:

- A capacitacion should have at least one module.
- Client-facing capacitaciones are filtered by `publicada = true`.
- The admin UI can save incomplete drafts, but published capacitaciones should have complete general data, modules, module tests, and final certification.

## Capacitacion Modulos

Suggested important columns:

- `id`
- `capacitacion_id`
- `titulo`
- `descripcion`
- `orden`
- `preguntas`
- `cantidad_preguntas_a_mostrar`
- `porcentaje_aprobacion`
- `duracion_maxima_minutos`
- `created_at`

Business rules:

- Modules are created manually.
- A capacitacion can have one or more modules.
- `orden` controls display order.
- Each module has one required test stored on the module row.
- `cantidad_preguntas_a_mostrar` must be between 1 and the number of loaded module questions.
- `porcentaje_aprobacion` must be between 1 and 100.
- `duracion_maxima_minutos` must be between 1 and the frontend `MAX_DURATION_MINUTES` value.

## Modulo Recursos

Suggested important columns:

- `id`
- `modulo_id`
- `tipo`
- `titulo`
- `orden`
- `youtube_url`
- `archivo_url`
- `archivo_path`
- `archivo_nombre`
- `extension`
- `created_at`

Business rules:

- `tipo` identifies whether a resource is a file or YouTube link.
- A module can mix file and YouTube resources.
- Allowed MVP file extensions: `pdf`, `docx`, `pptx`, `xlsx`, `jpg`, `png`, `mp4`.

## Certificaciones

Suggested important columns:

- `id`
- `capacitacion_id`
- `titulo`
- `descripcion`
- `preguntas`
- `cantidad_preguntas_examen`
- `porcentaje_aprobacion`
- `duracion_maxima_minutos`
- `created_at`

Business rule:

- A certification is one final evaluation associated with a capacitacion.
- For capacitaciones, there should be one final certification per `capacitacion_id`.
- `cantidad_preguntas_examen` controls how many questions the client receives when taking the final exam.
- `cantidad_preguntas_examen` must be between 1 and the number of loaded final certification questions.
- Public client certification listings should only include certifications whose parent capacitacion is published.

## Certification Requests

This table supports the certification approval flow after a client passes the final exam.

Suggested important columns:

- `id`
- `certification_id`
- `capacitacion_id`
- `certification_title`
- `capacitacion_title`
- `requester_name`
- `user_id`
- `status`
- `rejection_reason`
- `exam_percentage`
- `exam_approved_at`
- `requested_at`
- `reviewed_at`

Business rules:

- `status` is one of `pending`, `approved`, or `rejected`.
- The client can request a certificate only after passing the final exam in the frontend flow.
- The request only asks for `requester_name` in the current MVP.
- Admins approve or reject requests inside the Admin Certificaciones panel.
- Rejected requests should include `rejection_reason` so the client can correct the name and submit again.
- Approved requests can generate certificate downloads as PNG and PDF from the browser.
- Email delivery is intentionally not implemented yet.

Suggested SQL shape:

```sql
create table public.certification_requests (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certificaciones(id) on delete cascade,
  capacitacion_id uuid references public.capacitaciones(id) on delete cascade,
  certification_title text not null,
  capacitacion_title text,
  requester_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  exam_percentage numeric,
  exam_approved_at timestamptz,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz
);
```

## Storage

Learning files are expected to live in a Supabase Storage bucket.

The code uses a bucket name constant in `learningContentService.js`. Keep bucket policies aligned with Row Level Security rules.

## RLS Expectations

Recommended policy shape:

- Authenticated clients can read published learning content.
- Admin users can create, update, and delete learning content.
- Storage policies should allow admins to upload/delete learning files.
- Storage policies should allow authenticated users to read learning files when appropriate.

Keep SQL policies versioned when possible so a new environment can be reproduced.
