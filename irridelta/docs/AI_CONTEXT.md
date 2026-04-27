# AI Context

This document gives AI assistants and new contributors a safe, high-level map of the project.

Do not include secrets here. Never paste values from `.env`, Supabase keys, service-role keys, real credentials, or private user data into documentation, prompts, commits, or issues.

## Project Summary

IRRIDELTA is a React + Vite single-page app for a business website with:

- Public pages for home, products, about, branches, and contact.
- Supabase-backed product and category management.
- Supabase Auth-based login.
- Role-based routes for clients and admins.
- Learning content for clients: capacitaciones and certificaciones.
- Admin panels for products, capacitaciones, and certificaciones.

## Stack

- React 18
- Vite
- Tailwind CSS
- React Router
- Zustand for session state
- Supabase JS client
- ESLint

## Important Paths

- `src/App.jsx`: main routing and protected route logic.
- `src/supabaseClient.js`: Supabase browser client using Vite env variables.
- `src/store/sessionStore.js`: current user/session/role state.
- `src/utils/authRoles.js`: app role detection from Supabase Auth metadata.
- `src/components/Navbar.jsx`: main navigation, including the admin dropdown menu.
- `src/context/ProductContext.jsx`: product/category CRUD logic.
- `src/services/learningContentService.js`: learning content, modules, resources, files, and certification persistence.
- `src/components/AdminLearningManager.jsx`: shared admin editor UI for capacitaciones.
- `src/components/LearningCatalog.jsx`: client-facing capacitaciones catalog.
- `src/components/LearningItemPreviewCard.jsx`: shared training preview card used by the public catalog and admin preview modal.
- `src/pages/AdminCapacitacionesList.jsx`: admin list/search/delete view for capacitaciones.
- `src/pages/AdminCapacitacionEditor.jsx`: admin create/edit page for one capacitacion.
- `src/pages/AdminCertificaciones.jsx`: admin UI for final certifications.
- `src/pages/CertificationExam.jsx`: client certification exam flow.

## Auth And Roles

The app treats authenticated users as `cliente` by default.

Admins are detected through Supabase Auth user metadata:

```txt
app_metadata.role = "admin"
```

The frontend role check only controls navigation and UI access. Supabase Row Level Security policies must still enforce real database permissions.

## Learning Domain

Current learning model:

- A `capacitacion` is the parent training item.
- A capacitacion has one or more `capacitacion_modulos`.
- Each module can contain multiple `modulo_recursos`.
- Resources can be files or YouTube links.
- A `certificacion` is one final evaluation associated with a capacitacion.

Business rules:

- A capacitacion must have at least one module.
- Modules are created manually.
- Files and YouTube links can be mixed in the same module.
- Each module has one required test in the current admin flow.
- Each capacitacion has one required final evaluation.
- A capacitacion can be saved as draft or marked as published.
- Public client views only show published capacitaciones and their final certifications.
- Allowed MVP file extensions: `pdf`, `docx`, `pptx`, `xlsx`, `jpg`, `png`, `mp4`.
- No resource reuse is implemented.
- No upload progress is implemented.
- Certificate PDF generation is not implemented.

## Current Implementation Notes

The capacitaciones admin flow currently saves the parent training item and then replaces the module/resource rows for that training item. This is simple and acceptable for MVP scale.

Current admin UX choices:

- Capacitaciones are managed from a dedicated list route and edited on a separate editor route.
- The editor is split into `Datos generales`, `Modulos`, and `Evaluacion final`.
- The admin learning form keeps at least one module in the UI at all times. The last module cannot be removed, and the save flow also validates that a capacitacion has at least one titled module.
- Modules can be collapsed individually to reduce scroll while editing long capacitaciones.
- Module tests and the final evaluation are edited in large modals rather than inline.
- Admins can preview a capacitacion inside the editor through a modal. That preview reuses the same shared presentation component as the public learning catalog to keep both views visually aligned.
- The editor warns about unsaved changes before leaving the page and on browser refresh or close.
- Admin navigation is grouped under a single `Admin` dropdown in the top navbar instead of three separate top-level links.

If this grows, consider moving multi-step database writes into a Supabase RPC or Postgres function so the database changes can be transactional. Storage uploads still need careful cleanup and rollback behavior because object storage and database writes are not one atomic operation.

## Safety Rules For Future AI Work

- Do not read, print, summarize, or commit `.env` values.
- Do not expose Supabase anon keys, service-role keys, auth tokens, emails, or real credentials.
- Do not commit `.env`, `.env.admin.local`, or generated secrets.
- Keep RLS and Storage policies versioned when possible so the database setup is reproducible.
- Prefer small, focused changes and verify with targeted lint and build commands.
- Do not change certification logic unless the task explicitly asks for it.
- When editing learning content, preserve the relationship between capacitaciones, modules, resources, and final certifications.
