# Learning Modules

This document explains the capacitaciones feature for future contributors and AI assistants.

## Goal

Capacitaciones support multiple manually created modules. Each module can contain multiple resources, including mixed files and YouTube links.

Certificaciones remain separate: one final evaluation can be associated with a capacitacion.

## User Experience

Admin users can:

- Create a capacitacion with title and description.
- Add one or more modules.
- Keep working with one mandatory module minimum in the form.
- Add a title and optional description to each module.
- Upload multiple files per module.
- Add multiple YouTube links per module.
- Mix files and YouTube links in the same module.
- Remove selected files before saving.
- Remove existing resources while editing.
- Collapse or expand each module independently without losing unsaved form data.
- Preview a capacitacion inside the admin panel without leaving the current page.

Client users can:

- View capacitaciones.
- See modules in order.
- Open file resources.
- Open YouTube resources.

## Data Flow

Admin form state is built in `src/components/AdminLearningManager.jsx`.

Persistence is handled in `src/services/learningContentService.js`.

High-level save flow:

1. Validate capacitacion title.
2. Validate at least one module.
3. Validate module titles.
4. Validate allowed file extensions.
5. Save the parent capacitacion row.
6. Replace module/resource rows for that capacitacion.
7. Upload new files to Supabase Storage.
8. Insert module resource rows with file or YouTube metadata.

## Resource Types

Current resource types:

- `archivo`
- `youtube`

The value is stored in `modulo_recursos.tipo`.

## Allowed File Types

MVP file extensions:

- `pdf`
- `docx`
- `pptx`
- `xlsx`
- `jpg`
- `png`
- `mp4`

These are defined in `learningContentService.js` and reused by the admin UI.

## Known Tradeoffs

The current implementation replaces module/resource rows during edits. This keeps the code simpler, but it is not ideal for high-volume production usage.

The admin preview modal intentionally reuses the same shared preview card as the public catalog. This reduces duplicated markup and helps keep admin preview and client-facing output visually consistent.

Module collapse state is UI-only. It is not persisted to the database and resets when the admin form is rebuilt.

Potential future improvements:

- Use a database RPC for transactional multi-table writes.
- Add upload progress.
- Add file size limits.
- Add better rollback/cleanup for partial upload failures.
- Split `AdminLearningManager` into smaller components.
- Add resource ordering controls in the UI.
- Add pagination or lazy loading if content volume grows.

## Do Not Do Unless Requested

- Do not implement resource reuse.
- Do not generate PDF certificates automatically.
- Do not change certification exam logic unless the task explicitly requires it.
- Do not expose environment values or Supabase secrets in docs or code.
