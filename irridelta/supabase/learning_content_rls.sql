-- RLS policies for the learning-content schema.
-- Run this in Supabase SQL Editor after creating the tables.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.role() = 'authenticated';
$$;

alter table public.capacitaciones enable row level security;
alter table public.capacitacion_modulos enable row level security;
alter table public.modulo_recursos enable row level security;
alter table public.certificaciones enable row level security;

drop policy if exists "Authenticated users can read capacitaciones" on public.capacitaciones;
create policy "Authenticated users can read capacitaciones"
on public.capacitaciones
for select
to authenticated
using (public.is_authenticated());

drop policy if exists "Admins can manage capacitaciones" on public.capacitaciones;
create policy "Admins can manage capacitaciones"
on public.capacitaciones
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read capacitacion_modulos" on public.capacitacion_modulos;
create policy "Authenticated users can read capacitacion_modulos"
on public.capacitacion_modulos
for select
to authenticated
using (public.is_authenticated());

drop policy if exists "Admins can manage capacitacion_modulos" on public.capacitacion_modulos;
create policy "Admins can manage capacitacion_modulos"
on public.capacitacion_modulos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read modulo_recursos" on public.modulo_recursos;
create policy "Authenticated users can read modulo_recursos"
on public.modulo_recursos
for select
to authenticated
using (public.is_authenticated());

drop policy if exists "Admins can manage modulo_recursos" on public.modulo_recursos;
create policy "Admins can manage modulo_recursos"
on public.modulo_recursos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read certificaciones" on public.certificaciones;
create policy "Authenticated users can read certificaciones"
on public.certificaciones
for select
to authenticated
using (public.is_authenticated());

drop policy if exists "Admins can manage certificaciones" on public.certificaciones;
create policy "Admins can manage certificaciones"
on public.certificaciones
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
