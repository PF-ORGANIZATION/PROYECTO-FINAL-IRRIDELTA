# Architecture

This is a high-level overview of the app structure. It intentionally avoids secrets and environment-specific values.

## Frontend Shape

The app is a React + Vite SPA. Routing is defined in `src/App.jsx`.

Main route groups:

- Public routes: home, products, about, branches, contact.
- Auth route: login.
- Client routes: capacitaciones, certificaciones, certification exam.
- Admin routes: products, capacitaciones, certificaciones.

## State And Data Access

- Session state lives in `src/store/sessionStore.js`.
- Auth helpers live in `src/hooks/useAuth.js`.
- Role helpers live in `src/utils/authRoles.js`.
- Product/category data access is handled through `src/context/ProductContext.jsx`.
- Learning/certification data access is centralized in `src/services/learningContentService.js`.

## Supabase Client

`src/supabaseClient.js` creates the browser Supabase client from Vite environment variables.

Keep this file generic. Do not hardcode project URLs, anon keys, service-role keys, or user credentials.

## Admin Panels

Product admin:

- Uses product/category context.
- UI pieces are under `src/admin/`.

Learning admin:

- `src/pages/AdminCapacitaciones.jsx` renders `AdminLearningManager`.
- `src/components/AdminLearningManager.jsx` owns the capacitaciones form state and module/resource UI.
- `src/pages/AdminCertificaciones.jsx` owns final certification form state.

## Client Learning Views

- `src/pages/Capacitaciones.jsx` renders the learning catalog for trainings.
- `src/components/LearningCatalog.jsx` displays capacitaciones, modules, and resources.
- `src/pages/Certificaciones.jsx` lists final certifications.
- `src/pages/CertificationExam.jsx` handles the exam experience.

## Design Tradeoffs

The current learning-content implementation favors simple frontend orchestration for MVP speed. The main tradeoff is that saving modules/resources requires multiple Supabase calls.

Future production hardening should consider:

- Extracting large admin form sections into smaller components.
- Moving multi-table writes into Supabase RPCs for stronger consistency.
- Adding better upload error recovery.
- Adding pagination or lazy loading if content volume grows.
