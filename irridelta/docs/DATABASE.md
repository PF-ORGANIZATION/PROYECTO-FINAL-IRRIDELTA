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

Expected relationships:

- `capacitacion_modulos.capacitacion_id` references `capacitaciones.id`.
- `modulo_recursos.modulo_id` references `capacitacion_modulos.id`.
- `certificaciones.capacitacion_id` references `capacitaciones.id`.

## Capacitaciones

Suggested important columns:

- `id`
- `titulo`
- `descripcion`
- `created_at`
- `updated_at`

Business rule:

- A capacitacion should have at least one module.

## Capacitacion Modulos

Suggested important columns:

- `id`
- `capacitacion_id`
- `titulo`
- `descripcion`
- `orden`
- `created_at`

Business rules:

- Modules are created manually.
- A capacitacion can have one or more modules.
- `orden` controls display order.

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
- `porcentaje_aprobacion`
- `duracion_maxima_minutos`
- `created_at`

Business rule:

- A certification is one final evaluation associated with a capacitacion.

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
