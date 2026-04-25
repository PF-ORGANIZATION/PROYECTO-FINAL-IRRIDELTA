# Security Notes

This document captures project safety rules without exposing sensitive values.

## Secrets

Never commit or document:

- `.env`
- `.env.admin.local`
- Supabase anon keys
- Supabase service-role keys
- Auth tokens
- Real passwords
- Private user data

Use example placeholders in documentation:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Supabase Access

Frontend code must only use the public anon key through `src/supabaseClient.js`.

Service-role keys must only be used in local/admin scripts or secure backend environments. They must not be imported into browser code.

## Row Level Security

Frontend route protection is not enough. Supabase RLS policies should enforce:

- Who can read data.
- Who can create data.
- Who can update data.
- Who can delete data.
- Who can upload/delete files in Storage.

## Admin Role

The app expects admin users to have:

```txt
app_metadata.role = "admin"
```

Avoid duplicating hardcoded admin emails in frontend code.

## AI Assistant Safety

When asking AI assistants for help:

- Share code files, not secret files.
- Describe env variable names, not values.
- Redact screenshots if they show tokens, keys, emails, URLs that should stay private, or credentials.
- Ask the assistant to avoid printing `.env` contents.
- Keep database setup docs generic unless the values are safe to share.
