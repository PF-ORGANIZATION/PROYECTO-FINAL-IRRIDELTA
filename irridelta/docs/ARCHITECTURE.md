# Architecture

This is a high-level overview of the app structure. It intentionally avoids secrets and environment-specific values.

## Frontend Shape

The app is a React + Vite SPA. Routing is defined in `src/App.jsx`.

Main route groups:

- Public routes: home, products, about, branches, contact.
- Auth route: login.
- Client routes: capacitaciones, certificaciones, certification exam.
- Admin routes: products, capacitaciones, certificaciones.

Navigation note:

- The desktop and mobile navbar groups admin links inside one `Admin` dropdown rather than rendering three separate top-level admin links.

## State And Data Access

- Session state lives in `src/store/sessionStore.js`.
- Auth helpers live in `src/hooks/useAuth.js`.
- Role helpers live in `src/utils/authRoles.js`.
- Product and category data access is handled through `src/context/ProductContext.jsx`.
- Learning and certification data access is centralized in `src/services/learningContentService.js`.

## Supabase Client

`src/supabaseClient.js` creates the browser Supabase client from Vite environment variables.

Keep this file generic. Do not hardcode project URLs, anon keys, service-role keys, or user credentials.

## Admin Panels

Product admin:

- Uses product and category context.
- UI pieces are under `src/admin/`.

Learning admin:

- `src/pages/AdminCapacitacionesList.jsx` owns the admin list, search, and delete experience for capacitaciones.
- `src/pages/AdminCapacitacionEditor.jsx` loads one capacitacion, or an empty form, and renders `AdminLearningManager`.
- `src/components/AdminLearningManager.jsx` owns the capacitaciones editor UI, section layout, save actions, preview access, and assessment modals.
- `src/components/ModuleCard.jsx` encapsulates one module card with content and test summary.
- `src/components/AssessmentEditor.jsx`, `AssessmentModal.jsx`, and `AssessmentSummaryCard.jsx` support module and final evaluation editing.
- `src/components/UnsavedChangesModal.jsx` handles the editor warning before leaving with unsaved changes.
- `src/pages/AdminCertificaciones.jsx` owns final certification form state.

## Client Learning Views

- `src/pages/Capacitaciones.jsx` renders the learning catalog for trainings.
- `src/components/LearningCatalog.jsx` displays capacitaciones, modules, and resources.
- `src/components/LearningItemPreviewCard.jsx` is the shared presentational card for capacitacion content.
- `src/pages/Certificaciones.jsx` lists final certifications for published capacitaciones only.
- `src/pages/CertificationExam.jsx` handles the exam experience.

## Design Tradeoffs

The current learning-content implementation favors simple frontend orchestration for MVP speed. The main tradeoff is that saving modules and resources requires multiple Supabase calls.

Future production hardening should consider:

- Extracting large admin form sections into smaller components.
- Moving multi-table writes into Supabase RPCs for stronger consistency.
- Adding better upload error recovery.
- Adding pagination or lazy loading if content volume grows.

Current admin UX choices worth preserving unless intentionally redesigned:

- Capacitaciones require at least one module.
- The last remaining module cannot be removed from the form.
- Modules can be collapsed independently to reduce scrolling in long forms.
- New module creation collapses previous modules automatically.
- Module cards expose completion state and explain why a module is still pending.
- Module tests and the final evaluation are edited in dedicated modals instead of inline.
- Admin preview uses a modal instead of route navigation so editors keep their place in the panel.
- The editor warns before leaving when there are unsaved changes.
- Capacitaciones and certifications shown to client users are filtered by `publicada = true`.
